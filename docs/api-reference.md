# PartShop — REST API Reference Specification

> **Document Purpose**: Complete HTTP API specifications, request/response contracts, validation rules, and authentication schemas.  
> **Source of Truth**: Active Codebase (`d:/Programming/PartShop`)  
> **Governance**: Maintained according to rules established in `AGENTS.md`.  
> **Last Updated**: 2026-11-26  

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
    "supplier_id": 2,
    "supplier_name": "Om Sai Auto Spares Wholesaler",
    "supplier_discount": 18.00,
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
  - `is_confirmed` (boolean, optional): Filter by confirmation status (`true` for confirmed catalog, `false` for unconfirmed staging queue).
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

### 3.5 Fast Goods Inward / Restock Spare Part
Quickly restocks an existing spare part from shipment delivery or inward scan: increments current quantity on hand, optionally updates acquisition purchase cost or rack locator, and logs an immutable `PURCHASE_IN` entry in the `stock_movements` audit ledger.

- **Method**: `POST`
- **Route**: `/api/v1/parts/{part_id}/restock`
- **Authentication**: `Bearer <JWT_TOKEN>` (Role: `ADMIN`, `STORE_MANAGER`, `COUNTER_STAFF`)
- **Request Body (`SparePartRestock`)**:
  ```json
  {
    "quantity_to_add": 10,
    "purchase_price": 210.00,
    "rack_number": "Rack-B04"
  }
  ```
- **Validation Rules**:
  - `quantity_to_add`: Integer greater than 0 (`HTTP 400` if <= 0).
  - `purchase_price`: Optional updated purchase cost.
  - `rack_number`: Optional updated shelf locator string.
- **Response (`200 OK`)**: Updated `SparePartResponse` object with incremented `quantity`.
- **Error Codes**:
  - `404 Not Found`: Spare part with ID not found.
  - `400 Bad Request`: Invalid quantity to add.

---

### 3.6 Batch Confirm Spare Parts
Multi-select confirm unconfirmed or staging spare parts (e.g. newly imported from bulk Excel workbooks). Transitions parts to `is_confirmed = True`, making them instantly active for POS counter sales.

- **Method**: `POST`
- **Route**: `/api/v1/parts/confirm-batch`
- **Authentication**: `Bearer <JWT_TOKEN>` (Role: `ADMIN`, `STORE_MANAGER`, `COUNTER_STAFF`)
- **Request Body (`SparePartBatchConfirmRequest`)**:
  ```json
  {
    "part_ids": [101, 102, 105, 108]
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "confirmed_count": 4,
    "part_ids": [101, 102, 105, 108],
    "message": "Successfully confirmed 4 spare part(s)."
  }
  ```
- **Error Codes**:
  - `401 Unauthorized`: Missing or invalid credentials.

---

### 3.7 Single Part Confirm & Rack Location Assignment
Validates and confirms an individual spare part, optionally updating or assigning its warehouse shelf/rack locator at the same time.

- **Method**: `POST`
- **Route**: `/api/v1/parts/{part_id}/confirm`
- **Authentication**: `Bearer <JWT_TOKEN>` (Role: `ADMIN`, `STORE_MANAGER`, `COUNTER_STAFF`)
- **Request Body (`SparePartSingleConfirmRequest`, Optional)**:
  ```json
  {
    "rack_number": "RACK-A02"
  }
  ```
- **Response (`200 OK`)**: Updated `SparePartResponse` object with `is_confirmed: true` and updated `rack_number`.
- **Error Codes**:
  - `404 Not Found`: Part ID not found.

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

### 4.3 List Past Invoices
Retrieves a paginated list of all customer sales invoices sorted descending by creation time, with optional search term filtering, date range filtering, and status filtering.

- **Method**: `GET`
- **Route**: `/api/v1/billing/invoices`
- **Authentication**: `Bearer <JWT_TOKEN>` (Role: `ADMIN`, `STORE_MANAGER`, `COUNTER_STAFF`)
- **Query Parameters**:
  - `skip` (integer, optional, default: `0`): Pagination offset.
  - `limit` (integer, optional, default: `50`): Maximum records to return.
  - `search` (string, optional): Search term matching invoice number, customer name, or customer phone.
  - `start_date` (date string `YYYY-MM-DD`, optional): Filter invoices created on or after this date.
  - `end_date` (date string `YYYY-MM-DD`, optional): Filter invoices created on or before this date.
  - `status` (string, optional): One of `COMPLETED`, `VOIDED`.
- **Response (`200 OK`)**: Array of `InvoiceResponse` objects.
- **Error Codes**:
  - `401 Unauthorized`: Missing or invalid JWT token.

---

### 4.4 Modify Past Invoice Header Details
Allows store managers and counter staff to correct errors on an existing invoice header (such as spelling errors in customer name, incorrect phone number, or updating the payment channel) without disturbing inventory stock audit ledgers. Voided/cancelled invoices cannot be modified.

- **Method**: `PUT`
- **Route**: `/api/v1/billing/invoices/{invoice_id}`
- **Authentication**: `Bearer <JWT_TOKEN>` (Role: `ADMIN`, `STORE_MANAGER`, `COUNTER_STAFF`)
- **Path Parameters**:
  - `invoice_id` (integer, required): Unique identifier of the invoice.
- **Request Body (`InvoiceUpdateRequest`)**:
  ```json
  {
    "customer_name": "Ramesh Kumar Gupta",
    "customer_phone": "9876543210",
    "payment_method": "UPI",
    "items": [
      {
        "spare_part_id": 76,
        "quantity": 2,
        "discount_percent": 5.0
      }
    ]
  }
  ```
- **Validation & Inventory Rules**:
  - All fields are optional.
  - `payment_method`: One of `CASH`, `CARD`, `UPI`, `CREDIT`.
  - `items`: If provided, must contain at least 1 item.
  - Automatically compares new item quantities against existing invoice items:
    - **Quantity increased / New item added**: Locks part row under `SELECT ... FOR UPDATE`, checks stock sufficiency, decrements inventory, and logs `StockMovementType.SALE_OUT` (`reference_type="SALE_EDIT"`).
    - **Quantity reduced / Item removed**: Locks part row under `SELECT ... FOR UPDATE`, increments inventory, and logs `StockMovementType.RETURN_IN` (`reference_type="SALE_EDIT"`).
  - Dynamically recalculates subtotal, discounts, 18% GST tax, grand total, and mechanic commission rates.
- **Response (`200 OK`)**: Updated `InvoiceResponse` object with refreshed line items, tax, and totals.
- **Error Codes**:
  - `400 Bad Request`: Cannot modify voided invoices, empty items array, or insufficient inventory stock.
  - `404 Not Found`: Invoice ID or spare part ID not found.
  - `401 Unauthorized`: Missing or invalid JWT token.

---

### 4.5 Void / Cancel Invoice (Customer Item Return)
Voids an existing counter invoice and handles customer returns:
- Automatically restores physical inventory stock quantities under database row locks (`SELECT ... FOR UPDATE`).
- Records immutable `RETURN_IN` audit ledger entries in `stock_movements` linked to the invoice ID.
- Sets invoice status to `VOIDED` with an optional cancellation reason and audit timestamp.
- Excludes voided invoice totals from today's sales, daily profit, rolling weekly trend, and mechanic commission calculations.

- **Method**: `POST`
- **Route**: `/api/v1/billing/invoices/{invoice_id}/cancel`
- **Authentication**: `Bearer <JWT_TOKEN>` (Role: `ADMIN`, `STORE_MANAGER`, `COUNTER_STAFF`)
- **Path Parameters**:
  - `invoice_id` (integer, required): Unique identifier of the invoice to void.
- **Request Body (`InvoiceCancelRequest`)**:
  ```json
  {
    "reason": "Customer returned defective clutch cable"
  }
  ```
- **Response (`200 OK`)**: Updated `InvoiceResponse` object with `status: "VOIDED"`.
- **Error Codes**:
  - `400 Bad Request`: Invoice is already voided / cancelled.
  - `404 Not Found`: Invoice ID not found.
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
  - `supplier_id` (optional, integer): ID of wholesale supplier to map imported parts to.
  - `brand_name` (optional, string): Fallback brand name to apply if spreadsheet rows omit brand.
  - `default_supplier_discount` (optional, numeric): Fallback purchase discount % (e.g. `14.50`) applied to compute cost from MRP.
- **Header Columns Expected in Excel**:
  - Required: `item_name`, `brand_name` (or `brand`), `part_number`, `purchase_price`, `selling_price` (or `MRP` with supplier discount)
  - Optional: `model_number`, `compatible_bikes`, `quantity`, `min_stock_alert`, `rack_number`, `customer_discount`, `mechanic_discount`, `barcode`, `supplier_discount`
- **Response (`200 OK`)**:
  ```json
  {
    "filename": "honda_activa_spares_nov2026.xlsx",
    "total_rows_processed": 53,
    "imported_count": 53,
    "skipped_count": 0,
    "supplier_id": 1,
    "supplier_name": "Kalyani Honda Spares Distributorship",
    "errors": []
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
- **Authentication**: `Bearer <JWT_TOKEN>` (Role: `ADMIN`, `STORE_MANAGER`, `COUNTER_STAFF`)
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
      "min_stock_alert": 5
    }
  ]
  ```

---

### 6.4 Rolling Weekly Sales vs Purchases Trend
Retrieves a rolling 7-day time series comparing counter sales revenue with inventory purchase inward costs.

- **Method**: `GET`
- **Route**: `/api/v1/reports/weekly-trend`
- **Authentication**: `Bearer <JWT_TOKEN>` (Role: `ADMIN`, `STORE_MANAGER`, `COUNTER_STAFF`)
- **Query Parameters**:
  - `days` (integer, optional, default: `7`, max: `30`): Number of rolling days.
- **Response (`200 OK`)**:
  ```json
  [
    {
      "day": "Thu",
      "date": "2026-11-26",
      "sales": 3541.18,
      "purchase": 0.0
    }
  ]
  ```

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
      "default_customer_discount": "5.00",
      "default_mechanic_discount": "10.00",
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
    "description": "High Performance Brake Systems",
    "default_customer_discount": "5.00",
    "default_mechanic_discount": "10.00"
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

---

## 9. Wholesale Suppliers Directory (`/api/v1/suppliers`)

### 9.1 List All Suppliers
Returns all registered wholesale suppliers and distributor partners along with their aggregate mapped inventory parts count.

- **Method**: `GET`
- **Route**: `/api/v1/suppliers`
- **Authentication**: `Bearer <JWT_TOKEN>`
- **Query Parameters**:
  - `active_only` (optional, boolean, default: `false`): Filter active suppliers only.
- **Response (`200 OK`)**:
  ```json
  [
    {
      "id": 1,
      "name": "Kalyani Honda Spares Distributorship",
      "contact_person": "Prakash Rout",
      "phone": "+91 94370 12345",
      "email": "orders@kalyanihonda.com",
      "address": "Plot 12, Industrial Estate, Cuttack, Odisha",
      "gst_number": "21AABCK1234F1Z9",
      "default_discount_percentage": "14.50",
      "is_active": true,
      "total_parts_count": 53,
      "brand_discounts": [
        {
          "id": 1,
          "supplier_id": 1,
          "brand_id": 1,
          "brand_name": "Hero",
          "discount_percentage": "22.00"
        },
        {
          "id": 2,
          "supplier_id": 1,
          "brand_id": 2,
          "brand_name": "Honda",
          "discount_percentage": "18.00"
        }
      ],
      "created_at": "2026-11-26T00:00:00Z",
      "updated_at": "2026-11-26T00:00:00Z"
    }
  ]
  ```

### 9.2 Create Supplier
Registers a new distributor or wholesale partner with optional brand-specific purchase discount overrides.

- **Method**: `POST`
- **Route**: `/api/v1/suppliers`
- **Authentication**: `Bearer <JWT_TOKEN>` (Role: `ADMIN`, `STORE_MANAGER`, `COUNTER_STAFF`)
- **Request Body (`SupplierCreate`)**:
  ```json
  {
    "name": "Om Sai Auto Spares Wholesaler",
    "contact_person": "Sanjay Mohanty",
    "phone": "+91 94371 67890",
    "email": "omsai.spares@gmail.com",
    "address": "Badambadi Market, Cuttack, Odisha",
    "gst_number": "21AABCO5678H1Z4",
    "default_discount_percentage": 15.00,
    "is_active": true,
    "brand_discounts": [
      {
        "brand_id": 1,
        "discount_percentage": 22.00
      },
      {
        "brand_id": 2,
        "discount_percentage": 18.00
      }
    ]
  }
  ```
- **Response (`201 Created`)**: Full `SupplierResponse` object with `brand_discounts` and `total_parts_count: 0`.

### 9.3 Get Supplier by ID
Retrieves details for a single supplier.

- **Method**: `GET`
- **Route**: `/api/v1/suppliers/{id}`
- **Authentication**: `Bearer <JWT_TOKEN>`
- **Response (`200 OK`)**: Full `SupplierResponse` object.

### 9.4 Update Supplier
Updates supplier contact details, address, GSTIN, or default purchase discount percentage.

- **Method**: `PUT`
- **Route**: `/api/v1/suppliers/{id}`
- **Authentication**: `Bearer <JWT_TOKEN>` (Role: `ADMIN`, `STORE_MANAGER`, `COUNTER_STAFF`)
- **Request Body (`SupplierUpdate`)**: Partial update fields.
- **Response (`200 OK`)**: Updated `SupplierResponse` object.

### 9.5 Delete Supplier
Soft-deactivates or deletes a supplier partner.

- **Method**: `DELETE`
- **Route**: `/api/v1/suppliers/{id}`
- **Authentication**: `Bearer <JWT_TOKEN>` (Role: `ADMIN`, `STORE_MANAGER`)
- **Response (`204 No Content`)**

### 9.6 Get Items Supplied by Supplier
Returns a paginated list of all spare parts mapped to a specific wholesale supplier, including part number, compatible bikes, purchase discount %, purchase cost, MRP, and stock on hand.

- **Method**: `GET`
- **Route**: `/api/v1/suppliers/{id}/parts`
- **Authentication**: `Bearer <JWT_TOKEN>`
- **Query Parameters**:
  - `skip` (integer, default: `0`)
  - `limit` (integer, default: `100`, max: `500`)
- **Response (`200 OK`)**: `PaginatedSpareParts` schema with `total`, `items`, `page`, and `pages`.

---

## 10. Mobile Barcode Scanner & WebSockets Gateway (`/api/v1/scanner`)

### 10.1 Get Host Network Information
Discovers the host machine's primary local area network (LAN) IP addresses for generating mobile device pairing QR codes. Respects `HOST_LAN_IP` environment variable if configured, and strictly filters out Docker virtual bridge subnets (`172.16.x.x` - `172.31.x.x`) and loopbacks.

- **Method**: `GET`
- **Route**: `/api/v1/scanner/network-info`
- **Authentication**: Public
- **Response (`200 OK`)**:
  ```json
  {
    "primary_ip": "192.168.1.9",
    "all_ips": [
      "192.168.1.9"
    ],
    "is_docker_container_ip": false,
    "frontend_port": 3000,
    "backend_port": 8001,
    "suggested_scan_url": "http://192.168.1.9:3000/scan"
  }
  ```

### 10.2 Scanner WebSocket Bridge
Bidirectional real-time WebSocket connection bridging the desktop counter terminal and multiple mobile smartphone camera scanners simultaneously. Maintains a live connected devices roster with scan count telemetry.

- **Protocol**: `WebSocket (WS / WSS)`
- **Route**: `/api/v1/scanner/ws/{session_id}`
- **Authentication**: Session-token based (`session_id`)
- **Events & Message Payloads**:
  1. **Device Connected Event** (Sent by Mobile on open):
     ```json
     {
       "type": "DEVICE_CONNECTED",
       "device_id": "dev_4k9j2x",
       "device_type": "mobile",
       "device_name": "iPhone 15",
       "session_id": "sess_94a2b1"
     }
     ```
  2. **Roster Updated Event** (Server broadcast upon connection, disconnection, or scan count increment):
     ```json
     {
       "type": "ROSTER_UPDATED",
       "session_id": "sess_94a2b1",
       "devices": [
         {
           "device_id": "dev_4k9j2x",
           "device_name": "iPhone 15",
           "connected_at": 1732626000000,
           "scan_count": 4
         }
       ],
       "new_device": {
         "device_id": "dev_4k9j2x",
         "device_name": "iPhone 15"
       }
     }
     ```
  3. **Get Roster Query** (Sent by Desktop on open or refresh):
     ```json
     {
       "type": "GET_ROSTER",
       "session_id": "sess_94a2b1"
     }
     ```
  4. **Barcode Scanned Event** (Sent by Mobile on barcode / QR code detection):
     ```json
     {
       "type": "BARCODE_SCANNED",
       "barcode": "8901234009083",
       "session_id": "sess_94a2b1",
       "device_id": "dev_4k9j2x",
       "device_name": "iPhone 15",
       "timestamp": 1732626050000
     }
     ```
  5. **Device Disconnected Event** (Server broadcast when a mobile socket drops):
     ```json
     {
       "type": "DEVICE_DISCONNECTED",
       "session_id": "sess_94a2b1",
       "device": {
         "device_id": "dev_4k9j2x",
         "device_name": "iPhone 15"
       }
     }
     ```
  6. **Ping / Pong Keep-Alive** (Client / Server Heartbeat every 15s):
     - Client: `{"type": "PING"}`
     - Server: `{"type": "PONG"}`




---

## 11. Shop Operating Expenses API (`/api/v1/expenses`)

### 11.1 Record an Operating Expense
Logs an operational overhead expense (e.g. tea/refreshments, electricity, shop rent, staff wages).

- **Method**: `POST`
- **Route**: `/api/v1/expenses`
- **Authentication**: `Bearer <JWT_TOKEN>` (Role: `ADMIN`, `STORE_MANAGER`, `COUNTER_STAFF`)
- **Request Body (`ExpenseCreate`)**:
  ```json
  {
    "category": "TEA_REFRESHMENT",
    "amount": 120.00,
    "description": "Evening snacks for staff",
    "expense_date": "2026-11-26"
  }
  ```
- **Validation Rules**:
  - `category`: One of `RENT`, `ELECTRICITY`, `TEA_REFRESHMENT`, `SALARY_WAGES`, `MAINTENANCE`, `TRANSPORT`, `STATIONERY`, `OTHER`.
  - `amount`: Number greater than 0.
  - `description`: Optional text details.
  - `expense_date`: Valid date string (`YYYY-MM-DD`). Defaults to current date if omitted.
- **Response (`201 Created`)**: `ExpenseResponse` object.

### 11.2 List Expenses
Queries logged expenses with date-range filtering and category filtering.

- **Method**: `GET`
- **Route**: `/api/v1/expenses`
- **Authentication**: `Bearer <JWT_TOKEN>`
- **Query Parameters**:
  - `category` (string, optional): Filter by category enum.
  - `start_date` (string, optional, `YYYY-MM-DD`): Inclusive start date.
  - `end_date` (string, optional, `YYYY-MM-DD`): Inclusive end date.
  - `skip` (integer, default: 0): Pagination offset.
  - `limit` (integer, default: 100): Maximum records returned.
- **Response (`200 OK`)**: List of `ExpenseResponse` objects.

### 11.3 Get Daily Expense & Profit Summary
Aggregates total daily operational expenses, provides category-wise breakdowns, and computes estimated net profit ($\text{Total Counter Sales} - \text{Total Expenses}$).

- **Method**: `GET`
- **Route**: `/api/v1/expenses/daily-summary`
- **Authentication**: `Bearer <JWT_TOKEN>`
- **Query Parameters**:
  - `target_date` (string, optional, `YYYY-MM-DD`, default: today).
- **Response (`200 OK`)**:
  ```json
  {
    "date": "2026-11-26",
    "total_expense": 120.00,
    "categories": {
      "TEA_REFRESHMENT": 120.00
    },
    "total_sales": 3541.18,
    "estimated_profit": 3421.18
  }
  ```

### 11.4 Delete Expense Record
Deletes an expense entry by ID.

- **Method**: `DELETE`
- **Route**: `/api/v1/expenses/{expense_id}`
- **Authentication**: `Bearer <JWT_TOKEN>` (Role: `ADMIN`, `STORE_MANAGER`)
- **Response (`204 No Content`)**
