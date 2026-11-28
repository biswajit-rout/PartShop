# Technical Architecture

## Frontend

Develop a modern responsive frontend using:

- Next.js (React)
- TypeScript
- Tailwind CSS
- ShadCN UI Components
- React Query / TanStack Query
- Axios for API communication

---

## Backend

Develop Backend APIs using:

- Python 3.12\+
- FastAPI
- SQLAlchemy ORM
- Alembic for database migrations
- Pydantic for request/response validation
- JWT Authentication
- Role\-Based Access Control (RBAC)

The backend should expose REST APIs and be designed using modular architecture.

Modules:

- Authentication Module
- Inventory Module
- Billing Module
- Supplier Module
- Mechanic Module
- Reporting Module
- Transaction Module
- Dashboard Module

---

## Database

Use PostgreSQL as the primary database.

Expected tables:

### Users

- id
- username
- password\_hash
- role
- created\_at

### SpareParts

- id
- item\_name
- brand\_name
- part\_number
- model\_number
- compatible\_bikes
- quantity
- rack\_number
- purchase\_price
- selling\_price
- customer\_discount
- mechanic\_discount
- supplier\_id
- barcode
- qr\_code
- is\_confirmed (boolean, default true for existing items, indexed)
- is_deleted (boolean, default false, indexed)
- deleted_at (timestamptz, nullable)
- created\_at

---

## Inventory Confirmation, Soft Deletion & Supplier Valuation Lifecycle

### 1. Three-Stage Catalog Architecture
- **🟢 Confirmed Items Sub-Tab**:
  - Contains validated spare parts with verified rack/shelf locations and pricing.
  - Active and searchable on the POS billing counter, top header search, and dedicated search views.
  - Supports Goods Inward / Restock, single-item editing, and soft deletion to Recycle Bin.
- **🟡 Unconfirmed / Staging Queue Sub-Tab**:
  - Automatically receives all new items imported via bulk Excel (.xlsx) uploads (`is_confirmed = False`).
  - Visibly badged as `🟡 Unconfirmed`.
  - **POS & Restock Lock**: Completely locked from billing checkout (backend rejects with `HTTP 400`, frontend search and barcode scanner reject with error toast). Restock action is hidden in UI and rejected by backend (`HTTP 400`).
  - **Search Lock**: Unconfirmed items are hidden from header search and the dedicated search page to prevent selling unverified inventory.
  - Highlights missing rack numbers (`⚠️ Missing Rack`) to prompt warehouse location assignment.
  - Supports single-row confirmation, single-row delete, multi-select batch confirmation, and multi-select batch deletion.
- **🔴 Deleted Items / Recycle Bin Sub-Tab**:
  - Displays all soft-deleted parts (`is_deleted = True`, `deleted_at != null`).
  - Excluded from active catalog and sales.
  - Features single-row Restore and multi-select floating action bar for bulk restoration (`POST /api/v1/parts/restore-batch`).

### 2. Multi-Select & Batch Operations
- Checkbox on every unconfirmed and deleted table row + master checkbox to select/deselect all visible items.
- Floating multi-selection action bar displaying selected item count with:
  - Unconfirmed queue: `Delete Selected (X)` and `Confirm Selected (X) & Move to Catalog`.
  - Recycle bin: `Restore Selected (X)`.
- Single-item confirmation with optional inline rack location assignment modal.

### 3. Supplier Stock Valuation & Daily Inward Filter
- In the **Suppliers** tab, clicking **"View Items"** on any distributor displays:
  - **Entry Date Filter**: Dropdown grouping parts by inward date with item counts (e.g. `2026-11-28 (15 items)`) and an `All Entry Dates` option.
  - **Daily Inward KPI Banner**: 4 summary metric cards computing real-time valuation for the selected date:
    1. Filtered SKUs count
    2. Total Units Inward (sum of quantities)
    3. Stock Cost Valuation (₹ purchase price × quantity)
    4. Retail Valuation (₹ MRP / selling price × quantity)
  - **Parts Table**: Includes a dedicated `Entry Date` column showing formatted timestamp for daily reconciliation.

### Suppliers

- id
- name
- contact_person
- phone
- email
- address
- gst_number
- default_discount_percentage
- is_active
- created_at
- updated_at

### Mechanics

- id
- mechanic\_name
- mobile
- garage\_name
- commission\_percentage

### Purchases

- id
- supplier\_id
- invoice\_number
- purchase\_date
- total\_amount

### PurchaseItems

- id
- purchase\_id
- spare\_part\_id
- quantity
- purchase\_price

### Sales

- id
- invoice\_number
- customer\_name
- mechanic\_id
- subtotal
- discount
- tax
- total\_amount
- payment\_type
- created\_at

### SaleItems

- id
- sale\_id
- spare\_part\_id
- quantity
- rate
- discount

### DailyTransactions

- id
- transaction\_date
- total\_sales
- total\_purchases
- total\_expenses
- profit

### StockMovements

- id
- spare\_part\_id
- movement\_type
- quantity
- reference\_type
- reference\_id
- created\_at

---

## Excel Import & Export

Implement:

### Inventory Import

Upload Excel files (.xlsx)

Columns:

- Item Name
- Brand
- Part Number
- Model Number
- Compatible Bike Models
- Quantity
- Rack Number
- Purchase Price
- Selling Price
- Customer Discount
- Mechanic Discount
- Supplier Name

Validation should be performed before import.

---

### Inventory Export

Export inventory to:

- Excel (.xlsx)
- CSV
- PDF

---

## Reporting Engine

Generate:

### Inventory Reports

- Current Stock
- Low Stock
- Out of Stock
- Dead Stock

### Sales Reports

- Daily Sales
- Monthly Sales
- Annual Sales

### Brand Reports

- HERO
- HONDA
- TVS
- ROLLON
- Local Brands

### Mechanic Commission Reports

- Daily Commission
- Monthly Commission
- Pending Commission

Exports:

- PDF
- Excel

---

---

## Wholesale Suppliers & Purchase Discount Mapping

Manage multi-brand wholesale distributor partnerships, supplier-provided purchase discount rates, and catalog item linkage.

### Supplier Attributes
- `id`: Integer primary key
- `name`: Wholesaler or distributorship business name (unique index)
- `contact_person`: Primary contact person
- `phone`: Mobile / contact phone number
- `email`: Supplier billing email address
- `address`: Warehouse or shop location
- `gst_number`: GSTIN compliance registration number
- `default_discount_percentage`: Default wholesale purchase discount percentage provided to the shop (e.g. 14.50%, 18.00%)
- `is_active`: Operational status flag
- `created_at` / `updated_at`: Audit timestamps

### Item Mapping & Purchase Discount Mechanics
- **Multi-Brand Supplier Discount Matrix**: Wholesalers supplying multiple brands (e.g. Hero, Honda, Bajaj, TVS) can have custom, brand-specific wholesale purchase discounts configured (e.g. Sri Ganesh Spares: Hero 22%, Honda 18%, Bajaj 25%, TVS 20%). A default rate serves as fallback for unconfigured brands.
- **Brand & Supplier Separation**: Different brands can be purchased from different suppliers (e.g., *Honda Genuine Spares* from *Kalyani Honda Distributorship* at 14.5% discount; *Bajaj* and *Endurance* from *Om Sai Auto Spares* at 18% discount).
- **Concurrency-Safe Atomic Bulk Import**: When uploading an Excel catalog (.xlsx) or receiving a shipment, the engine deterministically checks each item's brand against the supplier's discount matrix in lock-free memory, auto-populates `supplier_discount`, and computes purchase acquisition cost ($\text{MRP} \times (1 - \text{Discount} / 100)$) inside an atomic transaction (`BEGIN ... COMMIT`).
- **Brand-Wise Customer Selling Discounts at POS Counter**: Brands define default retail customer discounts (e.g. Hero Genuine 5%, generic aftermarket 10%, lubricants 0%). When cashier scans or adds an item to a bill, the line-item discount automatically populates from the brand rate (or mechanic rate if assigned), preventing manual entry delays.
- **Two-Sub-Tab POS Billing Architecture**:
  1. **New Bill / POS Counter**: Fast barcode/manual counter billing, customer attribution, mechanic referral commission calculation, real-time 18% GST calculation, row-level locking atomic checkout, and instant stock deduction.
  2. **Invoices History & Bill Modification**: Store staff can switch to the Invoices History tab to view all past invoices with chronological sorting, live search filtering (by invoice number, customer name, customer phone), view and reprint thermal receipts, and modify bill header fields (customer name, customer phone, payment channel) directly to fix clerical typos without disrupting immutable stock audit ledgers.
- **Manual Item Creation / Editing**: Inventory creation and edit modals allow selecting the supplier and specifying the exact purchase discount rate.
- **Supplier Directory & Supplied Parts View**: In the Suppliers view, each supplier displays their live mapped item count and brand discount badges. Cashiers can open any supplier to inspect all parts provided by that supplier (OEM SKU, description, brand, compatible bikes, purchase discount %, purchase price, selling price, and stock quantity).
- **Inventory Cross-Filtering**: The main inventory table displays the supplier name and discount percentage for every item, and includes a live Supplier filter dropdown alongside Brand and Stock Status.

---

## Dedicated Quick Spares Search Tab & Card-Based Lookup

A focused, dedicated search terminal tab (`Search`) optimized for counter staff to find parts in under 1 second.

### Functional Requirements
- **Minimalist Hero Search Interface**: The search tab features a clean, prominent search bar as the primary focal point with automatic cursor focus and keyboard shortcuts (`Ctrl+K`).
- **Popular Preset Chips**: Quick search shortcut chips for common workshop inquiries (e.g. "Bajaj Pulsar Air filter", "Activa Brake Pad", "Splendor Clutch Plate", "Chain Sprocket", "Bosch Spark Plug").
- **Automotive Domain Synonym & Token Expansion**: Supports multi-token unstructured search matching across:
  - Part Name (with synonyms: filter/filt, brake/pad/shoe, clutch/clt, shock/cushion)
  - Vehicle / Bike Compatibility (e.g. Pulsar 150, Activa 6G, Splendor Plus)
  - OEM SKU / Part Number
  - Manufacturer / Brand
  - Supplier Name
  - Barcode & Rack Bin Locator
- **Card-Based Anatomy**: Every matched item is displayed as a comprehensive information card containing:
  - **Item Name**: Full description and part title.
  - **Price & Selling Price**: Prominent counter retail price (`MRP`) and purchase cost.
  - **Supported Model**: Explicit list of compatible motorcycle models.
  - **Supplier Details**: Wholesale supplier/distributor name and purchase discount percentage badge.
  - **Quantity**: Real-time units on hand and color-coded stock availability status (`In Stock`, `Low Stock`, `Out of Stock`).
  - **Rack No**: Physical shop bin / shelf locator (e.g. `Rack: B-04`).
  - **One-Click Actions**: Quick copy button for part numbers and "Bill Item" shortcut to seamlessly transition the selected part into a new counter sales invoice.

---

## Wireless Mobile Barcode Scanner & Real-Time Goods Inward Restock

Enables counter staff and store managers to use any smartphone camera as a wireless handheld barcode terminal via WebSocket communication, eliminating the need for dedicated Bluetooth laser scanner hardware.

### Functional Requirements
- **Dynamic QR Code Pairing**: Desktop displays a unique session pairing QR code encoding the local network IP URL (`http://<LAN_IP>:3000/scan?sid=<session_id>`). Scanning with a phone pairs the devices instantly.
- **Persistent Connection Lifecycle**: WebSocket connection is decoupled from desktop modal visibility and managed at the root application context (`ScannerProvider`). Closing the pairing dialog keeps the WebSocket connection open in the background, allowing warehouse staff to continue scanning uninterrupted.
- **Global Header Connection Beacon**: Real-time status badge in the top navigation header (`GlassHeader`) displaying active mobile scanner presence and total connected device count.
- **Multi-Device Support & Connected Roster**: Multiple warehouse staff members can pair with the same terminal session simultaneously. Each smartphone registers a unique `device_id` and friendly name (`iPhone`, `Galaxy S23`, etc.), displayed in a live desktop roster with real-time scan count telemetry.
- **Bi-Directional WebSocket Bridge**: Real-time message exchange between desktop and mobile devices via `/api/v1/scanner/ws/{session_id}` with ping/pong keepalive and room-wide `ROSTER_UPDATED` broadcasts.
- **Four Core Operational Workflows**:
  1. **Quick Part Search**: Scanning a barcode on a warehouse shelf instantly displays the matched spare part card on the desktop terminal with price, bike fitment, quantity, supplier discount, and rack locator.
  2. **Automatic Barcode Assignment**: While creating a new part or editing an existing part missing a barcode, clicking *"Scan with Phone"* listens for a mobile scan and auto-populates the barcode field.
  3. **Fast Goods Inward (Restock)**: Scanning an existing item opens a sleek confirmation dialog to enter incoming shipment quantities, adjust purchase cost, verify shelf bin, and increment stock with an automated `StockMovement` audit ledger entry.
  4. **Wireless POS Billing**: In the Billing/Checkout view, scanning items with a smartphone instantly appends them to the active customer bill or increments quantity on the cashier's screen without touching the keyboard.
- **2D Automotive QR Code & Barcode Engine**: Supports linear barcodes (EAN-13, UPC, Code-128) and 2D QR codes with exact matching, alphanumeric punctuation normalization (e.g. `01721-K0L-D00` vs `01721K0LD00`), delimited token parsing (e.g. `P/N:01721K0LD00;QTY:1`), and manufacturer verification URL decoding.
- **Continuous Scanning Mode**: Session and camera remain persistently active across multiple boxes with 1.8s anti-spam debounce, allowing staff to walk down entire rack aisles scanning dozens of parts in sequence without reloading pages.
- **Zero-SSL Camera Compatibility**: Full HTML5 native hardware camera capture fallback (`capture="environment"`) supporting 100% of mobile devices over local HTTP without SSL certificates or HTTPS restrictions.
- **Audio & Haptic Feedback**: Mobile phone emits an audio beep and 100ms vibration confirmation upon barcode detection. Includes manual input fallback for damaged labels.

---

## Item Brands Master Management

Manage genuine and aftermarket manufacturer brands:

### Brand Attributes
- `id`
- `name` (e.g. Hero, Bajaj, TVS, Honda, Yamaha, Bosch, Endurance, Castrol, Minda)
- `code` (e.g. HERO, BAJ, BOSCH)
- `description`
- `created_at`
- `updated_at`

### Features
- Register new manufacturer/item brands.
- Update brand details and codes.
- Dynamic brand assignment in spare parts catalog and Excel bulk import.
- Brand-specific commission calculation for mechanics.

---

## Mechanic Partners & Brand Commission Matrix

Enterprise garage and mechanic partner commission tracking:

### Mechanic Attributes
- `id`
- `name`
- `phone` (unique)
- `garage_name`
- `address`
- `default_commission_percentage` (fallback percentage, e.g. 5%)
- `is_active`

### Brand Commission Overrides
- Specific percentage per mechanic and per brand (`mechanic_brand_commissions` table).
- Example: Mechanic "Ramesh Auto Care" receives:
  - Hero: 8.0%
  - Bajaj: 10.0%
  - Endurance: 12.0%
  - All other brands: 5.0% (Default)

### Mechanic Date-Wise Item Ledger & Sales Audit
- Open any mechanic's details to see complete history of items taken or sold through the shop.
- Date-wise itemized view:
  - Sale Date & Time
  - Invoice Number
  - Part Name & OEM SKU
  - Brand
  - Quantity Taken
  - Unit Price & Line Total
  - Commission Percentage Applied
  - Commission Payout Amount (₹)
  - Customer & Vehicle Reference
- Summary Performance KPIs:
  - Total Parts Taken (units)
  - Total Billing Volume (₹)
  - Total Commission Earned (₹)
- Date range filtering (All time, Today, Last 7 Days, Last 30 Days, Custom Range).

---

## Part Update & Stock Adjustment

- Full CRUD capability on spare parts catalog.
- Edit part name, OEM part number, model number, brand, bike models, selling price, purchase price, stock quantity, min stock alert, rack location, and barcode.
- Automated `StockMovement` audit tracking when quantity is adjusted manually.

---

## Billing System

Features:

- Invoice Generation
- Thermal Printer Support
- A4 Invoice Download
- PDF Invoice Download
- GST Ready Structure (18% integrated)
- Barcode-Based Billing
- **Bike Model Search Autocomplete**: Cashier can type bike model name (e.g. 'Pulsar 150', 'Splendor Plus', 'Activa 6G') to instantly find and add compatible parts to the bill.
- **Mechanic Partner Attribution**: Assign a mechanic at checkout; system automatically calculates line-item commission based on each item's brand rate and credits the mechanic.

When a bill is generated:

1. Create invoice.
2. Deduct stock automatically with row-level locks (`with_for_update()`).
3. Create immutable stock movement entry (`SALE_OUT`).
4. Calculate mechanic commission per brand if mechanic is assigned.
5. Record line-item commission percentages and payouts.
6. Update daily transaction ledger.

---

## Search Engine & Automotive Abbreviation Stems

Implement a tokenized, multi-attribute, fault-tolerant search engine capable of handling real-world motorcycle workshop queries.

### Multi-Token Matching Logic
- Automatically tokenize queries by whitespace (e.g. `"Bajaj pulsar Air filter"` -> `["bajaj", "pulsar", "air", "filter"]`).
- Cross-column evaluation: Terms in the query can match across separate fields (e.g., `"Bajaj Pulsar"` matches `compatible_bikes`, while `"Air Filter"` matches `item_name`).
- Boolean AND join across tokens: Every word typed by the user must find a match across at least one catalog attribute.

### Automotive Catalog Abbreviations & Synonyms
In Indian motorcycle parts catalogs, parts are often entered using standard OEM abbreviations. The engine automatically expands terms to industry synonyms:
- `filter` / `filters` ↔ `filt` (e.g. `KIT ELEMENT AIR FILT/81`)
- `brake` / `brakes` ↔ `brk`, `pad`, `pads`, `shoe`, `shoes`
- `shock` / `cushion` ↔ `cush`, `absorber`, `damper` (e.g. `CUSHION ASSY L FR-10`, `CUSH ASSYRR`)
- `clutch` ↔ `clt`
- `bearing` ↔ `brg`
- `cable` ↔ `cbl`
- `chain` ↔ `chn`
- `spark` / `plug` ↔ `spk`
- `element` ↔ `elem`, `elt`
- `assembly` ↔ `assy`, `asy`
- `lever` ↔ `lvr`
- `indicator` ↔ `ind`, `winker`
- `headlight` / `headlamp` ↔ `hl`
- `mirror` ↔ `mrr`, `rearview`

### Search Fields Evaluated
- Item Name (`item_name`)
- OEM Part Number (`part_number`)
- Model Number (`model_number`)
- Compatible Bike Models (`compatible_bikes`)
- Brand Name (`brand_name`)
- Barcode (`barcode`)
- Rack Number (`rack_number`)

### UI Search Integration
- Instant `< 5ms` client-side evaluation over loaded catalog.
- Backend API parameter `q` supporting identical tokenized logic and synonym expansions.
- Integrated into Global Header (Ctrl+K), Inventory View, and Billing View Autocomplete.

---

## Dashboard

Provide real\-time KPI cards:

- Total Inventory Value
- Total Products
- Today's Sales
- Monthly Sales
- Low Stock Items
- Out of Stock Items
- Pending Mechanic Commission

Provide charts:

- Sales Trend
- Inventory Trend
- Top Selling Products
- Top Selling Brands

---

## File Storage

Store:

- Product Images
- Invoices
- Excel Imports
- Reports

Use:

- Local Storage initially
- S3\-compatible architecture for future cloud migration

---

## Security

Implement:

- JWT Authentication
- Password Hashing (bcrypt)
- Refresh Tokens
- Audit Logs
- Role Permissions
- Login Activity Tracking

---

## Future Mobile App Integration

The backend must be API\-first.

Future Android/iOS mobile app should support:

### QR/Barcode Scan

After scanning:

- Fetch item details from API
- Show rack location
- Show inventory availability
- Show compatible bike models
- Show selling price

Create APIs that can be directly consumed by Flutter or React Native mobile applications.

---

## Shop Expenditure & Daily Profit Management

Enables the store owner and counter managers to track daily operating overheads and calculate net take-home profit:

### Features & Functional Requirements
- **Overhead Categorization**: Pre-configured categories (`Rent`, `Electricity`, `Tea & Refreshments`, `Salary / Wages`, `Maintenance`, `Transport / Courier`, `Stationery / Tools`, `Miscellaneous`).
- **Payment Method Tracking**: Records whether overhead was disbursed via `Cash`, `UPI` (GPay / PhonePe), `Bank Transfer / NEFT`, or `Card`.
- **Daily Net Profit Calculation**: Automatically reconciles gross daily sales revenue against daily operating expenses:
  $$\text{Net Daily Profit} = \text{Total Counter Sales} - \text{Total Daily Expenses}$$
- **Audit & Removal**: Role-gated controls allowing Store Managers and Admins to correct or delete erroneous expense vouchers.

---

## Global Header Instant Search & Autocomplete

Provides rapid spare part discovery directly from the persistent top navigation header:
- **Instant Dropdown Overlay**: Typing into the global search bar opens an overlay list showing the top matching parts.
- **Part Details Preview**: Displays part name, genuine/aftermarket brand badge, OEM part number, compatible motorcycle models, retail selling price (₹), available stock count, and physical shelf bin locator.
- **One-Click Navigation**: Selecting a matched part routes to the detailed search card or counter billing view.

---

## Session Authentication & User Logout

Enables cashiers and store managers to securely terminate their session:
- **Accessible Logout Controls**: Dedicated "Log Out" button with red accenting positioned in both the global top header and the left navigation sidebar.
- **Token Invalidation**: Clears stored JWT credentials from local storage and redirects immediately to the login view.

---

## Invoice Management, Cancellation & Historical Audit

Enables cashiers and store owners to review past bills, filter by date ranges, and cancel/void invoices when customers return parts:

### 1. Invoices History & Date Range Filtering
- **Temporal Filter Presets**: Quick-filtering presets ("All Time", "Today", "This Week", "This Month", "Custom Range") with datetime picker controls.
- **Status Filtering**: Multi-state filtering between `All Invoices`, `🟢 Active (Completed)`, and `🔴 Voided / Returned`.
- **Search Capabilities**: Free-text filtering across invoice numbers, customer names, phone numbers, and mechanic names.

### 2. Invoice Cancellation / Void Lifecycle (Customer Returns)
- **Pessimistic Row Locking**: Uses `with_for_update()` to prevent race conditions during inventory reversal.
- **Automatic Stock Restoration**: When an invoice is cancelled/voided, all purchased items are atomically incremented back into available inventory.
- **Stock Movement Audit Trail**: Creates immutable `RETURN_IN` stock movements referencing `SALE_VOID` with the cancellation audit reason.
- **Exclusion from Financial Summaries**: Voided invoices are excluded from Today's Sales, Daily Net Profit, Top Selling Parts, and Mechanic Commission reports.
- **Invoice Re-print Void Banner**: Voided receipts clearly stamp "VOIDED / RETURNED" watermark to prevent fraudulent physical returns.

### 3. Invoice Line-Item Editing & Stock Differential Adjustments
- **Line Item Modification**: Allows cashiers to adjust quantities of items on existing completed invoices, add newly purchased parts, or remove returned/erroneous items.
- **Atomic Inventory Synchronization**:
  - Quantity reductions or item removals automatically increment available stock and log `RETURN_IN` (`reference_type="SALE_EDIT"`).
  - Quantity increases or new items check physical stock availability, decrement inventory, and log `SALE_OUT` (`reference_type="SALE_EDIT"`).
- **Financial & Tax Recalculation**: Subtotal, line discounts, 18% GST tax liability, grand total, and mechanic referral commissions are recalculated dynamically.
- **Safety Invariants**: Invoices must contain at least 1 item; completely emptied bills prompt cashiers to use the Return / Void workflow. Voided bills strictly reject edits.

---

## Deployment

Provide:

- Docker Configuration
- Docker Compose
- Production Environment Variables
- Nginx Reverse Proxy Configuration

Deployment Target:

- Ubuntu Server
- VPS Hosting
- AWS EC2
- Azure VM

---

## Coding Standards

- Clean Architecture
- Repository Pattern
- Service Layer Pattern
- API Versioning
- OpenAPI Documentation
- Unit Tests
- Scalable Folder Structure

The generated solution should be production\-ready, scalable, and suitable for managing a motorcycle spare parts retail business with inventory, billing, mechanics commissions, stock control, reporting, and future mobile application integration.

