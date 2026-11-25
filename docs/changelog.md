# Changelog

All notable changes to the PartShop project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and follows the governance instructions established in `AGENTS.md`.

---

## 2026-11-26

### Added
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
