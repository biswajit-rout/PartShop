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
- created\_at

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
- **Brand & Supplier Separation**: Different brands can be purchased from different suppliers (e.g., *Honda Genuine Spares* from *Kalyani Honda Distributorship* at 14.5% discount; *Bajaj* and *Endurance* from *Om Sai Auto Spares* at 18% discount).
- **Excel Spreadsheet Import under Supplier**: Cashiers or store managers can select a specific supplier when uploading an Excel workbook (.xlsx). The engine automatically tags every imported part with `supplier_id`, `supplier_name`, and computes the purchase cost based on the supplier's wholesale discount rate (or spreadsheet line-item discount).
- **Manual Item Creation / Editing**: Inventory creation and edit modals allow selecting the supplier and specifying the exact purchase discount rate.
- **Supplier Directory & Supplied Parts View**: In the Suppliers view, each supplier displays their live mapped item count. Cashiers can open any supplier to inspect all parts provided by that supplier (OEM SKU, description, brand, compatible bikes, purchase discount %, purchase price, selling price, and stock quantity).
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

