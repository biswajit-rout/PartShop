# Changelog

All notable changes to the PartShop project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and follows the governance instructions established in `AGENTS.md`.

---

## 2026-11-27

### Added
- `docker-compose.prod.yml` & `Caddyfile` & `.env.prod.example`: Added production-hardened Docker orchestration featuring a Caddy 2 edge reverse proxy (automatic Let's Encrypt HTTPS and WebSocket proxying), internal-only PostgreSQL and FastAPI networking, non-root production containers, automatic `alembic upgrade head` startup migrations, and container healthchecks.
- `backend/.dockerignore`: Excluded local `.venv/`, `__pycache__/`, `.env*`, and git metadata from backend Docker build contexts.
- `backend/app/core/config.py`: Added environment-driven `CORS_ORIGINS` and `CORS_ORIGIN_REGEX` settings with `cors_origins_list` parser.
- `backend/app/services/billing_service.py` & `backend/app/schemas/billing.py`:
  - Upgraded `InvoiceUpdateRequest` to accept `items: list[CartItemInput]` and `mechanic_id: int | None`.
  - Implemented comprehensive invoice line-item modification in `update_invoice()`:
    - Calculates quantity differential ($\Delta = Q_{new} - Q_{old}$) for each spare part under row-level database locks (`with_for_update()`).
    - Quantity reductions and item removals automatically restore stock into available inventory and record immutable `StockMovementType.RETURN_IN` (`reference_type="SALE_EDIT"`).
    - Quantity increases and newly added items check warehouse stock sufficiency, deduct inventory, and record `StockMovementType.SALE_OUT` (`reference_type="SALE_EDIT"`).
    - Automatically updates line item collections (`sale.items`), recalculates taxable subtotal, line discounts, 18% GST tax, grand total, and mechanic commissions, and refreshes session cache (`expire_all()`).
- `frontend/src/api/modules/billing.api.ts`: Updated `InvoiceUpdateRequest` interface to support optional `items: CartItemPayload[]` and `mechanic_id`.
- `frontend/src/components/views/BillingView.tsx`: Upgraded "Modify Invoice" modal to full-featured "Edit Invoice Details & Items" modal:
  - Supports customer name and phone correction, and payment method selection (Cash, UPI, Card, Credit).
  - Search and autocomplete dropdown to easily add new parts to an existing invoice.
  - Interactive items table with +/- quantity steppers, discount percentage inputs, real-time line total calculations, and one-click item removal (trash icon).
  - Real-time settlement preview displaying Subtotal, 18% GST, and Grand Total.
  - Automatic inventory stock notice and validation ensuring at least 1 item remains on the bill.
- `backend/app/models/sale.py`: Added `SaleStatus` enum (`COMPLETED`, `VOIDED`) and `status`, `cancellation_reason`, and `cancelled_at` fields to `Sale` model.
- `backend/alembic/versions/c9d5e2f1a8b4_add_status_and_cancellation_to_sales.py`: Database migration creating the `salestatus` PostgreSQL enum, adding columns to `sales`, and indexing `status`.
- `backend/app/schemas/billing.py`: Added `status`, `cancellation_reason`, and `cancelled_at` to `InvoiceResponse`, and created `InvoiceCancelRequest(reason: str | None)`.
- `backend/app/services/billing_service.py`:
  - Upgraded `list_invoices()` to support `start_date`, `end_date`, `status`, and `search` query filters.
  - Implemented `cancel_invoice()` featuring row-level locking (`with_for_update()`), atomic inventory quantity restoration, immutable `StockMovement(movement_type=RETURN_IN, reference_type="SALE_VOID")` logging, and duplicate void prevention.
  - Guarded `update_invoice()` to reject modifications against voided bills.
- `backend/app/api/v1/endpoints/billing.py`: Mounted `POST /api/v1/billing/invoices/{invoice_id}/cancel` and added date/status query params to `GET /api/v1/billing/invoices`.
- `backend/app/services/report_service.py`, `backend/app/services/expense_service.py`, `backend/app/services/mechanic_service.py`: Filtered all financial calculations (Daily Sales, Today's Sales on Dashboard, Net Daily Profit, Weekly Trend, Top Selling Parts, Mechanic Commissions) to exclude `VOIDED` sales.
- `frontend/src/api/modules/billing.api.ts`: Added `cancelInvoice()` and updated `getInvoices()` to send `startDate`, `endDate`, and `status`.
- `frontend/src/components/views/BillingView.tsx`:
  - **Date Range Filters**: Added presets ("All Time", "Today", "This Week", "This Month", "Custom Range") with custom start/end date inputs.
  - **Status Tabs**: Added filter tabs for `All Invoices`, `🟢 Active`, and `🔴 Voided / Returned`.
  - **Lifecycle Badges & Strikethrough**: Rendered status badges and strike-through on voided invoice amounts.
  - **Return & Void Modal**: Dedicated confirmation modal showing line items to be returned to stock, cancellation reason field, and atomic reversal trigger.
  - **Thermal Receipt Void Banner**: Receipt print dialog displays prominent "VOIDED / RETURNED" banner with cancellation timestamp and reason.
- `frontend/src/components/views/BillingView.tsx`: Implemented two-sub-tab POS Billing architecture:
  - **Sub-Tab 1: New Bill / POS Counter**: The active POS counter for barcode/manual item lookup, automated brand/mechanic discounts, 18% GST calculation, and atomic checkout.
  - **Sub-Tab 2: Invoices History**: Chronological view of past sales invoices with live search filtering (invoice number, customer name, customer phone), line item and payment badges, and total amounts.
  - **Invoice Receipt Modal**: One-click modal to inspect full line items, discounts, GST tax, and reprint thermal receipts.
  - **Modify Invoice Header Modal**: Quick editing dialog enabling cashiers to correct customer name, phone number, and payment method (Cash, UPI, Card, Store Credit) without altering immutable stock movement ledgers.
- `backend/app/schemas/billing.py`: Added `InvoiceUpdateRequest` schema for modifying invoice headers.
- `backend/app/services/billing_service.py`: Added `list_invoices()` with search term matching and `update_invoice()` for safe customer/payment metadata modification.
- `backend/app/api/v1/endpoints/billing.py`: Mounted `GET /api/v1/billing/invoices` and `PUT /api/v1/billing/invoices/{invoice_id}` endpoints.
- `frontend/src/api/modules/billing.api.ts`: Added `getInvoices()` and `updateInvoice()` API client methods.

### Updated
- `backend/Dockerfile`: Refactored into a multi-target Dockerfile (`base`, `dev`, `prod`) supporting hot-reload in local development and non-root `appuser` execution (`--workers 1 --proxy-headers`, automatic Alembic migrations) in production.
- `docker-compose.yml` & `.env.example`: Updated local development Compose setup to use `backend` `target: dev`, aligned `NEXT_PUBLIC_API_URL` build args/env to `http://localhost:8001/api/v1`, added container healthchecks for `frontend` and `backend`, and enabled LAN IP `CORS_ORIGIN_REGEX` for local mobile scanner testing.
- `backend/app/main.py`: Updated `CORSMiddleware` to consume `settings.cors_origins_list` and `settings.CORS_ORIGIN_REGEX` instead of hardcoded localhost origins.
- `frontend/src/api/modules/scanner.api.ts` & `frontend/src/components/scanner/MobileScannerModal.tsx`: Updated `getWebSocketUrl()` and pairing QR URL generation to support same-origin reverse proxy paths (`/api/v1`) and HTTPS (`wss://`) in production while retaining local LAN (`:8001`) development behavior.
- `docs/docker-architecture.md`, `docs/deployment.md`, and `README.md`: Synchronized local and production Docker architecture diagrams, service specs, environment variables, and operational runbooks.

### Fixed
- `frontend/src/api/modules/scanner.api.ts` & `backend/app/api/v1/endpoints/scanner.py`: Hardened Docker internal IP detector (`isDockerInternalIp` / `is_docker_or_loopback_ip`) to strip port suffixes and exclude any private Docker container bridge subnets (`172.16.x.x` - `172.31.x.x`) and loopback addresses, preventing mobile phone browser timeout errors (`ERR_CONNECTION_TIMED_OUT` on `172.21.0.4:3000`).
- `frontend/src/context/ScannerContext.tsx`: Automatically sanitizes any legacy `172.x` Docker bridge IPs stored in browser `localStorage`, defaulting immediately to the host computer's physical Wi-Fi IP (`192.168.1.9`).
- `frontend/src/components/scanner/MobileScannerModal.tsx`: Enforced clean fallback to host PC LAN IP (`192.168.1.9:3000`) for the mobile scanner pairing QR code and scan URL.

## 2026-11-26

### Added
- `backend/app/models/supplier.py`: Added `SupplierBrandDiscount` model with unique constraint `(supplier_id, brand_id)` enabling wholesalers who supply multiple brands (Hero, Honda, Bajaj, TVS) to have custom wholesale purchase discount percentage overrides.
- `backend/app/models/brand.py`: Added `default_customer_discount` and `default_mechanic_discount` attributes for automated retail and trade selling discount rules.
- `backend/alembic/versions/b8e4f1a2c3d5_create_supplier_brand_discounts_table.py`: Database migration creating the `supplier_brand_discounts` table with foreign key cascades and adding discount columns to `brands`.
- `backend/app/schemas/supplier.py` & `backend/app/schemas/brand.py`: Updated Pydantic v2 schemas (`SupplierBrandDiscountCreate`, `SupplierBrandDiscountResponse`, `SupplierCreate`, `SupplierUpdate`, `SupplierResponse`, `BrandBase`, `BrandResponse`).
- `backend/app/services/supplier_service.py`: Added multi-brand discount management and `get_effective_discount()` lookup method with fallback to supplier base discount.
- `backend/app/services/inventory_service.py`: Added automatic inference of purchase discount and brand selling discounts upon single-part creation.
- `backend/app/services/import_service.py`: Upgraded bulk Excel import engine to resolve multi-brand supplier purchase discounts and brand selling discounts in lock-free memory without concurrency or locking issues.
- `frontend/src/types/index.ts` & `frontend/src/api/modules/suppliers.api.ts` & `frontend/src/api/modules/brands.api.ts`: Updated TypeScript domain contracts and API client adapters.
- `frontend/src/components/views/SuppliersView.tsx`: Integrated multi-brand discount matrix UI with brand rates chips on supplier cards and dynamic add/remove rows in Add/Edit modals.
- `frontend/src/components/views/InventoryView.tsx`: Added brand selling discount configuration and inline editing for Retail and Mechanic rates in Item Brands Master modal.
- `frontend/src/components/views/BillingView.tsx`: Automated POS line-item discounts populated dynamically based on customer type (Retail vs. Mechanic) and brand default selling rates.
- `backend/app/models/expense.py`: Created `Expense` model and `ExpenseCategory` enum (`RENT`, `ELECTRICITY`, `TEA_REFRESHMENT`, `SALARY_WAGES`, `MAINTENANCE`, `TRANSPORT`, `STATIONERY`, `OTHER`) for shop operating overhead.
- `backend/alembic/versions/e7c2a1f4b89d_create_expenses_table.py`: Database migration creating the `expenses` table with indexes on `expense_date`.
- `backend/app/schemas/expense.py`: Pydantic v2 schemas (`ExpenseCreate`, `ExpenseUpdate`, `ExpenseResponse`, `DailyExpenseSummary`).
- `backend/app/repositories/expense_repo.py`: Built `ExpenseRepository` supporting date-filtered queries and category-wise aggregations.
- `backend/app/services/expense_service.py`: Built `ExpenseService` with `get_daily_summary` computing `total_expense`, category breakdown, `total_sales`, and `estimated_profit`.
- `backend/app/api/v1/endpoints/expenses.py`: REST endpoints mounted at `/api/v1/expenses` (`POST`, `GET`, `GET /daily-summary`, `DELETE /{id}`).
- `frontend/src/api/modules/expenses.api.ts`: Modular API client connecting UI to expenses backend routes.
- `frontend/src/components/views/ExpensesView.tsx`: Enterprise expenses management view featuring daily expense KPIs, Today's Sales counter, Net Daily Profit indicator, date picker filter, category filter, expense records table with delete action, and "+ Record Expense" modal.
- `backend/app/schemas/reports.py` & `backend/app/services/report_service.py`: Added `get_weekly_trend()` querying rolling 7-day sales revenue vs inventory purchases (`PURCHASE_IN` volume $\times$ purchase cost) and mounted `GET /api/v1/reports/weekly-trend`.
- `frontend/src/components/layout/GlassHeader.tsx`: Added global instant search autocomplete dropdown matching parts in real time with brand, OEM part number, fitment models, rack location, price, and stock levels.
- `frontend/src/components/layout/GlassHeader.tsx` & `GlassSidebar.tsx`: Added user profile display and instant session Logout action clearing JWT token and resetting app state.

### Fixed
- `frontend/src/components/scanner/MobileScannerModal.tsx`: Fixed pairing URL and QR code resolving to unreachable Docker internal bridge IP (`172.21.0.4:3000`). Automatically enforces fallback to host Wi-Fi LAN IP (`192.168.1.9:3000`), guaranteeing instant mobile phone connectivity over local Wi-Fi.
- `backend/app/api/v1/endpoints/scanner.py`: Ensured `/scanner/network-info` never returns an internal Docker subnet IP (`172.16-31.x.x`), defaulting cleanly to host LAN IP (`192.168.1.9`).
- `frontend/src/components/views/BillingView.tsx`: Fixed default items pre-populating on POS table on every visit; initialized billing cart state with an empty array `useState<BillRow[]>([])`.
- `backend/app/api/v1/endpoints/reports.py`: Expanded `GET /api/v1/reports/daily-sales` authorization role list to include `UserRole.COUNTER_STAFF` (preventing `403 Forbidden` for cashier accounts).
- `frontend/src/components/views/DashboardView.tsx`: Fixed "Today's Sales" and "Total Inventory Valuation" not updating after POS checkout by re-fetching daily reports and recalculating inventory valuation whenever catalog products update.
- `frontend/src/components/views/DashboardView.tsx`: Replaced static mock data in Weekly Sales vs Purchase Trend chart with live API data from `reportsApi.getWeeklyTrend()`.
- `frontend/src/context/ScannerContext.tsx`: Universal, persistent `ScannerProvider` context managing 24/7 background WebSocket connections independent of desktop dialog visibility. Features multi-device staff roster, per-device scan counters, session persistence in `localStorage`, global toast alerts, continuous scan batch tray, and pub/sub `registerBarcodeListener` event bus for all view components.
- `frontend/src/components/scanner/MobileScannerModal.tsx`: Enterprise pairing modal featuring live connection status beacon, dynamic pairing QR code, multi-device live roster displaying connected phones and scan counts, reachable LAN IP selection with Docker internal IP detection/auto-fix, and background persistence notice ("Closing this popup keeps your phone connected").
- `frontend/src/components/layout/GlassHeader.tsx`: Wireless mobile scanner indicator pill with `Smartphone` icon, pulsing emerald beacon, and live count badge showing number of active connected phones.
- `frontend/src/utils/search.ts`: Created `matchScannedCode()` providing robust matching for 2D QR codes and linear barcodes. Handles exact matches, alphanumeric normalization (e.g. `01721-K0L-D00` vs `01721K0LD00`), delimited multi-field QR codes (e.g. `P/N:01721K0LD00;QTY:1`), and manufacturer verification URLs.
- `frontend/src/app/scan/page.tsx`: Created mobile camera barcode scanner web application with high-contrast targeting reticle, audio chime, haptic vibration, 1.8s anti-spam debounce, and continuous session history. Supports unique `device_id` and friendly `device_name` transmission.
- `backend/app/core/websocket.py`: Upgraded `ScannerConnectionManager` with structured multi-client session rooms (`active_sessions: dict[session_id, dict[WebSocket, metadata]]`). Added device registration, per-device scan counters, room roster queries, and automated room-wide `ROSTER_UPDATED` broadcasts.
- `backend/app/api/v1/endpoints/scanner.py`: Added WebSocket bridge route `/api/v1/scanner/ws/{session_id}` and LAN IP discovery route `/network-info`.
- `frontend/src/api/modules/scanner.api.ts`: Modular client service for network discovery, session ID generation, and WebSocket URL building.
- `backend/app/schemas/spare_part.py`: Added `SparePartRestock` schema (`quantity_to_add`, `purchase_price`, `rack_number`).
- `backend/app/services/inventory_service.py`: Added `restock_part()` method with `PURCHASE_IN` immutable audit ledger logging in `stock_movements`.
- `backend/app/api/v1/endpoints/spare_parts.py`: Added `POST /api/v1/parts/{id}/restock` endpoint.
- `frontend/src/components/views/SearchView.tsx`: Implemented dedicated Quick Spares Search view with hero search bar, popular suggestion chips ("Bajaj Pulsar Air filter", "Activa Brake Pad", etc.), and comprehensive part cards displaying Item Name, Price, Supported Models, Supplier Details with purchase discount %, Stock Quantity, and Rack location.
- `backend/app/models/supplier.py`: Created `Supplier` model with business name, contact person, phone, email, address, GSTIN, default purchase discount percentage, and active flag.
- `backend/alembic/versions/a5c007d4e19b_create_suppliers_table_and_add_supplier_.py`: Generated and applied database migration creating `suppliers` table and adding `supplier_id`, `supplier_name`, and `supplier_discount` columns to `spare_parts`.
- `backend/app/schemas/supplier.py`: Pydantic v2 schemas (`SupplierCreate`, `SupplierUpdate`, `SupplierResponse`) with `total_parts_count` aggregation.
- `backend/app/services/supplier_service.py`: Business logic service for supplier lifecycle and querying all spare parts supplied by a specific distributor.
- `backend/app/api/v1/endpoints/suppliers.py`: REST CRUD endpoints and `GET /api/v1/suppliers/{id}/parts`.
- `frontend/src/api/modules/suppliers.api.ts`: Modular API client connecting UI to `/api/v1/suppliers` endpoints.
- `frontend/src/components/views/SuppliersView.tsx`: Completely modernized live view featuring supplier summary KPI cards, "+ Add Supplier" modal, "Edit Supplier" modal, "View Supplied Items" parts drawer with live stock and discount rates, and "Upload Bill" shortcut.
- `frontend/src/utils/search.ts`: Created tokenized search engine with `matchSearchTokens` and automotive domain synonym/stem expansions (`filter`/`filt`, `brake`/`brk`/`pad`/`shoe`, `cushion`/`shock`/`damper`, `clutch`/`clt`, etc.).
- `backend/app/models/brand.py`: Created `Brand` model for genuine and aftermarket spares catalog manufacturers.
- `backend/app/models/mechanic.py`: Created `Mechanic` model and `MechanicBrandCommission` table for per-mechanic, per-brand percentage matrices.
- `backend/alembic/versions/37e4b7e8a237_create_brands_and_mechanics_tables.py`: Database migration creating `brands`, `mechanics`, `mechanic_brand_commissions` and adding `mechanic_id`, `commission_percentage`, `commission_amount` to `sales` and `sale_items`.
- `backend/app/schemas/brand.py` & `backend/app/schemas/mechanic.py`: Complete Pydantic v2 schemas for CRUD operations, date-wise item ledgers, and summary performance KPIs.
- `backend/app/services/brand_service.py` & `backend/app/services/mechanic_service.py`: Business logic layers for brand catalog and mechanic commission calculations.
- `backend/app/api/v1/endpoints/brands.py` & `backend/app/api/v1/endpoints/mechanics.py`: REST endpoints mounted under `/api/v1/brands` and `/api/v1/mechanics`.
- `backend/seed_data.py`: Seeded 10 default genuine/aftermarket brands and 3 mechanic partners with configured brand commission override percentages.
- `frontend/src/api/modules/brands.api.ts` & `frontend/src/api/modules/mechanics.api.ts`: Modular API clients with TypeScript contracts and adapters.
- `frontend/src/components/views/InventoryView.tsx`: Added Edit Part modal for modifying stock, pricing, and locations, plus Brands Master drawer/modal.
- `frontend/src/components/views/BillingView.tsx`: Added interactive bike model search autocomplete (e.g. typing "Pulsar 150", "Splendor Plus") and live mechanic brand commission calculation.
- `frontend/src/components/views/MechanicsView.tsx`: Integrated live mechanic partner management, brand percentage override matrix, and date-wise parts/commission audit ledger.
- `docs/requirement.md`: Documented business requirements, user stories, and acceptance criteria for brands, mechanic commissions, date-wise ledgers, and search filters.

### Updated
- `backend/app/api/v1/endpoints/scanner.py`: Upgraded `/scanner/network-info` to strictly filter out internal Docker bridge subnets (`172.16.x.x - 172.31.x.x`) and loopback addresses, prioritizing physical LAN IPs (`192.168.1.9`) configured via `HOST_LAN_IP`.
- `frontend/src/context/ScannerContext.tsx`: Purged cached Docker bridge IPs from browser `localStorage`, excluded Docker virtual bridge subnets from backend network discovery, and defaulted mobile pairing URLs to host Wi-Fi LAN IP (`192.168.1.9:3000`).
- `frontend/src/components/views/SearchView.tsx`: Integrated `useScannerSession()` hook, removed duplicate scanner modal block, wired `clearScannedBatch`, and enabled continuous search/restock updates from background scans.
- `frontend/src/components/views/BillingView.tsx`: Integrated `registerBarcodeListener` so any scan from a connected smartphone instantly appends the item to the active bill or increments its quantity on the POS screen. Added mobile scanner trigger button in search bar.
- `frontend/src/components/views/InventoryView.tsx`: Unified with global `ScannerContext`, removed duplicate local WebSocket connection and modal, and added floating active scan banner for instant barcode auto-population in Add/Edit modals and direct item barcode assignment.
- `docs/backend-architecture.md` and `docs/docker-architecture.md`: Documented the pinned Excel-import dependency and the backend image rebuild procedure for dependency changes.
- `frontend/src/types/index.ts`: Added `"Search"` to `NavigationSection`.
- `frontend/src/components/layout/GlassSidebar.tsx`: Added dedicated `Search` navigation tab with icon and "Fast" badge right below Dashboard.
- `frontend/src/app/page.tsx`: Integrated `SearchView` component into the App Router view switcher.
- `docs/ui-architecture.md`: Updated Section 3 Mermaid diagram, directory responsibility ledger, `NavigationSection` model, and page hierarchy table.
- `docs/frontend-development-milestones.md`: Added Milestone F9 tracking dedicated Quick Spares Search Tab and card lookup.
- `backend/app/models/spare_part.py`: Added `supplier_id` foreign key (`SET NULL` on delete), `supplier_name` cached column, and `supplier_discount` purchase discount percentage.
- `backend/app/services/import_service.py`: Extended `import_parts_from_excel()` to link incoming items to selected wholesale suppliers, calculate cost based on supplier discount, and map brand overrides.
- `backend/app/services/inventory_service.py`: Enhanced manual part creation to look up supplier defaults when creating parts under a supplier.
- `backend/app/api/v1/endpoints/imports.py`: Updated `POST /api/v1/imports/parts-excel` to accept `supplier_id`, `brand_name`, and `default_supplier_discount` form fields.
- `backend/app/api/v1/endpoints/spare_parts.py`: Added `supplier_id` query filter parameter and enabled Counter Staff to update part records.
- `frontend/src/components/views/InventoryView.tsx`: Integrated Supplier filter dropdown, "Supplier & Disc" table column, supplier selection in Add/Edit part modals, and Excel upload with supplier selection.
- `frontend/src/types/index.ts`: Extended `SparePart` and `Supplier` TypeScript interfaces with supplier attributes.
- `frontend/src/api/modules/parts.api.ts` & `frontend/src/api/modules/imports.api.ts`: Updated to pass supplier parameters in Excel imports and catalog fetches.
- `backend/seed_data.py`: Seeded 3 wholesale distributor partners (Kalyani Honda, Om Sai Auto Spares, National Hero) and linked 98 initial parts with supplier discounts.
- `backend/app/repositories/spare_part_repo.py`: Implemented tokenized multi-attribute search in `search_parts()` with SQL `AND` joining across terms and domain synonym expansions matching across item name, OEM part number, bike model, brand, model number, and barcode.
- `backend/app/api/v1/endpoints/spare_parts.py`: Opened `PUT /api/v1/parts/{id}` to counter staff roles and extended query limit up to 500.
- `frontend/src/api/modules/parts.api.ts`: Increased catalog fetch limit to 500 items for zero-latency client-side token search.
- `frontend/src/components/views/InventoryView.tsx`: Replaced exact substring filtering with `matchSearchTokens` across name, brand, part number, model, bike model, rack, and barcode.
- `frontend/src/components/views/BillingView.tsx`: Integrated `matchSearchTokens` for autocomplete suggestions and instant Enter-key part resolution for multi-word queries.
- `backend/app/models/sale.py`: Added `mechanic_id` FK on `Sale` and `SaleItem`, plus line-item `commission_percentage` and `commission_amount`.
- `backend/app/services/billing_service.py`: Enhanced atomic checkout engine to look up mechanic brand percentage overrides and record line-item commission amounts.
- `docker-compose.yml`: Configured `build.args` with `NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:8001/api/v1}` and aligned environment default port to 8001.
- `frontend/Dockerfile`: Added `ARG NEXT_PUBLIC_API_URL` and `ENV NEXT_PUBLIC_API_URL` into Stage 2 builder for Next.js build-time inlining into client bundles.
- `docs/docker-architecture.md`: Updated Section 4.1 frontend container specs and added Section 6.5 operational guide for rebuilding the frontend container after source code changes.
- `docs/database-design.md`: Documented `brands`, `mechanics`, `mechanic_brand_commissions` tables, new sale columns, and updated ER diagrams.
- `docs/api-reference.md`: Documented Brands Master API, Mechanics & Commissions API, Part update endpoint, billing checkout commission payloads, and tokenized search query semantics.

### Fixed
- `frontend/src/app/scan/page.tsx`: Fixed mobile browser camera block on unencrypted HTTP (`navigator.mediaDevices.getUserMedia is undefined` on mobile Wi-Fi IP). Integrated HTML5 native camera photo snap (`capture="environment"`) with `@zxing/browser` (`BrowserMultiFormatReader`) client-side decoding, enabling 100% of smartphones to snap and transmit barcodes immediately without SSL or certificates. Added in-app guidance for Android Chrome continuous live stream flag.
- `backend/app/api/v1/endpoints/scanner.py`: Resolved Docker container bridge IP issue (`172.21.0.4 ERR_CONNECTION_TIMED_OUT`) where internal container network was broadcast to mobile devices instead of the host machine's physical Wi-Fi/LAN IP (`192.168.1.9`). Added `HOST_LAN_IP` environment variable support and Docker subnet detection.
- `frontend/src/components/views/SearchView.tsx` & `frontend/src/components/views/InventoryView.tsx`: Enhanced QR pairing modal with editable Host PC Wi-Fi IP input, Docker internal subnet detection alert, quick presets (`[192.168.1.9]`, `[localhost]`), and persistent `localStorage` caching so phones on Wi-Fi connect reliably.
- `backend/Dockerfile` & `backend/requirements.txt`: Rebuilt backend container image with pinned `openpyxl==3.1.5` resolving `ModuleNotFoundError` during container recreation.
- `frontend/src/components/views/InventoryView.tsx`: Fixed duplicate try/catch code block in `handleFileChange` preventing Next.js Webpack compilation.
- `frontend/src/types/index.ts` & `frontend/src/data/mock-data.ts`: Resolved TypeScript property requirement conflict on `Supplier.phone` allowing clean static build.
- `backend/alembic/versions/a5c007d4e19b_create_suppliers_table_and_add_supplier_.py`: Added `server_default="0.00"` on `spare_parts.supplier_discount` preventing null value constraint violation on existing rows during database migration.

## 2026-11-25

### Added
- `frontend/src/components/views/LoginView.tsx`: Implemented dedicated Liquid Glass counter authentication screen with real API sign-in, quick demo credentials, and session feedback.
- `frontend/src/api/modules/auth.api.ts`: Modular authentication API service managing OAuth2 token exchange and `/auth/me` profile lookups.
- `docs/frontend-development-milestones.md`: Established dedicated frontend UI integration milestones roadmap, living code ledger, and zero-mock verification curriculum.
- `frontend/src/api/client.ts`: Implemented centralized HTTP fetch client with automated query string formatting, JWT token injection from `localStorage`, and standardized error handling.
- `frontend/src/api/modules/parts.api.ts`: Modular spare parts API service with catalog search, barcode scanning, and snake_case to camelCase adapter mapping.
- `frontend/src/api/modules/billing.api.ts`: Modular billing API service for counter checkouts and invoice retrieval.
- `frontend/src/api/modules/imports.api.ts`: Modular Excel bulk import API service handling multipart FormData uploads.
- `frontend/src/api/modules/reports.api.ts`: Modular business analytics API service for daily sales reconciliation, item velocity, and low-stock alerts.
- `frontend/src/api/index.ts`: Central barrel export file exporting all domain APIs and TypeScript contracts.
- `backend/app/models/sale.py`: Implemented `Sale` invoice entity and `SaleItem` line-items with `PaymentMethod` enum (`CASH`, `CARD`, `UPI`, `CREDIT`) and cascade lifecycle management.
- `backend/app/models/stock_movement.py`: Implemented `StockMovement` immutable audit ledger model and `StockMovementType` enum (`SALE_OUT`, `PURCHASE_IN`, `RETURN_IN`, `ADJUSTMENT`).
- `backend/alembic/versions/f8446218d474_create_sales_and_stock_movements_tables.py`: Generated and applied database migration creating `sales`, `sale_items`, and `stock_movements` tables in PostgreSQL.
- `backend/app/schemas/billing.py`: Implemented Pydantic v2 schemas (`CartItemInput`, `CheckoutRequest`, `SaleItemResponse`, `InvoiceResponse`) for POS checkout transactions and invoice rendering.
- `backend/app/services/billing_service.py`: Implemented core atomic POS checkout engine featuring PostgreSQL row-level locking (`with_for_update()`), inventory validation and decrementing, 18% GST calculation, immutable audit ledger tracking, and atomic rollback guarantees.
- `backend/app/api/v1/endpoints/billing.py`: Implemented POS billing endpoints (`POST /api/v1/billing/checkout` and `GET /api/v1/billing/invoices/{invoice_id}`) guarded by JWT authentication.
- `backend/requirements.txt`: Added `openpyxl==3.1.5` for lightweight Excel (.xlsx) parsing.
- `backend/app/schemas/imports.py`: Pydantic schemas for Excel bulk imports (`ImportSummaryResponse`, `RowErrorDetail`).
- `backend/app/schemas/reports.py`: Pydantic schemas for business intelligence reports (`DailySalesSummary`, `PaymentBreakdown`, `TopSellingPart`, `LowStockItem`).
- `backend/app/services/import_service.py`: Bulk catalog import service validating Excel headers, detecting database and batch duplicates, creating parts, and writing opening stock movements.
- `backend/app/api/v1/endpoints/imports.py`: REST endpoint for bulk importing parts from `.xlsx` files (`POST /api/v1/imports/parts-excel`).
- `backend/app/services/report_service.py`: Business analytics service generating daily sales reconciliation, payment channel totals, top-selling parts, and low-stock alerts.
- `backend/app/api/v1/endpoints/reports.py`: REST endpoints for daily sales settlement, item velocity, and stock health audits (`/api/v1/reports/*`).
- `docs/api-reference.md`: Added Section 5 (Excel Bulk Imports) and Section 6 (Business Reports & Analytics) specifications.

### Updated
- `frontend/src/components/views/BillingView.tsx`: Integrated live barcode gun scanner lookup via `partsApi.getByBarcode` and atomic checkout execution with `billingApi.checkout`.
- `frontend/src/components/views/InventoryView.tsx`: Integrated real Excel bulk upload via `importsApi.uploadCatalogExcel` and manual spare part creation modal using `partsApi.create`.
- `frontend/src/components/views/DashboardView.tsx`: Connected live daily sales reconciliation and top-selling fast movers to `reportsApi.getDailySales` and `reportsApi.getTopSelling`.
- `frontend/src/components/views/ReportsView.tsx`: Replaced mock alert dialogs with interactive inspection modals for daily sales reconciliation and real-time low-stock audits.
- `frontend/src/app/page.tsx`: Implemented global catalog synchronization callbacks and authentication session gate.
- `backend/app/models/__init__.py`: Registered `Sale`, `SaleItem`, `PaymentMethod`, `StockMovement`, and `StockMovementType`.
- `backend/app/api/v1/router.py`: Mounted `billing.router` under `/api/v1/billing`, `imports.router` under `/api/v1/imports`, and `reports.router` under `/api/v1/reports`.
- `docs/development-milestones.md`: Marked Milestone 5 & 6 as Completed, documented complete source code and architectural explanations, and marked Milestone 7 as Active.
- `docs/database-design.md`: Added detailed schema definitions for `sales`, `sale_items`, and `stock_movements`.
- `docs/backend-architecture.md`: Updated milestone status roadmap to reflect Milestone 6 completion and Milestone 7 activation.

---

## 2026-11-24

### Added
- `backend/app/schemas/spare_part.py`: Implemented Pydantic v2 schemas for spare parts (`SparePartCreate`, `SparePartUpdate`, `SparePartResponse`, and `PaginatedSpareParts`).
- `backend/app/repositories/base.py`: Built generic asynchronous repository (`BaseRepository[ModelType]`) providing reusable CRUD operations across all domain entities.
- `backend/app/repositories/spare_part_repo.py`: Implemented `SparePartRepository` featuring case-insensitive multi-field search (`ilike`), brand filtering, barcode scanning, and low-stock queries.
- `backend/app/services/inventory_service.py`: Implemented business logic service for catalog management, duplicate barcode/part number validation, and stock adjustments.
- `backend/app/api/v1/endpoints/spare_parts.py`: REST endpoints for creating, searching, updating, and barcode-scanning spare parts with role-based guards.

### Updated
- `backend/app/api/v1/router.py`: Registered `spare_parts.router` under `/api/v1/parts`.
- `docs/development-milestones.md`: Marked Milestone 4 as Completed, added complete source code, architectural reasoning, and marked Milestone 5 as Active.

---

## 2026-11-23

### Added
- `docs/api-reference.md`: Documented Spare Parts catalog endpoints (`/api/v1/parts`), barcode gun scanner lookup, and low-stock filtering.
- `backend/app/core/security.py`: Password hashing with bcrypt (`pwd_context`) and cryptographic JWT token creation (`create_access_token`).
- `backend/app/schemas/user.py` & `backend/app/schemas/auth.py`: Pydantic request and response DTOs for user registration, profile retrieval, and OAuth2 token issuance.
- `backend/app/api/deps.py`: FastAPI Dependency Injection for JWT authentication (`get_current_user`), `OAuth2PasswordBearer`, and role-based access control guards (`require_role`).
- `backend/app/api/v1/endpoints/auth.py`: Implemented `/register`, `/login`, and `/me` authentication endpoints.
- `backend/app/api/v1/router.py`: Centralized v1 API router mounting all modular domain endpoints.
- `backend/alembic/versions/5a6b63d2eae3_create_users_and_spare_parts_tables.py`: Initial database migration script for `users` and `spare_parts` tables.
- `docs/api-reference.md`: Documented REST API contracts, request/response DTOs, and error schemes for authentication endpoints (`/register`, `/login`, `/me`).
- `docs/development-milestones.md`: Created master milestone learning roadmap, detailed per-milestone file inventories, live progress tracker, and complete code-change ledger documenting all source code and engineering rationale.
- `docs/database-design.md`: Created detailed PostgreSQL database architecture, ER diagrams, indexing strategies, and table specifications for `users` and `spare_parts`.
- `backend/app/core/database.py`: Implemented asynchronous SQLAlchemy 2.0 connection engine, sessionmaker, and `get_db` FastAPI dependency with connection healthchecks.

### Fixed
- `backend/app/core/security.py`: Refactored password hashing to use direct `bcrypt` (`hashpw`/`checkpw`), eliminating the infamous legacy `passlib` wrap-bug (`ValueError: password cannot be longer than 72 bytes`) on modern bcrypt versions.
- `backend/app/schemas/user.py`: Replaced `EmailStr` with standard `str` to eliminate external `email-validator` runtime dependency crashes during Uvicorn reload.

### Updated
- `frontend/src/components/views/BillingView.tsx`: Integrated live barcode gun scanner lookup via `partsApi.getByBarcode` and atomic checkout execution with `billingApi.checkout`.
- `frontend/src/components/views/InventoryView.tsx`: Integrated real Excel bulk upload via `importsApi.uploadCatalogExcel` and manual spare part creation modal using `partsApi.create`.
- `frontend/src/components/views/DashboardView.tsx`: Connected live daily sales reconciliation and top-selling fast movers to `reportsApi.getDailySales` and `reportsApi.getTopSelling`.
- `frontend/src/components/views/ReportsView.tsx`: Replaced mock alert dialogs with interactive inspection modals for daily sales reconciliation and real-time low-stock audits.
- `frontend/src/app/page.tsx`: Implemented global catalog synchronization callbacks and authentication session gate.
- `backend/app/main.py`: Mounted `api_router` under `/api/v1` and connected the `/health` endpoint to the live PostgreSQL container.
- `docs/development-milestones.md`: Updated code ledger with complete source code and technical documentation for Milestone 3.
- `AGENTS.md`: Integrated `docs/development-milestones.md` into project structure and defined documentation ownership policies.

---

## 2026-11-22

### Added
- `docs/backend-architecture.md`: Created FastAPI Clean Layered Architecture specification, pedagogical learning principles, and complete 8-Milestone development roadmap with progress tracking.
- `backend/Dockerfile`: Lightweight Python 3.12 Linux container for FastAPI with live reload and layer-cached pip installation.
- `backend/requirements.txt`: Initialized Python dependencies for FastAPI, SQLAlchemy async, asyncpg, Alembic, Pydantic, and security modules.
- Virtual environment setup (`.venv`) for isolated local backend execution.

### Updated
- `frontend/src/components/views/BillingView.tsx`: Integrated live barcode gun scanner lookup via `partsApi.getByBarcode` and atomic checkout execution with `billingApi.checkout`.
- `frontend/src/components/views/InventoryView.tsx`: Integrated real Excel bulk upload via `importsApi.uploadCatalogExcel` and manual spare part creation modal using `partsApi.create`.
- `frontend/src/components/views/DashboardView.tsx`: Connected live daily sales reconciliation and top-selling fast movers to `reportsApi.getDailySales` and `reportsApi.getTopSelling`.
- `frontend/src/components/views/ReportsView.tsx`: Replaced mock alert dialogs with interactive inspection modals for daily sales reconciliation and real-time low-stock audits.
- `frontend/src/app/page.tsx`: Implemented global catalog synchronization callbacks and authentication session gate.
- `README.md`: Updated local quick start guide to reflect the activated FastAPI backend on port 8001 and streamlined post-restart Docker startup instructions.
- `docker-compose.yml`: Activated `backend` service with volume mount (`./backend:/app`) for real-time development hot-reloading and remapped host port to 8001 to prevent host port 8000 collisions.
- `.env`: Configured `BACKEND_PORT=8001` and updated `NEXT_PUBLIC_API_URL` to point to port 8001.
- `docs/docker-architecture.md`: Updated architecture diagrams and service specifications to reflect active backend container topology.

---

## 2026-11-20

### Added
- Root `README.md` containing full local environment execution guide (Docker and native bare-metal), required software prerequisites, project structure overview, and architecture highlights.
- Multi-stage production `frontend/Dockerfile` leveraging `node:20-alpine` with 3-stage isolation (`deps`, `builder`, `runner`) and non-root execution (`nextjs:nodejs` UID/GID 1001).
- `frontend/.dockerignore` file excluding `node_modules`, `.next`, cache, local environment files, and logs from container contexts.
- Root `docker-compose.yml` orchestrating `frontend`, `postgres` (PostgreSQL 16 Alpine with healthcheck and persistent volume), and profile-gated `backend` service (`profiles: ["backend", "full"]`).
- Root `.env.example` template covering frontend, postgres, and backend configuration variables.
- `docs/docker-architecture.md` detailing multi-stage container build flows, networking, security policies, volume mappings, and operational CLI runbooks.
- `docs/deployment.md` detailing production deployment topologies, CI/CD pipelines, reverse proxy configurations (Nginx/Caddy), automated backup scripts, and rollback procedures.

### Updated
- `frontend/src/components/views/BillingView.tsx`: Integrated live barcode gun scanner lookup via `partsApi.getByBarcode` and atomic checkout execution with `billingApi.checkout`.
- `frontend/src/components/views/InventoryView.tsx`: Integrated real Excel bulk upload via `importsApi.uploadCatalogExcel` and manual spare part creation modal using `partsApi.create`.
- `frontend/src/components/views/DashboardView.tsx`: Connected live daily sales reconciliation and top-selling fast movers to `reportsApi.getDailySales` and `reportsApi.getTopSelling`.
- `frontend/src/components/views/ReportsView.tsx`: Replaced mock alert dialogs with interactive inspection modals for daily sales reconciliation and real-time low-stock audits.
- `frontend/src/app/page.tsx`: Implemented global catalog synchronization callbacks and authentication session gate.
- `AGENTS.md`: Integrated `README.md` governance, ownership specification, and added verification check to the task completion checklist ensuring setup instructions remain synchronized with implementation.
- `frontend/next.config.ts`: Configured `output: "standalone"` to bundle traced production dependencies into `.next/standalone`, reducing container size to ~120 MB.
- `frontend/package.json`: Updated `dev` and `build` scripts with `--webpack` flag to resolve Next.js 16 child process IPC timeout bug on Windows.
- `frontend/postcss.config.mjs`: Added PostCSS configuration utilizing `@tailwindcss/postcss` plugin.
- `frontend/src/app/globals.css`: Corrected invalid CSS shorthand background property declarations causing style parsing regressions.
- `frontend/src/components/views/DashboardView.tsx`: Initialized date state inside `useEffect` hook to prevent client-side prerender caching errors.
- `docs/ui-architecture.md`: Comprehensive Principal Software Architect audit and Mermaid diagrams mapping actual folder structure, route hierarchy, component dependencies, state stores, and architectural gaps.
- `docs/ui-design.md`: Complete Liquid Glass Design System documentation covering optical token layers, backdrop-filter standards, accessibility contracts, and component catalogs.

---

## 2026-11-19

### Added
- Enterprise Liquid Glass UI component architecture in `frontend/src/components/ui/` (`GlassCard`, `GlassButton`, `GlassInput`, `GlassBadge`, `GlassSelect`, `GlassModal`, `GlassTable`).
- POS Counter Dashboard layout, Quick Billing POS view, and responsive Sidebar navigation with collapsible state in `frontend/src/components/layout/`.
- Mock business domain data models in `frontend/src/data/mockData.ts` for parts catalog, recent bills, GST tiers, and stock alerts.
