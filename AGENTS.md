# AGENTS.md

# AI Agent Operating Instructions

## Project Overview

This repository follows a documentation\-first development approach.

The application consists of:

frontend/     → Next.js Application

backend/      → FastAPI Application

docs/         → Project Documentation

Documentation is a first\-class deliverable and must always remain synchronized with the implementation.

---

# CRITICAL RULES

## Rule 1 \- Documentation Is Mandatory

Every code change must include documentation updates.
 
A task is NOT complete until:

- Implementation is complete
- Documentation is updated
- Diagrams are updated (if applicable)
- Changelog is updated

---

## Rule 2 \- Documentation Cannot Lag Behind Code

If code and documentation are inconsistent:

- Implementation is the source of truth
- Documentation must be updated immediately

Do not leave outdated documentation.

---

## Rule 3 \- Review Documentation Before Development

Before making changes:

1. Read relevant requirements.
2. Read relevant architecture documents.
3. Understand current implementation.
4. Implement changes.
5. Update documentation.
6. Update changelog.

---

# PROJECT STRUCTURE

project\-root/

│

├── frontend/

│

├── backend/

│

├── docs/

│   ├── requirement.md

│   ├── ui\-architecture.md

│   ├── ui\-design.md

│   ├── backend\-architecture.md

│   ├── docker\-architecture.md

│   ├── api\-reference.md

│   ├── database\-design.md

│   ├── deployment.md

│   ├── development-milestones.md

│   └── changelog.md

│

├── README.md

│

└── AGENTS.md

---

# DOCUMENTATION OWNERSHIP

## README.md

Purpose:

- Developer onboarding and quick start guide
- Required software and system prerequisites
- Local environment execution instructions (Docker and Bare Metal)
- Environment variable configuration
- Directory structure overview

Update When:

- How the application runs changes
- Software dependencies or required versions change (Node.js, Docker, Python, PostgreSQL)
- Port mappings, URLs, or environment variables change
- New setup commands, development scripts, or execution options are introduced
- Service startup procedures change

Required Updates:

- Software requirements list
- Local run commands and flags
- Port references and URLs
- Environment configuration instructions

---

## docs/requirement.md

Purpose:

- Business requirements
- User stories
- Feature scope
- Acceptance criteria
- Functional requirements
- Non\-functional requirements

Update When:

- New feature added
- Feature modified
- Scope changes
- User stories updated
- Acceptance criteria updated

---

## docs/ui\-architecture.md

Purpose:

- Frontend architecture
- Route structure
- Page hierarchy
- Component hierarchy
- Navigation flows
- Frontend module structure

Update When:

- New page added
- Route modified
- Navigation changed
- Layout created or modified
- Component hierarchy changes
- Frontend folder structure changes

Required Updates:

- Route map
- Component hierarchy
- Feature hierarchy
- Page organization
- Architecture diagrams

---

## docs/ui\-design.md

Purpose:

- Design system
- UI standards
- UX standards
- Visual guidelines
- Accessibility standards

Update When:

- New component added
- UI redesigned
- Color tokens changed
- Typography changed
- Theme updated
- UX pattern changed
- Design system updated

Required Updates:

- Component specifications
- Design tokens
- Accessibility notes
- Design standards

---

## docs/backend\-architecture.md

Purpose:

- FastAPI architecture
- Service architecture
- Repository pattern
- Authentication architecture
- Authorization architecture
- Middleware architecture
- Application flow

Update When:

- Service added
- Repository created
- Authentication updated
- Authorization updated
- Middleware updated
- Background jobs added
- Data flow changes
- Backend folder structure changes

Required Updates:

- Service architecture diagrams
- Request flows
- Authentication flows
- System architecture diagrams

---

## docs/docker\-architecture.md

Purpose:

- Docker architecture
- Container design
- Docker Compose configuration
- Image build strategy
- Container networking
- Volume management
- Runtime dependencies
- Local development environment

Update When:

- Dockerfile changes
- docker\-compose changes
- Container added
- Container removed
- Container networking changes
- Port mappings change
- Volumes change
- Health checks change
- Environment variables change
- Reverse proxy configuration changes

Required Updates:

- Container architecture diagram
- Service communication diagram
- Port mapping documentation
- Docker workflows
- Build process documentation

---

## docs/api\-reference.md

Purpose:

- API documentation
- Endpoint specifications
- Request contracts
- Response contracts

Update When:

- Endpoint added
- Endpoint removed
- Request schema changes
- Response schema changes
- Validation rules change
- Authentication requirements change

Required Updates:

Document:

- Method
- Route
- Request Body
- Response Body
- Validation Rules
- Status Codes
- Example Requests
- Example Responses

---

## docs/database\-design.md

Purpose:

- Database architecture
- Entity design
- Relationships
- Indexes
- Constraints
- Migration history

Update When:

- New table created
- New model created
- Column changes
- Relationship changes
- Migration changes
- Index changes

Required Updates:

- ER diagrams
- Table documentation
- Entity relationships
- Constraints
- Data lifecycle

---

## docs/deployment.md

Purpose:

- Infrastructure architecture
- CI/CD architecture
- Deployment workflow
- Release strategy
- Environment management

Update When:

- Infrastructure changes
- Deployment process changes
- CI/CD pipeline changes
- Cloud resource changes
- Release strategy changes

Required Updates:

- Deployment diagrams
- Environment documentation
- Infrastructure overview
- Release workflow

---

## docs/development-milestones.md

Purpose:

- Living progress tracker for development milestones
- Curriculum and learning objectives
- Detailed per-milestone file and concept inventory
- Verification commands and progress status

Update When:

- A milestone starts or completes
- New architectural milestones or learning objectives are introduced
- Verification steps or files in a milestone change

Required Updates:

- Milestone status table
- Completed date
- Concepts and file inventories

---

## docs/changelog.md

Purpose:

Record historical changes.

Update After:

- Every completed task
- Every merged feature
- Every architecture update
- Every deployment update

Format:

\#\# YYYY\-MM\-DD

\#\#\# Added

\-

\#\#\# Updated

\-

\#\#\# Fixed

\-

\#\#\# Removed

\-

---

# FRONTEND STANDARDS

Location:

frontend/

Technology:

- Next.js
- React
- TypeScript
- Tailwind CSS

Rules:

- Use App Router
- Prefer Server Components
- Reuse components
- Avoid duplication
- Follow feature\-based architecture
- Maintain accessibility standards
- Maintain responsive design

---

# BACKEND STANDARDS

Location:

backend/

Technology:

- FastAPI
- Python
- Pydantic
- SQLAlchemy (if used)

Preferred Structure:

backend/

├── app/

│   ├── api/

│   ├── routes/

│   ├── services/

│   ├── repositories/

│   ├── models/

│   ├── schemas/

│   ├── middleware/

│   ├── core/

│   └── utils/

│

├── tests/

│

└── main.py

Rules:

- Thin controllers/routes
- Business logic in services
- Data access via repositories
- Validation using Pydantic schemas
- Proper exception handling
- Separation of concerns

---

# DOCKER GOVERNANCE

Any change to:

- Dockerfile
- docker\-compose.yml
- compose.yaml
- .dockerignore
- Container topology
- Networks
- Volumes
- Environment variables
- Nginx configuration
- Reverse proxy configuration

MUST update:

docs/docker\-architecture.md

If deployment behavior changes, also update:

docs/deployment.md

---

# DIAGRAM REQUIREMENTS

Whenever architecture changes:

Update Mermaid diagrams.

Applicable Files:

- ui\-architecture.md
- backend\-architecture.md
- docker\-architecture.md
- database\-design.md
- deployment.md

Preferred Diagram Types:

- Flowcharts
- Sequence diagrams
- ER diagrams
- Architecture diagrams

---

# TASK COMPLETION CHECKLIST

Before completing a task verify:

- [ ] Requirements reviewed
- [ ] Code implemented
- [ ] README.md updated (if run commands, prerequisites, or setup changed)
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Architecture diagrams updated
- [ ] API documentation updated (if needed)
- [ ] Database documentation updated (if needed)
- [ ] Docker documentation updated (if needed)
- [ ] Deployment documentation updated (if needed)
- [ ] No outdated documentation remains

---

# REQUIRED FINAL RESPONSE FORMAT

For every completed task provide:

## Code Changes

Summary of implementation.

## Documentation Updated

List all updated documentation files.

## Architecture Impact

Describe architecture changes.

## Technical Notes

Important implementation details.

## Follow\-Up Tasks

Recommended future work.

---

# SUCCESS CRITERIA

A task is complete only when:

1. Functionality works.
2. Code follows project standards.
3. Documentation is updated.
4. Architecture documents are synchronized.
5. Changelog is updated.
6. Diagrams are current.
7. Future developers can understand the change from documentation alone.

