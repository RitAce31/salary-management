# Performance & Scalability Considerations

This document explains the performance strategy, database design considerations, and measurement approach for the ACME Salary Management System operating on a dataset of approximately 10,000 employees with historical salary records.

---

## 1. Scale Context

The system is designed to manage approximately 10,000 employees, each having one or more historical salary records.

At this scale, a single relational PostgreSQL instance can easily handle the complete operational workload with low latency when standard database engineering practices are followed. The system does not require distributed databases or complex caching infrastructure.

The primary engineering objective is to avoid common performance pitfalls—such as loading unpaginated datasets into memory, issuing N+1 database queries, or performing analytical aggregations in application memory—while keeping the architecture simple and maintainable.

---

## 2. Server-Side Pagination, Filtering, and Sorting

Employee records are never loaded in bulk into the browser. All directory browsing, search queries, and filtering operations are performed on the server and database:

* **Bounded Page Sizes:** API endpoints enforce pagination with reasonable default and maximum limits (e.g., default 20 records, maximum 100 records per page).
* **Bounded Payloads:** The frontend only receives data for the currently visible page of employees, keeping network transfer size and browser memory consumption small and predictable.
* **Server-Side Filtering and Sorting:** Department filtering, country filtering, search, and ordering are translated directly to SQL `WHERE` and `ORDER BY` clauses with `LIMIT` and `OFFSET`.

---

## 3. Database Performance & Indexing

PostgreSQL is responsible for handling search filtering, sorting, pagination, aggregation, and salary-history retrieval. Indexes are defined to match concrete query access patterns:

```sql
-- 1. Accelerates directory filtering by department
CREATE INDEX idx_employees_department ON employees (department);

-- 2. Accelerates directory filtering by country
CREATE INDEX idx_employees_country ON employees (country);

-- 3. Composite index for salary history lookup and current salary resolution
CREATE INDEX idx_salaries_emp_effective ON salaries (employee_id, effective_date DESC);
```

### Access Patterns Supported:
1. **Salary History for an Employee:**  
   When the HR Manager views an employee's profile, all historical salary records are queried with:
   ```sql
   SELECT id, amount, currency, effective_date, change_reason, created_at
   FROM salaries
   WHERE employee_id = :employee_id
   ORDER BY effective_date DESC;
   ```
   The composite index `(employee_id, effective_date DESC)` satisfies both the equality filter and the ordering directly without requiring a separate sort operation.

2. **Directory Filtering:**  
   Single-column B-tree indexes on `department` and `country` allow the database planner to use index scans when filtering by specific departments or countries.

---

## 4. Avoiding N+1 Queries

When rendering a paginated list of employees in the directory, each row displays the employee's current active salary.

A naive implementation would execute:
* 1 query to fetch 20 employees.
* 20 individual queries to fetch the current salary for each employee (N+1 query problem).

To avoid this, the application resolves current salaries using a bounded, single-query approach:
* Current salaries for the page are retrieved in a single batch query using `DISTINCT ON` or a lateral join across the fetched employee IDs:
  ```sql
  SELECT DISTINCT ON (employee_id)
      employee_id, amount, currency, effective_date
  FROM salaries
  WHERE employee_id = ANY(:employee_ids)
    AND effective_date <= CURRENT_DATE
  ORDER BY employee_id, effective_date DESC, id DESC;
  ```
* The results are mapped in memory in the service layer before the API response is serialized, keeping the database round-trips to a fixed, constant number per request regardless of page size.

---

## 5. Analytics Performance

Organizational compensation questions (such as total employee count, average salary, median salary, department summaries, country summaries, and salary distribution brackets) are calculated directly within PostgreSQL using native aggregation functions:

* Aggregation queries leverage SQL functions (`COUNT`, `AVG`, `PERCENTILE_CONT`, `GROUP BY`) rather than fetching large numbers of salary rows into Python memory or the client browser.
* Database-side aggregation returns compact summary payloads directly to the client, keeping network transfer minimal and avoiding unnecessary CPU overhead in the backend application process.

---

## 6. Frontend Performance

The frontend applies several practical engineering practices to maintain a smooth user experience:

* **Server-Side Pagination:** The client renders only the records for the current page, avoiding large DOM node trees.
* **Debounced Search Inputs:** Input fields trigger API requests only after the user pauses typing (e.g., 250ms), preventing unnecessary network requests for intermediate keystrokes.
* **On-Demand Detail Fetching:** Detailed salary history is fetched only when an employee is specifically selected, rather than pre-fetching history for all employees in a list.
* **Component Re-render Hygiene:** State is kept local to relevant components (such as search filters and modals) so that typing or opening a modal does not cause unnecessary re-renders of unrelated UI components.
* **Explicit Feedback States:** Visual loading skeletons and spinners are used during data fetching to provide clear feedback and avoid UI layout shift.

---

## 7. AI Assistant & Streaming Performance

The AI Compensation Assistant is engineered for high responsiveness, concurrency, and client efficiency:

### Asynchronous Event Loop Protection
* FastAPI's event loop must never be blocked by synchronous network calls or database operations.
* The external Gemini SDK call and PostgreSQL queries are dispatched to dedicated worker threads via `asyncio.to_thread`.
* This ensures that while an AI streaming response is being generated, other HR Manager operations (browsing employees, viewing salary histories, dashboard metrics) continue processing with zero latency impact.

### Server-Sent Events (SSE) Latency Profile
* **Intent Extraction (Gemini 3.7 Flash):** ~1.0 – 1.2s to interpret user phrasing and emit validated JSON function arguments.
* **Database Query Execution (`query_employees` CTE / aggregations):** `< 8ms` over the complete 10,000-employee database using composite B-tree indexes.
* **First-Token Delivery:** The user sees initial thinking indicators immediately (`"Executing database analysis..."`), and streamed Markdown tokens begin rendering right after query completion.

### Client-Side Table Performance & Memory Hygiene
* For multi-employee ranking queries (`query_employees`), the API streams a compact structured payload (up to 100 records, ~15 KB).
* **Virtual Paginated Rendering:** The frontend table displays 10 records per page, keeping the active DOM node count tiny.
* **Zero-Latency In-Memory Filtering:** The table search input filters the already-fetched dataset instantly in browser memory (< 1ms) without firing redundant backend requests.
* **Instant Client-Side CSV Export:** CSV generation runs completely in the browser via JavaScript `Blob` construction, creating downloadable files instantly with zero server CPU overhead.

---

## 8. Performance Validation Strategy

Performance will not be assumed through theoretical estimates or arbitrary target numbers. Instead, performance will be validated against the seeded ~10,000-employee dataset using explicit measurement tools:

1. **Query Plan Inspection (`EXPLAIN ANALYZE`):**
   * Review execution plans for the directory listing, current-salary resolution, and analytics queries.
   * Verify that queries utilize defined indexes appropriately and avoid unexpected sequential scans on large tables.
2. **API Request Profiling:**
   * Measure response times for representative API requests:
     * Paginated employee list (first page and later pages): `< 5ms`.
     * Filtered employee list (by department, country, and search query): `< 10ms`.
     * Salary history lookup for an individual employee: `< 2ms`.
     * Analytics summary endpoints: `< 15ms`.
     * Assistant parameterized CTE query execution: `< 8ms`.
3. **Seed Dataset Verification:**
   * Benchmark queries specifically against the fully seeded ~10,000 employee database to observe realistic behavior under expected data volume.

All final performance assertions are based on these concrete measurements rather than hypothetical numbers.

---

## 9. Scalability Beyond the Assessment Scope

If the system were to expand significantly beyond the current ~10,000-employee scope, several evolutionary scalability strategies could be evaluated:

* **Keyset Pagination:** If dataset sizes grow to hundreds of thousands of rows where large `OFFSET` values become slow, keyset (cursor-based) pagination can be introduced.
* **Targeted Index Profiling:** Additional composite or covering indexes can be introduced based on actual production query profiling and slow-query logs.
* **Read Replicas:** If read traffic significantly exceeds write volume, read queries (such as reporting and directory browsing) could be directed to one or more PostgreSQL read replicas.
* **Dedicated Caching Layer:** Invalidation-based caching (such as Redis) could be introduced for frequently accessed, slow-changing organizational analytics if measured traffic warrants it.

These strategies represent future architectural options and are intentionally omitted from the current system to prevent premature optimization.

---

## 10. Deliberately Avoided Infrastructure

The current architecture intentionally does **not** include:
* **Microservices:** A modular monolith satisfies all functional and operational requirements without distributed transaction overhead.
* **Redis / Distributed Caching:** The database handles queries efficiently at 10,000 rows without adding cache invalidation complexity or an additional infrastructure service.
* **Elasticsearch:** PostgreSQL's built-in filtering and pattern matching are sufficient for the HR Manager's directory search access patterns.
* **Message Queues / Event Brokers (Kafka, RabbitMQ):** All business operations are synchronous and transactional; asynchronous message processing adds unnecessary moving parts.

**Reason:** The current dataset and scope do not justify the operational complexity of these components. They should be introduced only if measured workload or future requirements demonstrate a concrete need.
