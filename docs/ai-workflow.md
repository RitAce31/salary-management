# AI-Assisted Development Workflow

This document records the AI-assisted engineering methodology, prompt strategies, technical justifications, accepted vs. rejected architectural proposals, and verification procedures used to build the ACME Salary Management System.

---

## 1. Workflow Principles & Philosophy

When developing software with AI assistance, the engineer remains the primary architect and decision maker (**Human-in-the-Loop**):
1. **Domain First:** Software requirements, user personas, and data integrity constraints are defined before generating code.
2. **Deterministic Over Generative:** In financial and payroll systems, mathematical calculations and database queries must be 100% deterministic with zero hallucination.
3. **Rigorous Verification:** Every AI-generated design or code block is validated through automated test suites (`pytest`, `vitest`), static typing (`tsc`, `pydantic`), and performance benchmarks.
4. **Defensible Trade-offs:** Every design decision must balance simplicity, maintainability, and real-world scalability.

---

## 2. Iterative Development Phases & Prompts

### Phase 1: Requirements & Scope Definition
* **Objective:** Replace manual Excel spreadsheets for ~10,000 employees without overengineering.
* **Prompt Strategy:**
  > *"Analyze the requirements for an enterprise salary management system for 10,000 employees. Focus strictly on the HR Manager persona. What are the key domain invariants, particularly around historical salary progression and multi-currency compensation?"*
* **Outcome:**
  - Defined the **Append-Only Salary History** invariant: past salary records are never overwritten or deleted.
  - Established the **Dual-View Currency Strategy**: local contract currency for individual employees, normalized USD for company-wide executive analytics.
  - Kept scope strictly bounded to HR operations and analytics.

---

### Phase 2: Architectural Decision-Making
* **Objective:** Select the most appropriate tech stack and system structure.
* **Prompt Strategy:**
  > *"Evaluate the trade-offs between a Modular Monolith vs Microservices, and PostgreSQL vs SQLite for a dataset of 10,000 employees with historical salary timelines."*
* **Outcome:**
  - Selected a **Modular Monolith** in FastAPI: avoided distributed transaction overhead, network latency, and operational complexity.
  - Selected **PostgreSQL**: native decimal precision (`NUMERIC(12, 2)`), rich analytical aggregate functions (`PERCENTILE_CONT`), and B-tree composite indexing.

---

### Phase 3: Test-Driven Backend Implementation
* **Objective:** Implement core domain models, seed generator, and REST APIs with high test coverage.
* **Prompt Strategy:**
  > *"Generate a test suite for employee salary management covering: append-only salary updates, current salary resolution from latest effective date, and multi-currency conversion using deterministic exchange rates."*
* **Outcome:**
  - Built **60 unit and integration tests** in `pytest`.
  - Implemented single-transaction employee registration and salary creation.
  - Implemented reproducible seeding script generating 10,000 realistic employees across 6 countries and 8 departments with multi-year salary progression history.

---

### Phase 4: Frontend Development & UI Design
* **Objective:** Build an intuitive, high-performance UI using Material-UI (MUI v6) and React 19.
* **Prompt Strategy:**
  > *"Create a clean, enterprise-grade React dashboard for an HR manager with server-side pagination, search debounce, salary history timeline modal, and interactive analytics breakdowns."*
* **Outcome:**
  - Directory table with server-side pagination (50 records/page) responding in `< 5ms`.
  - Auditable Salary History timeline modal with color-coded adjustment indicators and "Add Compensation" form.
  - Executive Analytics dashboard displaying total payroll, average salary, median salary, and departmental/country breakdowns.
  - **53 passing automated tests** in `vitest`.

---

### Phase 5: AI Compensation Assistant (Zero-Hallucination Natural Language)
* **Objective:** Provide a natural-language query interface for compensation questions without hallucination risk.
* **Prompt Strategy:**
  > *"Design a natural language assistant for compensation analytics that translates questions into structured operations executed by PostgreSQL. Avoid raw LLM text-to-SQL or vector embeddings."*
* **Outcome:**
  - Implemented AI function calling and parameterized SQL queries:
    - Headcount queries (`get_employee_count`)
    - Salary metric queries (`get_salary_metrics`)
    - Comparative queries (`compare_departments`, `compare_countries`)
    - Salary range queries (`get_salary_range_count`)
    - Generalized employee list & ranking queries (`query_employees` for top 50, threshold + lowest 10, etc.)
    - Individual employee lookups (`get_top_earning_employee` resolving "Who" vs "What")
  - Rendered dynamic visualizers: Server-Sent Events (SSE) streaming chat, interactive paginated employee results table with CSV export, side-by-side comparison tables, workforce share progress cards, and employee profile cards.

---

## 3. Evaluation of AI Suggestions: Accepted vs. Rejected

| AI Suggestion | Status | Engineering Rationale |
| :--- | :---: | :--- |
| **Use an unconstrained LLM to generate raw SQL (Text-to-SQL)** | ❌ **Rejected** | Raw SQL generation poses critical prompt-injection risks, syntax hallucinations, and incorrect date math (`effective_date <= CURRENT_DATE`). Replaced with **deterministic tool-calling** and parameterized queries. |
| **Use Vector Database / RAG (e.g., Pinecone/Chroma)** | ❌ **Rejected** | Compensation data is structured relational data. Vector similarity search cannot compute mathematical aggregates (averages, medians, sums, ranges). Relational SQL is the correct tool. |
| **Pass employee database records back to LLM for text generation** | ❌ **Rejected** | Transmitting employee names and salaries to a third-party AI API violates data privacy (PII leakage) and reintroduces numerical hallucination. Replaced with **deterministic Python code formatting**. |
| **Split backend into Microservices (Employee, Salary, Analytics)** | ❌ **Rejected** | For 10,000 records and a single HR Manager persona, microservices introduce distributed network latency, eventual consistency bugs, and deployment complexity with zero business benefit. |
| **Fetch live Forex rates via third-party external API** | ❌ **Rejected** | Introduces network failure points, API rate limits, and non-deterministic test failures. Replaced with an isolated reference exchange rate table with standard USD conversions. |
| **Zero-Trust AI boundary (no DB access or credentials for AI)** | ✅ **Accepted** | AI model only parses intent and outputs function parameters; backend executes strictly parameterized PostgreSQL queries. |
| **Append-only salary history model** | ✅ **Accepted** | Satisfies the requirement that historical salaries are never overwritten, enabling full audit compliance. |
| **Composite B-tree index `(employee_id, effective_date DESC)`** | ✅ **Accepted** | Satisfies both equality filtering and reverse chronological sorting in a single index scan, keeping history lookups under 1ms. |
| **Server-Sent Events (SSE) for streaming query responses** | ✅ **Accepted** | Provides real-time token delivery and status updates over standard HTTP/2 without WebSocket overhead. |
| **Dual-view currency presentation** | ✅ **Accepted** | Preserves local paid contract amounts (INR, EUR, GBP) while allowing normalized global reporting in USD. |
| **Distinguish "Who" vs "What" queries** | ✅ **Accepted** | Differentiates between aggregate statistics (*"What is highest salary?"*) and individual employee profile lookups (*"Who has highest salary?"*). |

---

## 4. Verification & Quality Assurance Strategy

To ensure zero regressions and verified software quality, the following verification gates were enforced:

1. **Automated Unit & Integration Tests**:
   - Backend: **60 pytest tests** passing (100% pass rate).
   - Frontend: **53 vitest tests** passing (100% pass rate).
2. **Static Typing & Linting**:
   - Zero TypeScript compilation errors (`tsc -b`).
   - Zero ESLint/oxlint errors.
3. **Database Performance Benchmarking**:
   - Seeded with 10,000 employee records and ~25,000 salary history records.
   - Tested directory pagination (`LIMIT 50 OFFSET 0`): `< 4ms`.
   - Tested organizational analytics aggregation (`AVG`, `PERCENTILE_CONT`): `< 15ms`.
   - Tested assistant parameterized queries: `< 8ms`.
4. **Zero-Hallucination Audit**:
   - Every answer generated by the assistant includes a metadata provenance tag indicating the exact database query and record set it was computed from.
