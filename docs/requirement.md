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
- supplier\_name
- contact\_name
- mobile
- address
- gst\_number

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

