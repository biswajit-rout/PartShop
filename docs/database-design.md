# PartShop — Database Architecture & Entity Design Specification

> **Document Purpose**: Database schema specification, Entity-Relationship diagrams, indexing strategies, constraints, and migration governance.  
> **Source of Truth**: Codebase (`d:/Programming/PartShop`)  
> **Governance**: Maintained according to rules established in `AGENTS.md`.  
> **Last Updated**: 2026-11-23  

---

## 1. Database Architecture Overview

PartShop uses **PostgreSQL 16** containerized via Docker with persistent volume storage (`partshop-pgdata`).
- **ORM**: SQLAlchemy 2.0 (using modern `DeclarativeBase` and `Mapped[T]` type annotations).
- **Driver**: `asyncpg` (high-performance asynchronous driver).
- **Migration Framework**: Alembic (configured for async migrations).
- **Naming Convention**: `snake_case` for tables and columns; singular table entity concepts (`users`, `spare_parts`).

---

## 2. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    users {
        int id PK
        varchar username UK "Indexed"
        varchar email UK "Indexed"
        varchar full_name
        varchar password_hash
        varchar role "ADMIN, MANAGER, STAFF"
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    spare_parts {
        int id PK
        varchar item_name
        varchar brand_name "Indexed"
        varchar part_number "Indexed"
        varchar model_number
        text compatible_bikes
        int quantity "Current Stock"
        int min_stock_alert "Low Stock Threshold"
        varchar rack_number "Shelf Location"
        numeric purchase_price "10, 2"
        numeric selling_price "10, 2"
        numeric customer_discount "5, 2 default 0.0"
        numeric mechanic_discount "5, 2 default 0.0"
        varchar barcode UK "Indexed"
        varchar qr_code
        timestamptz created_at
        timestamptz updated_at
    }

    suppliers {
        int id PK
        varchar name
        varchar contact_person
        varchar phone
        varchar gst_number
        timestamptz created_at
    }

    sales {
        int id PK
        varchar invoice_number UK
        varchar customer_name
        int cashier_id FK
        numeric subtotal
        numeric gst_amount
        numeric grand_total
        varchar payment_method
        timestamptz created_at
    }

    sale_items {
        int id PK
        int sale_id FK
        int spare_part_id FK
        int quantity
        numeric unit_price
        numeric discount
        numeric total
    }

    stock_movements {
        int id PK
        int spare_part_id FK
        varchar movement_type "IN, OUT, ADJUSTMENT"
        int quantity
        varchar reference_type "SALE, PURCHASE, DAMAGE"
        int reference_id
        timestamptz created_at
    }

    users ||--o{ sales : "processes"
    sales ||--|{ sale_items : "contains"
    spare_parts ||--o{ sale_items : "sold in"
    spare_parts ||--o{ stock_movements : "audited by"
    suppliers ||--o{ spare_parts : "supplies"
```

---

## 3. Milestone 2 Core Entities Specification

### 3.1 `users` Table
Stores system cashiers, store managers, and administrators.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTO_INCREMENT` | Unique user identifier |
| `username` | `VARCHAR(50)` | `UNIQUE`, `NOT NULL`, `INDEXED` | Login username |
| `email` | `VARCHAR(255)` | `UNIQUE`, `NOT NULL`, `INDEXED` | Contact email |
| `full_name` | `VARCHAR(100)` | `NOT NULL` | Employee full name |
| `password_hash`| `VARCHAR(255)` | `NOT NULL` | Bcrypt hashed password |
| `role` | `VARCHAR(20)` | `NOT NULL`, Default: `'STAFF'` | `ADMIN`, `STORE_MANAGER`, `COUNTER_STAFF` |
| `is_active` | `BOOLEAN` | `NOT NULL`, Default: `TRUE` | Soft-deactivation flag |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, Default: `NOW()` | Record creation timestamp (UTC) |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, Default: `NOW()` | Automatic update timestamp (UTC) |

### 3.2 `spare_parts` Table
Stores the inventory catalog, pricing tiers, barcodes, and bin/rack locations.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTO_INCREMENT` | Unique part identifier |
| `item_name` | `VARCHAR(150)` | `NOT NULL` | Name of the spare part |
| `brand_name`| `VARCHAR(100)` | `NOT NULL`, `INDEXED` | Manufacturer (e.g. Hero, Bajaj, Bosch) |
| `part_number`| `VARCHAR(100)`| `NOT NULL`, `INDEXED` | OEM/Aftermarket part number |
| `model_number`| `VARCHAR(100)`| `NULLABLE` | Engine or chassis series |
| `compatible_bikes` | `TEXT` | `NULLABLE` | Searchable list of compatible motorcycles |
| `quantity` | `INTEGER` | `NOT NULL`, Default: `0` | Physical stock on hand |
| `min_stock_alert` | `INTEGER` | `NOT NULL`, Default: `5` | Reorder threshold alert |
| `rack_number`| `VARCHAR(50)` | `NULLABLE` | Physical shop bin / rack locator |
| `purchase_price` | `NUMERIC(10, 2)` | `NOT NULL` | Cost of acquisition from supplier |
| `selling_price` | `NUMERIC(10, 2)` | `NOT NULL` | Counter retail price |
| `customer_discount` | `NUMERIC(5, 2)` | `NOT NULL`, Default: `0.00` | Retail customer discount percentage |
| `mechanic_discount` | `NUMERIC(5, 2)` | `NOT NULL`, Default: `0.00` | Registered garage mechanic discount |
| `barcode` | `VARCHAR(100)` | `UNIQUE`, `NULLABLE`, `INDEXED` | Scannable POS barcode |
| `qr_code` | `VARCHAR(255)` | `NULLABLE` | QR Code locator identifier |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, Default: `NOW()` | Record creation timestamp (UTC) |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, Default: `NOW()` | Automatic update timestamp (UTC) |

### 3.3 `sales` Table
Stores POS counter sales invoices, cashier details, tax breakdown, and payment methods.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTO_INCREMENT` | Unique sale identifier |
| `invoice_number` | `VARCHAR(50)` | `UNIQUE`, `NOT NULL`, `INDEXED` | Unique invoice code (e.g. `INV-20261124-001`) |
| `customer_name` | `VARCHAR(100)` | `NULLABLE` | Walk-in or counter customer name |
| `customer_phone` | `VARCHAR(20)` | `NULLABLE` | Customer mobile number |
| `cashier_id` | `INTEGER` | `NOT NULL`, `FK -> users.id` | Staff member who processed the transaction |
| `subtotal` | `NUMERIC(10, 2)` | `NOT NULL` | Total before tax and discounts |
| `discount_amount`| `NUMERIC(10, 2)` | `NOT NULL`, Default: `0.00` | Total discount applied |
| `tax_amount` | `NUMERIC(10, 2)` | `NOT NULL`, Default: `0.00` | Calculated GST amount (CGST + SGST) |
| `grand_total` | `NUMERIC(10, 2)` | `NOT NULL` | Final billed amount paid by customer |
| `payment_method` | `VARCHAR(20)` | `NOT NULL`, Default: `'CASH'` | `CASH`, `CARD`, `UPI`, `CREDIT` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, Default: `NOW()` | Checkout timestamp (UTC) |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, Default: `NOW()` | Timestamp (UTC) |

### 3.4 `sale_items` Table
Line items inside a sales invoice.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTO_INCREMENT` | Unique line item ID |
| `sale_id` | `INTEGER` | `NOT NULL`, `FK -> sales.id` | Parent invoice ID |
| `spare_part_id` | `INTEGER` | `NOT NULL`, `FK -> spare_parts.id` | Part that was sold |
| `quantity` | `INTEGER` | `NOT NULL` | Number of units sold |
| `unit_price` | `NUMERIC(10, 2)` | `NOT NULL` | Unit price at time of sale |
| `discount_percent` | `NUMERIC(5, 2)` | `NOT NULL`, Default: `0.00` | Discount applied to item |
| `total_price` | `NUMERIC(10, 2)` | `NOT NULL` | Final line total: `(unit_price * qty) - discount` |

### 3.5 `stock_movements` Table (Immutable Audit Ledger)
Audit trail tracking every single inventory increment or decrement.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTO_INCREMENT` | Unique ledger event ID |
| `spare_part_id` | `INTEGER` | `NOT NULL`, `FK -> spare_parts.id` | Item being adjusted |
| `movement_type` | `VARCHAR(20)` | `NOT NULL` | `SALE_OUT`, `PURCHASE_IN`, `RETURN_IN`, `ADJUSTMENT` |
| `quantity_change` | `INTEGER` | `NOT NULL` | Change amount (negative for sales, positive for restock) |
| `balance_after` | `INTEGER` | `NOT NULL` | Resulting inventory balance |
| `reference_type` | `VARCHAR(50)` | `NULLABLE` | `SALE`, `PURCHASE`, `DAMAGE` |
| `reference_id` | `INTEGER` | `NULLABLE` | Foreign invoice or PO reference number |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, Default: `NOW()` | Timestamp when movement took place |

---

## 4. Indexing & Optimization Strategy

1. **Barcode / SKU Lookups**: Fast point-of-sale scanning requires `< 5ms` queries. An explicit `B-tree index` is placed on `spare_parts.barcode` and `spare_parts.part_number`.
2. **Brand & Filter Queries**: `spare_parts.brand_name` is indexed to accelerate sidebar catalog filtering in the POS view.
3. **Authentication Queries**: `users.username` and `users.email` have unique B-tree indexes for fast credential lookups during cashier sign-in.
