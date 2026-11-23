# Changelog

All notable changes to the PartShop project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and follows the governance instructions established in `AGENTS.md`.

---

## 2026-11-23

### Added
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
