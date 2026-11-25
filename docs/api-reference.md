# PartShop — REST API Reference Specification

> **Document Purpose**: Complete HTTP API specifications, request/response contracts, validation rules, and authentication schemas.  
> **Source of Truth**: Active Codebase (`d:/Programming/PartShop`)  
> **Governance**: Maintained according to rules established in `AGENTS.md`.  
> **Last Updated**: 2026-11-23  

---

## 1. Global API Standards

- **Base URL**: `http://localhost:8001/api/v1` (Docker Development) / `https://api.yourdomain.com/api/v1` (Production)
- **Interactive Documentation**:
  - Swagger UI: `http://localhost:8001/docs`
  - ReDoc: `http://localhost:8001/redoc`
- **Data Format**: `application/json` (UTF-8)
- **Authentication Scheme**: HTTP Bearer Token (`Authorization: Bearer <JWT_TOKEN>`)

---

## 2. Authentication & User Endpoints (`/api/v1/auth`)

### 2.1 Register User
Creates a new staff member or administrator account.

- **Method**: `POST`
- **Route**: `/api/v1/auth/register`
- **Authentication**: Public (Initial setup) / Requires `ADMIN` in production
- **Request Body (`UserCreate`)**:
  ```json
  {
    "username": "cashier1",
    "email": "cashier1@partshop.com",
    "full_name": "Arun Sharma",
    "password": "Password123!",
    "role": "COUNTER_STAFF"
  }
  ```
- **Validation Rules**:
  - `username`: 3-50 alphanumeric characters. Unique in system.
  - `email`: Valid RFC email format. Unique in system.
  - `password`: Minimum 8 characters.
  - `role`: One of `ADMIN`, `STORE_MANAGER`, `COUNTER_STAFF`.
- **Response (`201 Created`)**:
  ```json
  {
    "id": 1,
    "username": "cashier1",
    "email": "cashier1@partshop.com",
    "full_name": "Arun Sharma",
    "role": "COUNTER_STAFF",
    "is_active": true,
    "created_at": "2026-11-23T16:00:00Z"
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: Username or Email already exists.
  - `422 Unprocessable Entity`: Validation failure on input types.

---

### 2.2 Login & Issue Token
Authenticates cashier credentials and returns an encrypted JSON Web Token.

- **Method**: `POST`
- **Route**: `/api/v1/auth/login`
- **Authentication**: Public
- **Request Body (`LoginRequest` or form-data)**:
  ```json
  {
    "username": "cashier1",
    "password": "Password123!"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in_minutes": 1440
  }
  ```
- **Error Codes**:
  - `401 Unauthorized`: Invalid username or password.
  - `403 Forbidden`: User account is deactivated (`is_active = false`).

---

### 2.3 Get Current Logged-in User Profile
Returns the profile details of the currently authenticated cashier or manager.

- **Method**: `GET`
- **Route**: `/api/v1/auth/me`
- **Authentication**: `Bearer <JWT_TOKEN>`
- **Response (`200 OK`)**:
  ```json
  {
    "id": 1,
    "username": "cashier1",
    "email": "cashier1@partshop.com",
    "full_name": "Arun Sharma",
    "role": "COUNTER_STAFF",
    "is_active": true,
    "created_at": "2026-11-23T16:00:00Z"
  }
  ```
- **Error Codes**:
  - `401 Unauthorized`: Missing, expired, or tampered token.

---

## 3. Spare Parts & Inventory Endpoints (`/api/v1/parts`)

### 3.1 Create Spare Part
Adds a new item to the shop inventory with pricing and barcode.

- **Method**: `POST`
- **Route**: `/api/v1/parts/`
- **Authentication**: `Bearer <JWT_TOKEN>` (Role: `ADMIN`, `STORE_MANAGER`)
- **Request Body (`SparePartCreate`)**:
  ```json
  {
    "item_name": "Front Disc Brake Pad",
    "brand_name": "Bosch",
    "part_number": "BP-4029-FR",
    "model_number": "Pulsar 220 / Apache RTR",
    "compatible_bikes": "Bajaj Pulsar 220, TVS Apache RTR 160/180",
    "quantity": 25,
    "min_stock_alert": 5,
    "rack_number": "Rack-B3",
    "purchase_price": 280.00,
    "selling_price": 450.00,
    "customer_discount": 5.00,
    "mechanic_discount": 12.00,
    "barcode": "8901234567890"
  }
  ```
- **Response (`201 Created`)**: Full `SparePartResponse` object.
- **Error Codes**:
  - `400 Bad Request`: Part number or Barcode already exists.
  - `403 Forbidden`: Insufficient role permissions.

---

### 3.2 Search & List Spare Parts
Fast paginated catalog search by item name, part number, compatible motorcycle model, brand, or barcode. Uses an intelligent tokenized search engine with automotive abbreviations/synonym expansion (`filter`/`filt`, `brake`/`brk`/`pad`/`shoe`, `cushion`/`shock`/`damper`, `clutch`/`clt`, etc.).

- **Method**: `GET`
- **Route**: `/api/v1/parts/` or `/api/v1/parts`
- **Authentication**: `Bearer <JWT_TOKEN>`
- **Query Parameters**:
  - `q` (string, optional): Multi-token search query across all part attributes (e.g., `"Bajaj pulsar Air filter"`, `"Activa brake"`, `"Splendor clutch"`). Splits into whitespace-separated tokens and requires all tokens to be satisfied across any part field with synonym expansion.
  - `brand` (string, optional): Filter by brand (e.g. `Hero`, `Bajaj`, `Honda`).
  - `low_stock_only` (boolean, optional, default: `false`): Filter items where `quantity <= min_stock_alert`.
  - `skip` (integer, default: `0`): Pagination offset.
  - `limit` (integer, default: `50`, max: `500`): Page size.
- **Response (`200 OK`)**:
  ```json
  {
    "total": 2,
    "skip": 0,
    "limit": 50,
    "items": [
      {
        "id": 65,
        "item_name": "KIT ELEMENT AIR FILT/81",
        "brand_name": "OEM Genuine",
        "part_number": "36DK0015",
        "model_number": null,
        "compatible_bikes": "Bajaj Pulsar 150",
        "quantity": 1,
        "min_stock_alert": 5,
        "rack_number": null,
        "purchase_price": "430.11",
        "selling_price": "531.00",
        "customer_discount": "0.00",
        "mechanic_discount": "0.00",
        "barcode": null,
        "created_at": "2026-11-25T20:10:43.158105Z",
        "updated_at": "2026-11-25T20:10:43.158116Z"
      }
    ]
  }
  ```

---

### 3.3 Quick Barcode Gun Scanner Lookup
Instant `< 5ms` query by barcode scanned at POS counter.

- **Method**: `GET`
- **Route**: `/api/v1/parts/barcode/{barcode}`
- **Authentication**: `Bearer <JWT_TOKEN>`
- **Response (`200 OK`)**: Single `SparePartResponse` object.
- **Error Codes**:
  - `404 Not Found`: No item matching scanned barcode.

---

### 3.4 Update Spare Part Details & Stock Pricing
Updates existing spare part attributes, price tiers, physical stock level, rack location, or barcode. Manual quantity adjustments automatically record an immutable `ADJUSTMENT` entry in the `stock_movements` ledger.

- **Method**: `PUT`
- **Route**: `/api/v1/parts/{part_id}`
- **Authentication**: `Bearer <JWT_TOKEN>` (Role: `ADMIN`, `STORE_MANAGER`, `COUNTER_STAFF`)
- **Request Body (`SparePartUpdate`)**:
  ```json
  {
    "item_name": "Front Disc Brake Pad (Updated)",
    "selling_price": "475.00",
    "quantity": 25,
    "rack_number": "Rack-A3"
  }
  ```
- **Response (`200 OK`)**: Updated `SparePartResponse` object.

---

## 4. POS Counter Billing & Invoices (`/api/v1/billing`)

### 4.1 Process Counter Checkout
Executes an atomic checkout transaction: validates physical stock under row-level database locks (`SELECT ... FOR UPDATE`), decrements available inventory, logs immutable entries to the `stock_movements` audit ledger, computes line discounts and 18% GST tax, and issues a final sales invoice.

- **Method**: `POST`
- **Route**: `/api/v1/billing/checkout`
- **Authentication**: `Bearer <JWT_TOKEN>` (Any authenticated cashier or manager)
- **Request Body (`CheckoutRequest`)**:
  ```json
  {
    "customer_name": "Ramesh Kumar",
    "customer_phone": "9876543210",
    "payment_method": "CASH",
    "items": [
      {
        "spare_part_id": 1,
        "quantity": 2,
        "discount_percent": "5.00"
      }
    ]
  }
  ```
- **Validation Rules**:
  - `items`: Must contain at least 1 item (`HTTP 400` if empty).
  - `quantity`: Must be greater than 0.
  - `discount_percent`: Optional percentage discount per line item (default: `0.00`).
  - `payment_method`: One of `CASH`, `CARD`, `UPI`, `CREDIT`.
- **Response (`201 Created`)**:
  ```json
  {
    "id": 1,
    "invoice_number": "INV-20261125-142500-842",
    "customer_name": "Ramesh Kumar",
    "customer_phone": "9876543210",
    "cashier_id": 1,
    "subtotal": "900.00",
    "discount_amount": "45.00",
    "tax_amount": "153.90",
    "grand_total": "1008.90",
    "payment_method": "CASH",
    "created_at": "2026-11-25T14:25:00Z",
    "items": [
      {
        "id": 1,
        "spare_part_id": 1,
        "quantity": 2,
        "unit_price": "450.00",
        "discount_percent": "5.00",
        "total_price": "855.00"
      }
    ]
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: Cart is empty, quantity <= 0, or insufficient stock available for a requested part.
  - `404 Not Found`: Spare part ID does not exist.
  - `401 Unauthorized`: Missing or invalid cashier JWT token.

---

### 4.2 Get Invoice Receipt by ID
Fetches complete invoice details, tax breakdown, and all line items for display or physical thermal receipt printing.

- **Method**: `GET`
- **Route**: `/api/v1/billing/invoices/{invoice_id}`
- **Authentication**: `Bearer <JWT_TOKEN>`
- **Path Parameters**:
  - `invoice_id` (integer, required): Unique identifier of the invoice.
- **Response (`200 OK`)**: Same schema as `InvoiceResponse`.
- **Error Codes**:
  - `404 Not Found`: Invoice not found.
  - `401 Unauthorized`: Missing or invalid JWT token.

---

## 5. Excel Bulk Imports (`/api/v1/imports`)

### 5.1 Bulk Import Spare Parts Catalog
Uploads an Excel (`.xlsx`) catalog file, validates rows, detects and skips duplicates, and bulk-inserts parts into PostgreSQL with audit ledger tracking.

- **Method**: `POST`
- **Route**: `/api/v1/imports/parts-excel`
- **Authentication**: `Bearer <JWT_TOKEN>` (Role: `ADMIN`, `STORE_MANAGER`)
- **Content-Type**: `multipart/form-data`
- **Form Parameters**:
  - `file`: Excel file (`.xlsx`) containing spare parts data.
- **Header Columns Expected in Excel**:
  - Required: `item_name`, `brand_name` (or `brand`), `part_number`, `purchase_price`, `selling_price`
  - Optional: `model_number`, `compatible_bikes`, `quantity`, `min_stock_alert`, `rack_number`, `customer_discount`, `mechanic_discount`, `barcode`
- **Response (`200 OK`)**:
  ```json
  {
    "filename": "bajaj_pulsar_catalog_nov2026.xlsx",
    "total_rows_processed": 150,
    "imported_count": 148,
    "skipped_count": 2,
    "errors": [
      {
        "row_number": 45,
        "part_number": "BP-201-FR",
        "reason": "Part number 'BP-201-FR' already exists in database or spreadsheet."
      },
      {
        "row_number": 82,
        "part_number": null,
        "reason": "item_name, brand_name, and part_number cannot be empty."
      }
    ]
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: File is not a valid `.xlsx` workbook or required columns are missing from row 1.
  - `403 Forbidden`: Insufficient role permissions (requires `ADMIN` or `STORE_MANAGER`).
  - `401 Unauthorized`: Missing or invalid JWT token.

---

## 6. Business Reports & Analytics (`/api/v1/reports`)

### 6.1 Daily Sales Settlement Report
Retrieves aggregated daily revenue, discount totals, GST tax liability, and settlement breakdowns across cash, UPI, cards, and customer credit.

- **Method**: `GET`
- **Route**: `/api/v1/reports/daily-sales`
- **Authentication**: `Bearer <JWT_TOKEN>` (Role: `ADMIN`, `STORE_MANAGER`)
- **Query Parameters**:
  - `target_date` (string, optional, format: `YYYY-MM-DD`, default: today): Date for the reconciliation report.
- **Response (`200 OK`)**:
  ```json
  {
    "report_date": "2026-11-25",
    "total_invoices": 42,
    "total_subtotal": "38450.00",
    "total_discount": "1200.00",
    "total_tax": "6705.00",
    "grand_total": "43955.00",
    "payments_breakdown": [
      {
        "payment_method": "CASH",
        "count": 24,
        "total_amount": "21500.00"
      },
      {
        "payment_method": "UPI",
        "count": 16,
        "total_amount": "19455.00"
      },
      {
        "payment_method": "CARD",
        "count": 2,
        "total_amount": "3000.00"
      }
    ]
  }
  ```
- **Error Codes**:
  - `403 Forbidden`: Insufficient role permissions.
  - `401 Unauthorized`: Missing or invalid JWT token.

---

### 6.2 Top-Selling High-Velocity Parts
Identifies top-performing parts ranked by total units sold and revenue generated.

- **Method**: `GET`
- **Route**: `/api/v1/reports/top-selling`
- **Authentication**: `Bearer <JWT_TOKEN>` (Role: `ADMIN`, `STORE_MANAGER`, `COUNTER_STAFF`)
- **Query Parameters**:
  - `limit` (integer, optional, default: `10`, range: `1-50`): Maximum number of top parts to return.
- **Response (`200 OK`)**:
  ```json
  [
    {
      "spare_part_id": 12,
      "item_name": "Motul 7100 4T 10W-50 1L Engine Oil",
      "part_number": "OIL-MOT-7100",
      "brand_name": "Motul",
      "units_sold": 64,
      "total_revenue": "54400.00"
    },
    {
      "spare_part_id": 5,
      "item_name": "Front Brake Pad Set",
      "part_number": "BP-4029-FR",
      "brand_name": "Bosch",
      "units_sold": 38,
      "total_revenue": "17100.00"
    }
  ]
  ```

---

### 6.3 Low-Stock Warning List
Retrieves all spare parts whose stock on hand has dropped to or below their configured minimum threshold (`quantity <= min_stock_alert`).

- **Method**: `GET`
- **Route**: `/api/v1/reports/low-stock`
- **Authentication**: `Bearer <JWT_TOKEN>` (Role: `ADMIN`, `STORE_MANAGER`, `COUNTER_STAFF`)
- **Response (`200 OK`)**:
  ```json
  [
    {
      "id": 18,
      "item_name": "Spark Plug CPR8EA-9",
      "brand_name": "NGK",
      "part_number": "SP-NGK-CPR8",
      "rack_number": "Rack-A2",
      "quantity": 2,
---

## 7. Item Brands Master API (`/api/v1/brands`)

### 7.1 List All Brands
Retrieves all active spare part brands/manufacturers.

- **Method**: `GET`
- **Route**: `/api/v1/brands`
- **Authentication**: `Bearer <JWT_TOKEN>`
- **Response (`200 OK`)**:
  ```json
  [
    {
      "id": 1,
      "name": "Hero",
      "code": "HERO",
      "description": "Hero MotoCorp OEM & Genuine Spares",
      "created_at": "2026-11-25T19:27:37Z",
      "updated_at": "2026-11-25T19:27:37Z"
    }
  ]
  ```

### 7.2 Create New Brand
Registers a new brand/manufacturer.

- **Method**: `POST`
- **Route**: `/api/v1/brands`
- **Authentication**: `Bearer <JWT_TOKEN>`
- **Request Body (`BrandCreate`)**:
  ```json
  {
    "name": "Brembo",
    "code": "BREM",
    "description": "High Performance Brake Systems"
  }
  ```
- **Response (`201 Created`)**: `BrandResponse` object.

---

## 8. Mechanics & Commission Matrix API (`/api/v1/mechanics`)

### 8.1 List All Mechanics
Retrieves all mechanic partners with their default commission and brand-specific override matrix.

- **Method**: `GET`
- **Route**: `/api/v1/mechanics`
- **Authentication**: `Bearer <JWT_TOKEN>`
- **Query Parameters**:
  - `active_only` (optional, boolean): Filter only active mechanics.
- **Response (`200 OK`)**:
  ```json
  [
    {
      "id": 1,
      "name": "Ramesh Sharma",
      "phone": "+91 98765 43210",
      "garage_name": "Ramesh Auto Care",
      "address": "Shop 4, Main Market, Station Road",
      "default_commission_percentage": "5.00",
      "is_active": true,
      "created_at": "2026-11-25T19:27:37Z",
      "updated_at": "2026-11-25T19:27:37Z",
      "brand_commissions": [
        {
          "id": 1,
          "mechanic_id": 1,
          "brand_id": 1,
          "brand_name": "Hero",
          "commission_percentage": "8.00"
        },
        {
          "id": 2,
          "mechanic_id": 1,
          "brand_id": 2,
          "brand_name": "Bajaj",
          "commission_percentage": "10.00"
        }
      ]
    }
  ]
  ```

### 8.2 Create Mechanic Partner
Registers a new mechanic partner with custom brand commission rates.

- **Method**: `POST`
- **Route**: `/api/v1/mechanics`
- **Authentication**: `Bearer <JWT_TOKEN>`
- **Request Body (`MechanicCreate`)**:
  ```json
  {
    "name": "Ramesh Sharma",
    "phone": "+91 98765 43210",
    "garage_name": "Ramesh Auto Care",
    "address": "Shop 4, Station Road",
    "default_commission_percentage": "5.00",
    "commissions": [
      {
        "brand_id": 1,
        "commission_percentage": "8.00"
      }
    ]
  }
  ```
- **Response (`201 Created`)**: `MechanicResponse` object.

### 8.3 Get Date-Wise Items Taken by Mechanic
Returns a chronological audit ledger of all spare parts taken or sold by this mechanic, showing invoice #, part details, commission %, and commission payout amount.

- **Method**: `GET`
- **Route**: `/api/v1/mechanics/{mechanic_id}/items`
- **Authentication**: `Bearer <JWT_TOKEN>`
- **Query Parameters**:
  - `start_date` (optional, date string `YYYY-MM-DD`)
  - `end_date` (optional, date string `YYYY-MM-DD`)
  - `skip` (optional, default: 0)
  - `limit` (optional, default: 100)
- **Response (`200 OK`)**:
  ```json
  [
    {
      "sale_id": 3,
      "invoice_number": "INV-20261125-193030-328",
      "date": "2026-11-25T19:30:30Z",
      "spare_part_id": 1,
      "item_name": "Front Disc Brake Pad",
      "part_number": "BP-101",
      "brand_name": "Hero",
      "quantity": 1,
      "unit_price": "450.00",
      "total_price": "450.00",
      "commission_percentage": "8.00",
      "commission_amount": "36.00",
      "customer_name": "Rohan Verma",
      "customer_phone": "9811223344"
    }
  ]
  ```

### 8.4 Get Mechanic Performance Summary
Calculates aggregate KPI totals: parts count, sales volume, and total commission earned.

- **Method**: `GET`
- **Route**: `/api/v1/mechanics/{mechanic_id}/summary`
- **Authentication**: `Bearer <JWT_TOKEN>`
- **Query Parameters**:
  - `start_date` (optional, date string `YYYY-MM-DD`)
  - `end_date` (optional, date string `YYYY-MM-DD`)
- **Response (`200 OK`)**:
  ```json
  {
    "mechanic_id": 1,
    "mechanic_name": "Ramesh Sharma",
    "garage_name": "Ramesh Auto Care",
    "total_items_taken": 1,
    "total_sales_volume": "450.00",
    "total_commission_earned": "36.00"
  }
  ```


