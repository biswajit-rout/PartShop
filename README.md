# PartShop — Motorcycle & Auto Spare Parts Management System

> **Enterprise Point-of-Sale (POS), Inventory Control, and Counter Billing Platform** built with **Next.js 16 (App Router)**, **Liquid Glass UI Architecture**, and containerized with **Docker & Docker Compose**.

---

## 1. System Requirements & Prerequisites

Before installing and running PartShop, ensure your development machine meets the following prerequisites depending on your preferred execution method.

### Recommended System Specifications
- **Operating System**: Windows 10/11 (with WSL2 enabled if using Docker Desktop), macOS (Apple Silicon or Intel), or Linux (Ubuntu 22.04+ recommended)
- **RAM**: Minimum 8 GB (16 GB recommended when running Docker Compose)
- **Disk Space**: At least 5 GB free disk space

### Software Requirements

#### Mode A: Docker Containerized (Recommended — Zero-Config)
If you run the application using Docker, all runtime dependencies (Node.js, PostgreSQL, etc.) are encapsulated inside containers. You only need:
- **[Docker Engine](https://docs.docker.com/engine/install/)** (v24.0 or higher) or **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (v4.20 or higher)
- **[Docker Compose v2](https://docs.docker.com/compose/)** (bundled with Docker Desktop or available via `docker compose` CLI plugin)
- **[Git](https://git-scm.com/)** (v2.30 or higher)

#### Mode B: Native / Bare-Metal Local Development
If you prefer running services directly on your host machine without Docker:
- **[Node.js](https://nodejs.org/)**: v20 LTS (`v20.x.x`) recommended (v18.18+ supported)
- **[npm](https://www.npmjs.com/)**: v10.x.x (bundled with Node.js) or `pnpm` / `yarn`
- **[PostgreSQL](https://www.postgresql.org/download/)**: v16.x (or run PostgreSQL via Docker on port `5432`)
- **[Python](https://www.python.org/downloads/)**: v3.12+ (required once the FastAPI backend is added)
- **[Git](https://git-scm.com/)**: v2.30 or higher

---

## 2. Quick Start: Running the Application Locally

### Option A: Running with Docker (Recommended)

Docker Compose provides a single-command setup that starts the Next.js frontend and PostgreSQL database with persistent volume storage.

#### 1. Clone the Repository
```bash
git clone https://github.com/your-username/partshop.git
cd partshop
```

#### 2. Configure Environment Variables
Create your local `.env` configuration file from the provided template:
```bash
# On Linux/macOS
cp .env.example .env

# On Windows (PowerShell)
Copy-Item .env.example .env
```
*(Default values in `.env.example` are pre-configured for instant local development).*

#### 3. Start the Application
Run Docker Compose in detached mode:
```bash
docker compose up -d --build
```

> **Note on Backend Integration**:  
> The FastAPI backend service in `docker-compose.yml` is configured with Docker Compose profiles (`profiles: ["backend", "full"]`). This allows `docker compose up` to spin up the **Frontend** and **PostgreSQL** immediately without failing while the backend codebase is being initialized.

#### 4. Access the Services
- **Frontend Web UI**: [http://localhost:3000](http://localhost:3000)
- **PostgreSQL Database**: `localhost:5432`  
  - Database: `partshop_db`  
  - User: `partshop_user`  
  - Password: `partshop_secret_change_me`

#### 5. Useful Docker Commands
```bash
# View live container logs
docker compose logs -f

# Check container health and status
docker compose ps

# Stop containers
docker compose stop

# Tear down containers (preserving database volume)
docker compose down

# Tear down containers and wipe database volume (clean reset)
docker compose down -v
```

---

### Option B: Running Locally (Native / Bare Metal)

If you are developing frontend components and want instant hot-reloading outside containers:

#### 1. Navigate to the Frontend Directory
```bash
cd frontend
```

#### 2. Install Node Dependencies
```bash
npm install
```

#### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

#### 4. Building and Testing Production Builds Locally
```bash
# Create optimized production build
npm run build

# Start local production standalone server
npm run start
```

---

## 3. Project Structure

```text
PartShop/
├── frontend/               # Next.js 16 Application (App Router, Liquid Glass UI)
│   ├── src/
│   │   ├── app/            # App Router routes and root layouts
│   │   ├── components/     # UI design system and domain view modules
│   │   │   ├── layout/     # TopNav, Sidebar navigation, Shell wrappers
│   │   │   ├── ui/         # Enterprise Liquid Glass primitives (GlassCard, etc.)
│   │   │   └── views/      # Counter Dashboard, POS Billing, Inventory views
│   │   ├── data/           # Mock domain datasets and type contracts
│   │   └── types/          # Global TypeScript interfaces
│   ├── Dockerfile          # Multi-stage production container build (deps, builder, runner)
│   ├── .dockerignore       # Docker ignore rules
│   └── package.json        # Frontend scripts and dependencies
│
├── backend/                # Planned FastAPI Application (REST API, Python 3.12)
│
├── docs/                   # Synchronized System Documentation
│   ├── requirements.md     # Business requirements & domain specifications
│   ├── ui-architecture.md  # Frontend component hierarchy & routing architecture
│   ├── ui-design.md        # Liquid Glass Design System tokens & guidelines
│   ├── backend-architecture.md # FastAPI service architecture (target)
│   ├── docker-architecture.md  # Container topology, networks & volumes
│   ├── deployment.md       # Production hosting, CI/CD, backup & rollback
│   ├── database-design.md  # Database schema & entity relationships
│   ├── api-reference.md    # API contracts & schemas
│   └── changelog.md        # Historical change log
│
├── docker-compose.yml      # Multi-container orchestration (Frontend, Postgres, Backend)
├── .env.example            # Environment variables configuration template
├── README.md               # Quick start guide and software prerequisites
└── AGENTS.md               # Strict developer & AI agent governance instructions
```

---

## 4. Key Architectural Highlights

- **Liquid Glass Design System**: Deep slate backdrop, translucent optical layers (`backdrop-blur-md`), specular white borders (`border-white/10`), and neon brand accents engineered for high-visibility garage and counter environments.
- **Ultra-Lightweight Standalone Next.js**: Production Docker images leverage Next.js standalone dependency tracing, shrinking runtime images from ~1 GB to **~120 MB**.
- **Non-Root Container Security**: Docker runner containers execute strictly under unprivileged users (`nextjs:nodejs`, UID 1001).
- **Documentation-First Governance**: All structural changes, setups, and new components must remain strictly synchronized with documentation according to rules defined in `AGENTS.md`.

---

## 5. Development & Contribution Governance

Whenever you make changes to:
1. **Running or Setting Up the Application** (new scripts, Node versions, Docker parameters, environment variables):
   - **MUST update** this `README.md` file immediately.
2. **Docker or Container Configurations**:
   - **MUST update** `docs/docker-architecture.md` and `docs/deployment.md`.
3. **UI Components or Styling**:
   - **MUST update** `docs/ui-design.md` and `docs/ui-architecture.md`.
4. **Completed Work**:
   - **MUST record entries in** `docs/changelog.md`.

See [AGENTS.md](AGENTS.md) for complete operating standards.
