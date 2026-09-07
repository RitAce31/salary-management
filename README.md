# ACME Salary Management System

Web-based employee salary management application built for the HR Manager persona at ACME (~10,000 employees).

## Tech Stack
- **Frontend**: React 19, Vite, TypeScript, Lucide Icons, Vanilla CSS Design System
- **Backend**: Python 3.14, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2
- **Database**: PostgreSQL
- **Testing**: pytest (backend), Vitest & React Testing Library (frontend)

## Repository Structure
```text
salary-management/
├── backend/            # FastAPI backend with domain models, services, migrations & tests
├── frontend/           # React + Vite + TypeScript web application
├── docs/               # Architecture, requirements, trade-offs, and decision records
├── README.md           # Project documentation and setup instructions
└── .gitignore          # Repository git ignore rules
```

## Documentation
- [Requirements](docs/requirements.md)
- [Architecture & Design](docs/architecture.md)
- [Trade-offs & Decisions](docs/tradeoffs.md)
- [AI-Assisted Workflow](docs/ai-workflow.md)
- [Performance & Scalability](docs/performance.md)
