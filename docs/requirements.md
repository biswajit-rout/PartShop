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

## Billing System

Features:

- Invoice Generation
- Thermal Printer Support
- A4 Invoice Download
- PDF Invoice Download
- GST Ready Structure
- Barcode\-Based Billing

When a bill is generated:

1. Create invoice.
2. Deduct stock automatically.
3. Create stock movement entry.
4. Update daily transaction ledger.
5. Calculate mechanic commission if applicable.

---

## Search Engine

Implement a fast search system with indexing.

Search fields:

- Part Number
- Model Number
- Item Name
- Brand Name
- Bike Model
- Barcode
- Rack Number

Search results should appear instantly with:

- Available Quantity
- Rack Location
- Selling Price
- Compatible Bike Models

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

