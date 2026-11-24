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
Fast paginated catalog search by item name, part number, compatible motorcycle model, or brand.

- **Method**: `GET`
- **Route**: `/api/v1/parts/`
- **Authentication**: `Bearer <JWT_TOKEN>`
- **Query Parameters**:
  - `q` (string, optional): Full-text search term across item name, part number, and bike model.
  - `brand` (string, optional): Filter by brand (e.g. `Hero`, `Bajaj`).
  - `low_stock_only` (boolean, optional, default: `false`): Filter items where `quantity <= min_stock_alert`.
  - `skip` (integer, default: `0`): Pagination offset.
  - `limit` (integer, default: `50`, max: `100`): Page size.
- **Response (`200 OK`)**:
  ```json
  {
    "total": 1,
    "skip": 0,
    "limit": 50,
    "items": [
      {
        "id": 1,
        "item_name": "Front Disc Brake Pad",
        "brand_name": "Bosch",
        "part_number": "BP-4029-FR",
        "model_number": "Pulsar 220 / Apache RTR",
        "compatible_bikes": "Bajaj Pulsar 220, TVS Apache RTR 160/180",
        "quantity": 25,
        "min_stock_alert": 5,
        "rack_number": "Rack-B3",
        "purchase_price": "280.00",
        "selling_price": "450.00",
        "customer_discount": "5.00",
        "mechanic_discount": "12.00",
        "barcode": "8901234567890",
        "created_at": "2026-11-23T18:00:00Z",
        "updated_at": "2026-11-23T18:00:00Z"
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

