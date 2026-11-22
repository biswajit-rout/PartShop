# PartShop — Docker Architecture Specification

> **Document Purpose**: Technical architecture specification for container design, orchestration, volume management, and deployment topology.  
> **Source of Truth**: Active codebase (`d:/Programming/PartShop`)  
> **Governance**: Maintained according to rules established in `AGENTS.md`.  
> **Last Updated**: 2026-11-20  

---

## 1. Architectural Overview & Design Principles

PartShop uses a **micro-service container topology** managed via Docker Compose. The architecture is engineered around three primary design tenets:

1. **Ultra-Lightweight Next.js Standalone Packaging**:
   Instead of bundling complete development trees or full `node_modules` (~1 GB), Next.js 16 is compiled with `output: "standalone"`. Next.js traces all dependency trees and produces a minimal `server.js` runner, reducing final production container image sizes to **~120 MB**.
2. **Defensive Non-Root Container Security**:
   The runtime container executes as an unprivileged system user (`nextjs:nodejs`, UID/GID 1001), preventing container breakout or unauthorized host escalation.
3. **Graceful Backend Deferral (Profile-Based Orchestration)**:
   Because the FastAPI backend (`./backend`) is scheduled for subsequent development, Docker Compose employs profile gates (`profiles: ["backend", "full"]`). This allows running `docker compose up` immediately to spin up the **Frontend** and **PostgreSQL** database without failing due to a missing backend directory.

---

## 2. Container Architecture & Topology Diagram

The following diagram details the active container topology, networks, port exposures, and persistent storage volumes:

```mermaid
flowchart TD
    subgraph HostSystem["Host Operating System (Development / VPS / Cloud VM)"]
        HostPort3000["Host Port 3000"]
        HostPort5432["Host Port 5432"]
        HostPort8000["Host Port 8000 (Planned)"]
    end

    subgraph BridgeNetwork["Docker Network: partshop-network (Bridge)"]
        subgraph FrontendService["Container: partshop-frontend"]
            NextServer["Node 20 Alpine Runner<br/>User: nextjs (UID 1001)<br/>Next.js 16 Standalone (Port 3000)"]
        end

        subgraph PostgresService["Container: partshop-postgres"]
            PGCore["PostgreSQL 16 Alpine Server<br/>Port 5432<br/>User: partshop_user"]
            HealthCheck["Healthcheck Process<br/>pg_isready -U partshop_user"]
        end

        subgraph BackendService["Container: partshop-backend (Profile: backend/full)"]
            FastAPICore["FastAPI Python 3.12 Server<br/>Uvicorn ASGI (Port 8000)"]
        end
    end

    subgraph PersistentVolumes["Host Storage / Docker Volumes"]
        PGVolume[("Volume: partshop-pgdata<br/>Mount: /var/lib/postgresql/data")]
    end

    HostPort3000 -->|Expose| NextServer
    HostPort5432 -->|Expose| PGCore
    HostPort8000 -.->|Future Expose| FastAPICore

    PGCore <--> PGVolume
    PGCore --- HealthCheck

    %% Inter-service communication
    NextServer -.->|HTTP / REST (Planned)| FastAPICore
    FastAPICore -.->|SQLAlchemy TCP:5432| PGCore

    classDef active fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
    classDef planned fill:#1e1b4b,stroke:#a855f7,stroke-dasharray: 5 5,stroke-width:2px,color:#cbd5e1;
    classDef storage fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#ecfdf5;
    
    class NextServer,PGCore,HealthCheck active;
    class FastAPICore planned;
    class PGVolume storage;
```

---

## 3. Frontend Multi-Stage Build Strategy

The frontend image is constructed in three isolated stages defined in `frontend/Dockerfile`:

```mermaid
flowchart LR
    subgraph Stage1["Stage 1: deps"]
        Alpine1["node:20-alpine"]
        NPMCI["npm ci<br/>(Caches node_modules)"]
        Alpine1 --> NPMCI
    end

    subgraph Stage2["Stage 2: builder"]
        Alpine2["node:20-alpine"]
        BuildRun["npm run build<br/>(Generates .next/standalone)"]
        Alpine2 --> BuildRun
    end

    subgraph Stage3["Stage 3: runner"]
        Alpine3["node:20-alpine"]
        Security["addgroup/adduser nextjs (1001)"]
        CopyArtifacts["Copy standalone + static + public"]
        Exec["CMD: node server.js"]
        Alpine3 --> Security --> CopyArtifacts --> Exec
    end

    NPMCI -->|node_modules| BuildRun
    BuildRun -->|.next/standalone & .next/static| CopyArtifacts

    classDef stage fill:#0f172a,stroke:#38bdf8,stroke-width:1.5px,color:#f8fafc;
    class Stage1,Stage2,Stage3 stage;
```

### Stage Responsibilities

1. **Stage 1 (`deps`)**:
   - Base: `node:20-alpine` with `libc6-compat`.
   - Copies `package.json` and `package-lock.json`.
   - Executes `npm ci` to produce clean, deterministic dependency trees.
2. **Stage 2 (`builder`)**:
   - Ingests cached `node_modules` from Stage 1.
   - Copies source code.
   - Runs `npm run build` using the Webpack pipeline, outputting pre-traced standalone bundles to `.next/standalone`.
3. **Stage 3 (`runner`)**:
   - Contains **no development tools or global node_modules**.
   - Creates a non-root system user (`nextjs:nodejs`).
   - Copies only three essential targets:
     - `public/` (static SVGs and icons).
     - `.next/standalone/` (traced minimal application server).
     - `.next/static/` (client JavaScript and compiled CSS bundles).
   - Starts via `node server.js` bound to `0.0.0.0:3000`.

---

## 4. Container Inventory & Specifications

### 4.1 Service: `frontend`
- **Build Context**: `./frontend`
- **Dockerfile**: `./frontend/Dockerfile`
- **Internal Port**: `3000`
- **Host Port**: `${FRONTEND_PORT:-3000}`
- **Restart Policy**: `unless-stopped`
- **User**: `nextjs` (UID 1001)
- **Environment Variables**:
  - `NODE_ENV`: `production`
  - `PORT`: `3000`
  - `HOSTNAME`: `0.0.0.0`
  - `NEXT_PUBLIC_API_URL`: `${NEXT_PUBLIC_API_URL:-http://localhost:8000/api/v1}`

### 4.2 Service: `postgres`
- **Image**: `postgres:16-alpine`
- **Internal Port**: `5432`
- **Host Port**: `${POSTGRES_PORT:-5432}`
- **Restart Policy**: `unless-stopped`
- **Volume**: `pgdata:/var/lib/postgresql/data`
- **Environment Variables**:
  - `POSTGRES_USER`: `${POSTGRES_USER:-partshop_user}`
  - `POSTGRES_PASSWORD`: `${POSTGRES_PASSWORD:-partshop_secret}`
  - `POSTGRES_DB`: `${POSTGRES_DB:-partshop_db}`
  - `PGDATA`: `/var/lib/postgresql/data/pgdata`
- **Healthcheck Configuration**:
  ```yaml
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-partshop_user} -d ${POSTGRES_DB:-partshop_db}"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 10s
  ```

### 4.3 Service: `backend` (FastAPI — Planned / Deferred)
- **Build Context**: `./backend`
- **Dockerfile**: `./backend/Dockerfile`
- **Internal Port**: `8000`
- **Host Port**: `${BACKEND_PORT:-8000}`
- **Activation Mode**: Controlled by Docker Compose profiles:
  ```yaml
  profiles:
    - backend
    - full
  ```
  *Note*: When `./backend` is implemented, run `docker compose --profile full up` to include the API service in the container fleet.

---

## 5. Storage & Volume Management

| Volume Name | Driver | Container Mount Target | Purpose | Backup Strategy |
| :--- | :--- | :--- | :--- | :--- |
| `partshop-pgdata` | `local` | `/var/lib/postgresql/data` | PostgreSQL tables, WAL logs, indexes | Standard `pg_dump` or volume snapshot |

---

## 6. Docker Workflows & Operational Runbook

### 6.1 Initial Setup
Copy the environment template:
```powershell
cp .env.example .env
```

### 6.2 Running Active Containers (Frontend + Database)
To build and launch the frontend and database containers:
```powershell
docker compose up --build -d
```

### 6.3 Verifying Service Health
```powershell
docker compose ps
```
*Expected Output*:
- `partshop-frontend`: `Up (healthy / running)` on `0.0.0.0:3000`
- `partshop-postgres`: `Up (healthy)` on `0.0.0.0:5432`

### 6.4 Viewing Real-time Container Logs
```powershell
# Tail logs for all active services
docker compose logs -f

# Tail logs specifically for the frontend
docker compose logs -f frontend
```

### 6.5 Launching with Future Backend Code
Once backend code is added to `./backend/`:
```powershell
docker compose --profile full up --build -d
```

### 6.6 Clean Teardown
```powershell
# Stop containers keeping data intact
docker compose down

# Stop containers and destroy volumes (Destructive: resets database)
docker compose down -v
```
