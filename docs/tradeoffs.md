# Architectural & Product Trade-off Decisions

This document records the foundational trade-offs made during the design and planning of the ACME Salary Management System. Each entry outlines the alternatives evaluated, the chosen decision, the technical justification, and the trade-offs accepted.

---

## 1. Database Engine: PostgreSQL vs. SQLite

* **Options Considered:**
  * *SQLite:* Zero setup, single-file database, simple for quick demos.
  * *PostgreSQL:* Relational database engine, rich data types, concurrent write handling, robust indexing, and standard cloud hosting support.
* **Decision:** **PostgreSQL**
* **Reason:**
  * ACME has ~10,000 employees with multi-year salary histories (~25,000+ total records) requiring concurrent reads and writes.
  * PostgreSQL provides native decimal precision (`NUMERIC(12, 2)`), date math, advanced analytical window functions, and `PERCENTILE_CONT` for accurate compensation percentiles.
  * Production parity: Easily deployed to managed cloud database providers (e.g., Neon, Supabase, Railway).
* **Trade-off Accepted:** Requires running a PostgreSQL instance for local development and configuring connection credentials, unlike a zero-configuration SQLite file.

---

## 2. Architecture: Modular Monolith vs. Microservices

* **Options Considered:**
  * *Microservices:* Splitting into Employee Service, Salary Service, and Analytics Service with event queues or gRPC.
  * *Modular Monolith:* Single FastAPI application cleanly partitioned into decoupled modules (`core`, `domain`, `services`, `api`, `db`).
* **Decision:** **Modular Monolith**
* **Reason:**
  * For ~10,000 employees and an HR Manager persona, microservices introduce enormous operational complexity (distributed transactions, eventual consistency, network latency, cross-service debugging, complex deployments) with zero business benefit.
  * A modular monolith provides strong compile-time and runtime type safety, direct database transaction atomicity, sub-millisecond inter-module communication, and simple single-step deployment.
* **Trade-off Accepted:** In a massive enterprise with hundreds of independent teams, independent service deployments are harder; however, for ACME's team and scope, modular monolith is the most defensible architecture.

---

## 3. Salary History Modeling: Append-Only Immutable Records vs. Mutable Current Field

* **Options Considered:**
  * *Mutable Field:* Single `salary` column on the `Employee` table updated with `UPDATE employee SET salary = ...`.
  * *Audit Log / Shadow Table:* Trigger-based audit log copying old rows before mutation.
  * *Append-Only Relation:* Distinct `Salary` table where every compensation record is an immutable row with an `effective_date`. Current salary is derived via query.
* **Decision:** **Append-Only Relation (`Employee` 1 $\rightarrow$ N `Salary`)**
* **Reason:**
  * Preserves 100% of historical compensation records without risk of overwrite.
  * Directly fulfills the confirmed requirement that past salaries (e.g., 2024: 10L, 2025: 12L, 2026: 15L) remain auditable and queryable.
  * Avoids destructive updates and provides complete time-series compensation progression.
* **Trade-off Accepted:** Querying "current salary" requires ordering by `effective_date DESC` or a targeted indexed join, rather than reading a flat scalar column. Mitigated with composite indexes `(employee_id, effective_date DESC)`.

---

## 4. Query Execution: Server-Side vs. Client-Side Filtering & Pagination

* **Options Considered:**
  * *Client-Side:* Fetch all 10,000 employees as a massive JSON payload (~5–10 MB) into the browser and use JavaScript for search, filter, and pagination.
  * *Server-Side:* Use PostgreSQL `LIMIT`, `OFFSET`, `WHERE`, and `ORDER BY` with query params from the frontend.
* **Decision:** **Server-Side Filtering, Sorting, and Pagination**
* **Reason:**
  * Transferring 10,000 rows over the network on initial page load causes high latency, heavy browser memory consumption, and slow time-to-interactive on mobile or lower-bandwidth devices.
  * PostgreSQL with B-tree indexes executes filtered, paginated queries over 10,000 rows in `< 5ms`, returning tiny JSON payloads (~20 KB per page of 50).
* **Trade-off Accepted:** Each filter change or pagination click issues an HTTP network request to the backend. Mitigated by debounce on search inputs and clean loading state feedback.

---

## 5. AI Compensation Assistant: Structured Function Calling vs. Raw Text-to-SQL vs. Vector RAG

* **Options Considered:**
  * *Raw Text-to-SQL LLM:* Generating dynamic SQL queries directly from natural language prompts using an external LLM.
  * *Vector RAG (Embeddings + Vector DB):* Ingesting employee records into a vector database (e.g. Pinecone/Chroma) and performing semantic similarity search.
  * *Structured Function Calling (Zero-Trust Tool Dispatch):* LLM receives only function declarations and maps user intent strictly to typed tool arguments (e.g., `query_employees`, `get_salary_metrics`), which dispatch to parameterized PostgreSQL queries.
* **Decision:** **Structured Function Calling with Zero-Trust Execution**
* **Reason:**
  * **Zero Hallucination:** Compensation data demands 100% mathematical accuracy. Raw text-to-SQL frequently hallucinates table joins, miscalculates salary medians, or forgets the critical `effective_date <= CURRENT_DATE` predicate.
  * **Relational Data Fit:** Vector RAG cannot perform mathematical operations (averages, medians, percentile rankings, headcount sums). Relational SQL with B-tree indexing is mathematically exact and 100x faster.
  * **Security & Injection Protection:** The LLM is never given direct SQL access or database credentials, eliminating prompt injection and SQL injection risks entirely.
* **Trade-off Accepted:** Supported natural language query operations are governed by declared tool schemas rather than unrestricted, arbitrary open-domain questions.

---

## 6. Currency Handling: Deterministic Reference Normalization vs. Live Forex API

* **Options Considered:**
  * *Live Forex API:* Call external currency exchange APIs on every request or via periodic sync jobs.
  * *Single Currency Assumption:* Force all employees to be recorded in USD.
  * *Dual-View with Reference Table:* Store and display salaries in native local currencies; normalize to base USD using a documented deterministic exchange rate table for organization-wide aggregates.
* **Decision:** **Dual-View with Reference Exchange Rate Table**
* **Reason:**
  * Real-world HR contracts are legally negotiated in local currencies (INR in India, EUR in Germany, GBP in UK, USD in USA). Forcing USD at the individual level is unrealistic.
  * Relying on live forex APIs introduces flakiness, external API outages, and fluctuating conversion rates that make automated tests non-deterministic.
  * A deterministic reference table ensures 100% reproducible test suites and reliable seed datasets.
* **Trade-off Accepted:** Aggregate multi-currency metrics reflect reference rates rather than intraday spot market forex fluctuations, which is standard practice for annual corporate HR compensation budgeting.

---

## 7. Response Generation: Deterministic Code-Logic Formatting vs. Second-Turn LLM Synthesis

* **Options Considered:**
  * *Second-Turn LLM Synthesis:* Feed retrieved database rows back into the LLM to compose a conversational answer.
  * *Deterministic Code-Logic Formatting:* The backend service transforms database result sets directly into formatted Markdown, structured table payloads, and provenance metadata using Python templates.
* **Decision:** **Deterministic Code-Logic Formatting**
* **Reason:**
  * **Employee Data Privacy (Zero PII Exposure):** In a second-turn LLM synthesis, employee names, IDs, and sensitive salaries would be transmitted across the network to an external AI provider. With code-logic formatting, **zero employee rows ever leave the application boundary**.
  * **Zero Numerical Hallucination:** LLMs can distort numbers, mix up currency symbols, or misstate counts when generating text from data tables. Python code formatting guarantees that every number displayed in Markdown matches the database 1:1.
  * **Latency & Cost:** Avoids a second expensive LLM round-trip, saving ~1–2 seconds and external API token costs per query.
* **Trade-off Accepted:** Explanatory text follows structured templates rather than open-ended conversational prose.

---

## 8. Real-Time Streaming: Server-Sent Events (SSE) vs. WebSockets

* **Options Considered:**
  * *WebSockets:* Full-duplex persistent bidirectional TCP connections.
  * *Server-Sent Events (SSE):* Unidirectional streaming over standard HTTP/2.
* **Decision:** **Server-Sent Events (SSE) via `POST /api/ask/stream`**
* **Reason:**
  * Natural language Q&A is fundamentally unidirectional: the client submits a question, and the server streams progress status, text tokens, and final structured data.
  * SSE operates over standard HTTP/2 and HTTPS, passing seamlessly through enterprise firewalls, reverse proxies, and load balancers without requiring WebSocket upgrade handshakes.
  * Avoids the stateful connection tracking, heartbeat ping-pong, and socket reconnection overhead of WebSockets.
* **Trade-off Accepted:** SSE is unidirectional from server to client; if full-duplex client-to-server interaction during a stream were required, WebSockets would be needed.

