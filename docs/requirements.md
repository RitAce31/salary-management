# Product Requirements Document (PRD) — ACME Salary Management

## 1. Goal
Build a reliable, production-grade, web-based employee salary management system for ACME to replace manual Excel-based compensation tracking for approximately 10,000 employees distributed across multiple countries. The system empowers the HR Manager to maintain accurate, audit-compliant compensation records, track complete historical salary progressions, and gain real-time insights into organizational compensation distribution.

---

## 2. Target User Persona
* **Primary Persona:** **HR Manager**
* **Context & Needs:**
  * Needs an intuitive, high-performance operational interface to look up employees, review compensation structures, and record salary increments or adjustments.
  * Needs to answer organizational compensation questions quickly (e.g., "What is our total payroll spend by department?", "How does engineering compensation compare across regions?", "What is the historical salary growth of an individual?").
  * Does not have time to wait for slow spreadsheets to compute or risk human error through accidental cell overwrites.

---

## 3. Current Problem: Why Excel is Insufficient
Managing ~10,000 employee salary records in spreadsheets presents critical operational risks:
1. **Loss of Historical Context (Data Overwrite):** When an employee receives a raise, updating the cell overwrites previous earnings, destroying historical compensation progression and auditing capabilities.
2. **Performance Degradation:** Spreadsheets containing ~10,000 multi-column records with calculation formulas suffer from severe lag, rendering issues, and frequent application crashes.
3. **Lack of Relational Integrity:** Department names, country codes, and currency identifiers are prone to typos and inconsistencies, skewing organizational aggregations.
4. **Complex Cross-Country Analysis:** Aggregating compensation across different local currencies requires manual formulas and error-prone exchange conversions.
5. **No Auditability or Concurrency:** Multiple HR team members cannot safely view or edit records concurrently without risk of version conflicts or silent data corruption.

---

## 4. MVP Scope & Boundaries

The MVP focuses strictly on solving core salary operations and analytics with maximum engineering rigor, performance, and simplicity:

### In-Scope Capabilities
1. **Employee Management & Fast Directory:**
   * Browse, search (by name, email, employee ID), and filter (by department, country, job title) across ~10,000 employees.
   * Server-side pagination and indexing to ensure sub-100ms response times.
2. **Append-Only Salary History (Confirmed Core Requirement):**
   * View current active salary for any employee.
   * View complete, immutable chronological salary history (effective date, amount, local currency, reason/notes).
   * Record salary updates by appending a new record with an effective date—**previous salary records are never overwritten or deleted**.
3. **Compensation Insights & Analytics:**
   * High-level organizational dashboard: Total annual payroll, average and median salary, headcount breakdown.
   * Dimensional breakdowns: Departmental spend, regional/country spend, and job title salary bands.
   * Server-side database aggregations to avoid transferring 10,000 records to the client browser.
4. **Deterministic Multi-Country Support:**
   * Native storage and display of local currencies (e.g., USD, EUR, GBP, INR).
   * Transparent normalization to a base currency (USD) for global aggregate reporting using documented, deterministic reference exchange rates.
5. **Reproducible Seed Data:**
   * Seed script generating ~10,000 realistic employees across realistic departments and countries, populated with multi-year salary progression history.

---

## 5. Explicitly Out of Scope (and Rationale)

| Excluded Feature | Engineering Rationale for Exclusion |
| :--- | :--- |
| **User Authentication & RBAC** | The assessment specifies the HR Manager as the sole persona. Adding authentication, JWT handling, and password resets adds non-domain boilerplate without demonstrating core compensation modeling or query performance. |
| **Payroll Processing & Bank Disbursements** | ACME Salary Management is a compensation record and analytics platform, not an automated clearing house (ACH) or banking disbursement engine. |
| **Live Dynamic Forex Streaming API** | Integrating external real-time forex APIs introduces third-party network failure points and non-deterministic behavior during automated testing and evaluation. A deterministic reference rate table satisfies all multi-country aggregation requirements predictably. |
| **AI/LLM-Powered Chatbot inside the Product** | Incubyte evaluates **AI-assisted development** (engineering judgment, code quality, TDD), not embedding costly generative AI wrappers into the software. High-performance structured analytics directly solve the HR Manager's questions faster, cheaper, and with 100% mathematical accuracy. |
| **Employee Self-Service Portal** | The product persona is strictly the HR Manager. Individual employee portals introduce unnecessary UX workflows outside the assessment scope. |

---

## 6. Key Requirements & Ambiguity Resolutions

### A. Currency Strategy
* **Decision:** Dual-view model:
  1. *Individual Level:* Always stored and rendered in the employee's **local currency** (e.g., `INR 1,200,000` or `$120,000`).
  2. *Aggregate Level:* Normalized to **USD** for company-wide payroll reporting using a fixed, deterministic reference rate table.
* **Why:** Respects local contract reality while allowing meaningful executive analytics across countries without fluctuating FX noise.

### B. Compensation Insights Strategy
* **Decision:** Built as dedicated, server-side aggregated metric endpoints and visual breakdown cards (Department distribution, Country breakdown, Salary percentiles).
* **Why:** Deterministic, instant response times, zero hallucination risk, and optimized PostgreSQL SQL aggregation queries (`COUNT`, `AVG`, `PERCENTILE_CONT`, `GROUP BY`).

### C. Salary History Invariant
* **Decision:** Append-only relational design. An employee's current salary is determined by the record with the most recent `effective_date <= CURRENT_DATE`.
* **Why:** Complies with strict HR auditing standards and guarantees zero data loss when raises or role adjustments occur.

---

## 7. Success Criteria
1. **Correctness:** 100% preservation of salary history. Adding a new salary updates the current active view without modifying historical records.
2. **Performance:** Database queries for pagination (50 items/page) and analytics aggregations complete in `< 50ms` over a 10,000 employee dataset.
3. **Reliability:** Deterministic test suite covering core domain business rules and APIs with zero flaky tests.
4. **Seed Reproducibility:** The seed command generates the exact same ~10,000 employee distribution and multi-year salary histories on any machine.
5. **Usability:** The HR Manager can search, filter, inspect history, and extract salary insights within 3 clicks.
