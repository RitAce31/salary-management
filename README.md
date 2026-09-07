# ACME Salary Management System

A production-ready employee salary management and analytics platform built for the **HR Manager** persona at ACME (~10,000 employees across 6 countries).

Designed to replace slow, error-prone spreadsheets with an auditable, append-only salary history model, real-time organization-wide analytics, and a zero-hallucination AI Compensation Assistant.

---

## Key Features

1. **Fast Employee Directory & Search**
   - Instant server-side search by name, email, or job title across 10,000+ employees.
   - Filter by Department and Country with server-side pagination and sorting.
   - Displays current active salary in native paid currency with quick action modals.

2. **Immutable Append-Only Salary History**
   - Auditable compensation progression timeline for every employee.
   - When an employee gets a raise, past salary records are **never overwritten or deleted**.
   - Current salary is automatically resolved from the latest effective compensation entry.

3. **Executive Compensation Analytics Dashboard**
   - High-level KPI metrics: Total payroll spend, mean salary, median salary, and total headcount.
   - Breakdown by department and country with currency normalization.
   - Salary distribution bands across the organization.

4. **AI Compensation Assistant (Zero-Trust AI & SSE Streaming)**
   - Natural language interface for compensation and workforce queries.
   - **Zero-Trust Security Boundary:** AI model never touches PostgreSQL, never executes SQL, and never sees employee data or PII.
   - Genuine AI tool calling (`gemini-3.7-flash`) with strictly parameterized SQL execution (zero mathematical hallucinations).
   - Real-time Server-Sent Events (SSE) streaming chat interface (`POST /api/ask/stream`).
   - Interactive paginated results table with client-side search and instant CSV export.
   - Supports:
     - Generalized employee rankings & lists (e.g., *"Top 50 employees in India by salary"*, *"Employees in India > 50K salary, lowest 10"*)
     - Headcount analytics (by department, country, or cross-filtered)
     - Salary metrics (average, median, highest, lowest)
     - Comparisons (e.g., *"Compare Engineering and Finance"*)
     - Salary distribution share (e.g., *"How many employees earn between 50,000 and 100,000?"*)
     - Individual employee lookups (e.g., *"Who has the highest salary in India?"*)
   - Multi-currency reporting conversion (USD, EUR, GBP, INR, CAD, AUD).

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Material-UI (MUI v6)
- **Backend**: Python 3.12+, FastAPI, SQLAlchemy 2.0, PostgreSQL, Pydantic v2, Poetry
- **Database**: PostgreSQL with B-tree composite indexes
- **Testing**: `pytest` (Backend - 60 tests), `vitest` + React Testing Library (Frontend - 53 tests) — **113 tests total**

---

## Quickstart Guide

### Prerequisites
- Docker & Docker Compose (for PostgreSQL)
- Python 3.12+ and [Poetry](https://python-poetry.org/)
- Node.js 20+ and npm

---

### 1. Database Setup (Docker)

Start the PostgreSQL container:
```bash
docker run -d --name acme-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=acme_salary -p 5433:5432 postgres:16-alpine
```

---

### 2. Backend Setup

```bash
cd backend

# 1. Install dependencies
poetry install

# 2. Seed database with 10,000 employees and multi-year salary histories
poetry run python scripts/seed.py

# 3. Start the FastAPI development server (runs on http://localhost:8000)
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Interactive API documentation will be available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

### 3. Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start the Vite development server (runs on http://localhost:5173)
npm run dev
```

Open `http://localhost:5173` in your browser to access the application.

---

## Running Tests

### Backend Tests
```bash
cd backend
poetry run pytest
```
*60 automated unit and integration tests covering API endpoints, services, validation rules, AI intent mapping, and error handling.*

### Frontend Tests
```bash
cd frontend
npm run test
```
*53 automated tests covering layout, directory, modals, analytics, and assistant visualizers.*

### Linting and Type Checking
```bash
# Frontend type check & lint
cd frontend
npx tsc --noEmit
npm run lint

# Backend format check
cd backend
poetry run pytest
```

---

## Project Documentation

Detailed design and architectural documentation can be found in the [`docs/`](docs/) directory:

- [Product Requirements Document (PRD)](docs/requirements.md): Persona, problem statement, core MVP scope, and acceptance criteria.
- [System Architecture & Design](docs/architecture.md): Modular monolith structure, domain models, database schema, and API contracts.
- [Architectural Trade-offs & Decisions](docs/tradeoffs.md): Rationale for PostgreSQL, modular monolith, append-only history, and zero-hallucination AI.
- [AI-Assisted Workflow](docs/ai-workflow.md): Prompts, engineering judgment, accepted vs. rejected suggestions, and TDD methodology.
- [Performance & Scalability](docs/performance.md): Indexing strategy, query optimization, and benchmark results on 10,000 records.
