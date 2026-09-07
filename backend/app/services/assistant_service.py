import re
from decimal import Decimal
from typing import Optional, Dict, Any, Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.domain.assistant_schemas import AssistantResponse
from app.services.analytics_service import AnalyticsService


DEPARTMENTS = [
    "Engineering",
    "Product",
    "Sales",
    "Marketing",
    "Finance",
    "HR",
    "Operations",
    "Legal",
]

COUNTRIES = [
    "United States",
    "India",
    "Germany",
    "United Kingdom",
    "Canada",
    "Australia",
]

CURRENCY_SYMBOLS = {
    "USD": "$",
    "EUR": "€",
    "GBP": "£",
    "INR": "₹",
    "CAD": "CA$",
    "AUD": "A$",
}


class CompensationAssistantService:

    @classmethod
    def answer_question(
        cls,
        db: Session,
        question: str,
        reporting_currency: str = "USD",
    ) -> AssistantResponse:
        q = question.strip()
        currency = cls._extract_currency(q, reporting_currency)

        intent, params = cls._parse_intent(q)
        answer, operation, data, metadata = cls._execute_intent(db, intent, params, currency, q)

        return AssistantResponse(
            answer=answer,
            operation=operation,
            data=data,
            metadata=metadata,
        )

    @classmethod
    def _extract_currency(cls, question: str, default: str) -> str:
        q_lower = question.lower()
        if re.search(r"\b(inr|rupees?|₹|rs\.?)\b", q_lower):
            return "INR"
        if re.search(r"\b(eur|euros?|€)\b", q_lower):
            return "EUR"
        if re.search(r"\b(gbp|pounds?|£)\b", q_lower):
            return "GBP"
        if re.search(r"\b(cad|canadian dollars?)\b", q_lower):
            return "CAD"
        if re.search(r"\b(aud|australian dollars?)\b", q_lower):
            return "AUD"
        if re.search(r"\b(usd|dollars?|\$)\b", q_lower):
            return "USD"
        return default.strip().upper() if default else "USD"

    @classmethod
    def _extract_department(cls, text_str: str) -> Optional[str]:
        t = text_str.lower()
        if re.search(r"\b(engineer|engineers|engineering|eng|software)\b", t):
            return "Engineering"
        if re.search(r"\b(product|product management|pm)\b", t):
            return "Product"
        if re.search(r"\b(sales|account executive)\b", t):
            return "Sales"
        if re.search(r"\b(marketing|mktg)\b", t):
            return "Marketing"
        if re.search(r"\b(finance|accounting)\b", t):
            return "Finance"
        if re.search(r"\b(hr|human resources|talent)\b", t):
            return "HR"
        if re.search(r"\b(operation|operations|ops)\b", t):
            return "Operations"
        if re.search(r"\b(legal|compliance)\b", t):
            return "Legal"
        return None

    @classmethod
    def _extract_country(cls, text_str: str) -> Optional[str]:
        t = text_str.lower()
        if re.search(r"\b(india|ind)\b", t):
            return "India"
        if re.search(r"\b(united states|usa?|america|states)\b", t):
            return "United States"
        if re.search(r"\b(germany|de|deutschland)\b", t):
            return "Germany"
        if re.search(r"\b(united kingdom|uk|britain|england)\b", t):
            return "United Kingdom"
        if re.search(r"\b(canada)\b", t):
            return "Canada"
        if re.search(r"\b(australia|aus)\b", t):
            return "Australia"
        return None

    @classmethod
    def _extract_multiple_departments(cls, text_str: str) -> List[str]:
        found: List[Tuple[int, str]] = []
        t = text_str.lower()
        for d in DEPARTMENTS:
            pattern = rf"\b{re.escape(d.lower())}\b"
            if d == "HR":
                pattern = r"\b(hr|human resources)\b"
            elif d == "Engineering":
                pattern = r"\b(engineering|engineers|eng)\b"
            m = re.search(pattern, t)
            if m:
                found.append((m.start(), d))
        found.sort(key=lambda x: x[0])
        return [d for _, d in found]

    @classmethod
    def _extract_multiple_countries(cls, text_str: str) -> List[str]:
        found: List[Tuple[int, str]] = []
        t = text_str.lower()
        for c in COUNTRIES:
            if c == "United States":
                pattern = r"\b(united states|us|usa|america)\b"
            elif c == "United Kingdom":
                pattern = r"\b(united kingdom|uk|britain)\b"
            else:
                pattern = rf"\b{re.escape(c.lower())}\b"
            m = re.search(pattern, t)
            if m:
                found.append((m.start(), c))
        found.sort(key=lambda x: x[0])
        return [c for _, c in found]

    @classmethod
    def _parse_intent(cls, question: str) -> Tuple[str, Dict[str, Any]]:
        q = question.lower()

        compare_match = re.search(r"\bcompare\b", q)
        if compare_match:
            depts = cls._extract_multiple_departments(question)
            if len(depts) >= 2:
                return "compare_departments", {"department_a": depts[0], "department_b": depts[1]}
            countries = cls._extract_multiple_countries(question)
            if len(countries) >= 2:
                return "compare_countries", {"country_a": countries[0], "country_b": countries[1]}

        range_between = re.search(
            r"between\s+[\$€£₹]?\s*([0-9,]+(?:k)?)\s+and\s+[\$€£₹]?\s*([0-9,]+(?:k)?)",
            q,
        )
        if range_between:
            min_val = cls._parse_number(range_between.group(1))
            max_val = cls._parse_number(range_between.group(2))
            return "get_salary_range_count", {"min_salary": min_val, "max_salary": max_val}

        range_more = re.search(
            r"(more than|greater than|above|over)\s+[\$€£₹]?\s*([0-9,]+(?:k)?)",
            q,
        )
        if range_more:
            min_val = cls._parse_number(range_more.group(2))
            return "get_salary_range_count", {"min_salary": min_val, "max_salary": None}

        range_less = re.search(
            r"(less than|under|below)\s+[\$€£₹]?\s*([0-9,]+(?:k)?)",
            q,
        )
        if range_less:
            max_val = cls._parse_number(range_less.group(2))
            return "get_salary_range_count", {"min_salary": None, "max_salary": max_val}

        if re.search(r"(show|list|breakdown|view).*(salary|comp).*by\s+department", q) or re.search(r"salary\s+by\s+department", q):
            return "get_salary_by_department", {}

        if re.search(r"(show|list|breakdown|view).*(salary|comp).*by\s+country", q) or re.search(r"salary\s+by\s+country", q):
            return "get_salary_by_country", {}

        if re.search(r"(salary distribution|distribution of salary|distribution tiers|salary brackets)", q):
            return "get_salary_distribution", {}

        is_highest = bool(re.search(r"\b(highest|max|maximum|top|most|best paid)\b", q))
        is_lowest = bool(re.search(r"\b(lowest|min|minimum|bottom|least|worst paid)\b", q))

        if (is_highest or is_lowest) and re.search(r"\bdepartment\b", q) and not cls._extract_department(question):
            return "get_highest_lowest_department", {"order": "highest" if is_highest else "lowest"}

        if (is_highest or is_lowest) and re.search(r"\bcountry\b", q) and not cls._extract_country(question):
            return "get_highest_lowest_country", {"order": "highest" if is_highest else "lowest"}

        is_salary = bool(re.search(r"\b(salary|salaries|pay|compensation|comp|earn|earning|payroll)\b", q))
        is_count = bool(
            re.search(r"\b(how many|count|headcount|number of employees|total employees|total people)\b", q)
            or (re.search(r"\bemployees\b", q) and not re.search(r"\b(salary|pay|earn|compensation|cost|spend)\b", q))
        )

        is_who = bool(
            re.search(r"\b(who|which person|which employee|name of the employee|who is|who has|who earns|who gets)\b", q)
        )
        if is_who and (is_highest or is_lowest or is_salary or re.search(r"\b(earn|earns|paid|makes)\b", q)):
            dept = cls._extract_department(question)
            country = cls._extract_country(question)
            order = "lowest" if is_lowest else "highest"
            return "get_top_earning_employee", {"order": order, "department": dept, "country": country}

        if is_count:
            dept = cls._extract_department(question)
            country = cls._extract_country(question)
            return "get_employee_count", {"department": dept, "country": country}

        if is_salary or is_highest or is_lowest:
            dept = cls._extract_department(question)
            country = cls._extract_country(question)
            metric = "average"
            if is_highest:
                metric = "highest"
            elif is_lowest:
                metric = "lowest"
            elif re.search(r"\b(median|50th percentile)\b", q):
                metric = "median"
            return "get_salary_metrics", {"metric": metric, "department": dept, "country": country}

        dept = cls._extract_department(question)
        country = cls._extract_country(question)
        if dept or country:
            return "get_employee_count", {"department": dept, "country": country}

        return "unsupported", {}

    @classmethod
    def _parse_number(cls, num_str: str) -> float:
        cleaned = num_str.strip().lower().replace(",", "")
        if cleaned.endswith("k"):
            return float(cleaned[:-1]) * 1000
        return float(cleaned)

    @classmethod
    def _format_money(cls, amount: float | Decimal, currency: str) -> str:
        symbol = CURRENCY_SYMBOLS.get(currency.upper(), f"{currency.upper()} ")
        val = float(amount)
        return f"{symbol}{val:,.2f} {currency.upper()}"

    @classmethod
    def _execute_intent(
        cls,
        db: Session,
        intent: str,
        params: Dict[str, Any],
        currency: str,
        original_question: str,
    ) -> Tuple[str, str, Dict[str, Any], Dict[str, str]]:
        if intent == "get_employee_count":
            dept = params.get("department")
            country = params.get("country")
            overview = AnalyticsService.get_overview(db, reporting_currency=currency, department=dept, country=country)
            count = overview.total_headcount

            scope_desc = []
            if dept:
                scope_desc.append(f"the {dept} department")
            if country:
                scope_desc.append(f"{country}")
            joined_scope = f" in {' in '.join(scope_desc)}" if scope_desc else " across the entire company"

            answer = f"There are {count:,} active employees{joined_scope}."
            data = {
                "headcount": count,
                "department": dept,
                "country": country,
            }
            metadata = {
                "based_on": "Active employee contract records in PostgreSQL",
            }
            return answer, intent, data, metadata

        if intent == "get_salary_metrics":
            metric = params.get("metric", "average")
            dept = params.get("department")
            country = params.get("country")
            overview = AnalyticsService.get_overview(db, reporting_currency=currency, department=dept, country=country)

            scope_desc = []
            if dept:
                scope_desc.append(f"{dept}")
            if country:
                scope_desc.append(f"{country}")
            joined_scope = f" in {' in '.join(scope_desc)}" if scope_desc else " across ACME Corporation"

            metric_labels = {
                "average": ("average salary", overview.average_salary),
                "median": ("median salary", overview.median_salary),
                "highest": ("highest salary", overview.max_salary),
                "lowest": ("lowest salary", overview.min_salary),
            }
            label, val = metric_labels.get(metric, ("average salary", overview.average_salary))
            formatted_val = cls._format_money(val, currency)

            answer = f"The {label}{joined_scope} is {formatted_val} (headcount: {overview.total_headcount:,})."
            data = {
                "metric": metric,
                "amount": float(val),
                "currency": currency,
                "headcount": overview.total_headcount,
                "department": dept,
                "country": country,
            }
            metadata = {
                "based_on": f"Current active salary records normalized to {currency}",
            }
            return answer, intent, data, metadata

        if intent == "get_top_earning_employee":
            order = params.get("order", "highest")
            dept = params.get("department")
            country = params.get("country")

            where_clauses = ["s.effective_date <= CURRENT_DATE"]
            sql_params: Dict[str, Any] = {"rep_curr": currency}

            if dept:
                where_clauses.append("e.department = :dept")
                sql_params["dept"] = dept
            if country:
                where_clauses.append("e.country = :country")
                sql_params["country"] = country

            where_sql = " AND ".join(where_clauses)
            order_sql = "DESC" if order == "highest" else "ASC"

            query = text(f"""
            WITH current_salaries AS (
                SELECT DISTINCT ON (s.employee_id)
                    s.employee_id,
                    s.amount,
                    s.currency,
                    e.first_name,
                    e.last_name,
                    e.job_title,
                    e.department,
                    e.country
                FROM salaries s
                JOIN employees e ON e.id = s.employee_id
                WHERE {where_sql}
                ORDER BY s.employee_id, s.effective_date DESC, s.id DESC
            ),
            converted_salaries AS (
                SELECT
                    cs.employee_id,
                    cs.first_name,
                    cs.last_name,
                    cs.job_title,
                    cs.department,
                    cs.country,
                    cs.currency,
                    cs.amount,
                    ROUND(
                        CASE 
                            WHEN cs.currency = :rep_curr THEN cs.amount
                            ELSE cs.amount * COALESCE(er.rate, 1.0)
                        END, 2
                    ) AS amount_conv
                FROM current_salaries cs
                LEFT JOIN exchange_rates er
                    ON er.from_currency = cs.currency
                   AND er.to_currency = :rep_curr
            )
            SELECT * FROM converted_salaries
            ORDER BY amount_conv {order_sql}
            LIMIT 1;
            """)

            row = db.execute(query, sql_params).mappings().first()
            if not row:
                return (
                    "No active employees found matching the specified criteria.",
                    intent,
                    {"order": order, "department": dept, "country": country},
                    {"based_on": "Active employee database query in PostgreSQL"},
                )

            name = f"{row['first_name']} {row['last_name']}"
            role = row["job_title"]
            dept_name = row["department"]
            country_name = row["country"]
            raw_amt = float(row["amount"])
            native_curr = row["currency"]
            conv_amt = float(row["amount_conv"])

            formatted_native = cls._format_money(raw_amt, native_curr)
            formatted_conv = cls._format_money(conv_amt, currency)

            qualifier = "highest paid" if order == "highest" else "lowest paid"
            scope_desc = []
            if dept:
                scope_desc.append(f"in {dept}")
            if country:
                scope_desc.append(f"in {country}")
            scope_str = f" {' '.join(scope_desc)}" if scope_desc else " across ACME Corporation"

            if native_curr == currency:
                salary_str = formatted_native
            else:
                salary_str = f"{formatted_native} ({formatted_conv})"

            answer = f"The {qualifier} employee{scope_str} is {name} ({role}, {dept_name}), earning {salary_str}."

            data = {
                "employee_id": row["employee_id"],
                "first_name": row["first_name"],
                "last_name": row["last_name"],
                "job_title": role,
                "department": dept_name,
                "country": country_name,
                "amount": raw_amt,
                "currency": native_curr,
                "amount_conv": conv_amt,
                "reporting_currency": currency,
                "order": order,
            }
            metadata = {
                "based_on": "Verified employee record and active compensation history in PostgreSQL",
            }
            return answer, intent, data, metadata

        if intent == "get_highest_lowest_department":
            order = params.get("order", "highest")
            dept_res = AnalyticsService.get_by_department(db, reporting_currency=currency)
            if not dept_res.departments:
                return "No department compensation data available.", intent, {}, {}

            sorted_depts = sorted(
                dept_res.departments,
                key=lambda d: float(d.average_salary),
                reverse=(order == "highest"),
            )
            target = sorted_depts[0]
            amt_str = cls._format_money(target.average_salary, currency)

            answer = (
                f"{target.department} has the {order} average salary at {amt_str} "
                f"with {target.headcount:,} employees."
            )
            data = {
                "department": target.department,
                "order": order,
                "average_salary": float(target.average_salary),
                "headcount": target.headcount,
                "currency": currency,
            }
            metadata = {
                "based_on": f"Departmental compensation averages normalized to {currency}",
            }
            return answer, intent, data, metadata

        if intent == "get_highest_lowest_country":
            order = params.get("order", "highest")
            country_res = AnalyticsService.get_by_country(db, reporting_currency=currency)
            if not country_res.countries:
                return "No country compensation data available.", intent, {}, {}

            sorted_countries = sorted(
                country_res.countries,
                key=lambda c: float(c.average_salary),
                reverse=(order == "highest"),
            )
            target = sorted_countries[0]
            amt_str = cls._format_money(target.average_salary, currency)

            answer = (
                f"{target.country} has the {order} average salary at {amt_str} "
                f"with {target.headcount:,} employees."
            )
            data = {
                "country": target.country,
                "order": order,
                "average_salary": float(target.average_salary),
                "headcount": target.headcount,
                "currency": currency,
            }
            metadata = {
                "based_on": f"Country compensation averages normalized to {currency}",
            }
            return answer, intent, data, metadata

        if intent == "compare_departments":
            dept_a_name = params.get("department_a")
            dept_b_name = params.get("department_b")
            dept_res = AnalyticsService.get_by_department(db, reporting_currency=currency)
            dept_map = {d.department.lower(): d for d in dept_res.departments}

            d_a = dept_map.get(dept_a_name.lower() if dept_a_name else "")
            d_b = dept_map.get(dept_b_name.lower() if dept_b_name else "")

            if not d_a or not d_b:
                return f"Could not find both {dept_a_name} and {dept_b_name} for comparison.", intent, {}, {}

            a_avg = cls._format_money(d_a.average_salary, currency)
            b_avg = cls._format_money(d_b.average_salary, currency)

            answer = (
                f"{d_a.department} ({d_a.headcount:,} employees) has an average salary of {a_avg}, "
                f"compared to {d_b.department} ({d_b.headcount:,} employees) with an average salary of {b_avg}."
            )
            data = {
                "department_a": {
                    "department": d_a.department,
                    "headcount": d_a.headcount,
                    "average_salary": float(d_a.average_salary),
                },
                "department_b": {
                    "department": d_b.department,
                    "headcount": d_b.headcount,
                    "average_salary": float(d_b.average_salary),
                },
                "currency": currency,
            }
            metadata = {
                "based_on": f"Direct department comparison normalized to {currency}",
            }
            return answer, intent, data, metadata

        if intent == "compare_countries":
            c_a_name = params.get("country_a")
            c_b_name = params.get("country_b")
            country_res = AnalyticsService.get_by_country(db, reporting_currency=currency)
            country_map = {c.country.lower(): c for c in country_res.countries}

            c_a = country_map.get(c_a_name.lower() if c_a_name else "")
            c_b = country_map.get(c_b_name.lower() if c_b_name else "")

            if not c_a or not c_b:
                return f"Could not find both {c_a_name} and {c_b_name} for comparison.", intent, {}, {}

            a_avg = cls._format_money(c_a.average_salary, currency)
            b_avg = cls._format_money(c_b.average_salary, currency)

            answer = (
                f"{c_a.country} ({c_a.headcount:,} employees) has an average salary of {a_avg}, "
                f"compared to {c_b.country} ({c_b.headcount:,} employees) with an average salary of {b_avg}."
            )
            data = {
                "country_a": {
                    "country": c_a.country,
                    "headcount": c_a.headcount,
                    "average_salary": float(c_a.average_salary),
                },
                "country_b": {
                    "country": c_b.country,
                    "headcount": c_b.headcount,
                    "average_salary": float(c_b.average_salary),
                },
                "currency": currency,
            }
            metadata = {
                "based_on": f"Direct country comparison normalized to {currency}",
            }
            return answer, intent, data, metadata

        if intent == "get_salary_by_department":
            dept_res = AnalyticsService.get_by_department(db, reporting_currency=currency)
            items = []
            for d in dept_res.departments:
                items.append(f"{d.department}: {cls._format_money(d.average_salary, currency)} ({d.headcount:,} employees)")

            summary = "; ".join(items)
            answer = f"Salary overview across all departments: {summary}."
            data = {
                "departments": [
                    {
                        "department": d.department,
                        "headcount": d.headcount,
                        "average_salary": float(d.average_salary),
                        "total_payroll": float(d.total_payroll),
                    }
                    for d in dept_res.departments
                ],
                "currency": currency,
            }
            metadata = {
                "based_on": f"Full departmental breakdown normalized to {currency}",
            }
            return answer, intent, data, metadata

        if intent == "get_salary_by_country":
            country_res = AnalyticsService.get_by_country(db, reporting_currency=currency)
            items = []
            for c in country_res.countries:
                items.append(f"{c.country}: {cls._format_money(c.average_salary, currency)} ({c.headcount:,} employees)")

            summary = "; ".join(items)
            answer = f"Salary overview across all countries: {summary}."
            data = {
                "countries": [
                    {
                        "country": c.country,
                        "currency": c.currency,
                        "headcount": c.headcount,
                        "average_salary": float(c.average_salary),
                        "total_payroll": float(c.total_payroll),
                    }
                    for c in country_res.countries
                ],
                "currency": currency,
            }
            metadata = {
                "based_on": f"Full country breakdown normalized to {currency}",
            }
            return answer, intent, data, metadata

        if intent == "get_salary_range_count":
            min_salary = params.get("min_salary")
            max_salary = params.get("max_salary")
            count, total_count = cls._query_salary_range(db, currency, min_salary, max_salary)
            pct = (count / total_count * 100) if total_count > 0 else 0.0

            if min_salary is not None and max_salary is not None:
                range_text = f"between {cls._format_money(min_salary, currency)} and {cls._format_money(max_salary, currency)}"
            elif min_salary is not None:
                range_text = f"greater than {cls._format_money(min_salary, currency)}"
            else:
                range_text = f"less than {cls._format_money(max_salary, currency)}"

            answer = (
                f"There are {count:,} employees earning {range_text} "
                f"({pct:.1f}% of total workforce)."
            )
            data = {
                "count": count,
                "total_workforce": total_count,
                "percentage": round(pct, 1),
                "min_salary": min_salary,
                "max_salary": max_salary,
                "currency": currency,
            }
            metadata = {
                "based_on": f"Salary range query normalized to {currency}",
            }
            return answer, intent, data, metadata

        if intent == "get_salary_distribution":
            dist = AnalyticsService.get_distribution(db, reporting_currency=currency)
            bracket_summaries = [f"{b.bracket}: {b.count:,} ({b.percentage}%)" for b in dist.brackets]
            answer = f"Compensation distribution tiers: {', '.join(bracket_summaries)}."
            data = {
                "brackets": [
                    {"bracket": b.bracket, "count": b.count, "percentage": b.percentage}
                    for b in dist.brackets
                ],
                "currency": currency,
            }
            metadata = {
                "based_on": f"Full distribution histogram normalized to {currency}",
            }
            return answer, intent, data, metadata

        answer = (
            "I specialize in employee headcount and compensation analytics for ACME Corporation. "
            "You can ask about: employee counts (by department or country), salary averages and medians, "
            "highest/lowest paid departments or countries, department comparisons, and salary distribution bands."
        )
        data = {
            "unsupported_question": original_question,
            "supported_categories": [
                "Employee Analytics",
                "Salary Metrics",
                "Grouping & Comparisons",
                "Salary Distribution",
            ],
        }
        metadata = {
            "status": "out_of_scope",
        }
        return answer, "unsupported_query", data, metadata

    @classmethod
    def _query_salary_range(
        cls,
        db: Session,
        currency: str,
        min_salary: Optional[float],
        max_salary: Optional[float],
    ) -> Tuple[int, int]:
        rep_curr = currency.strip().upper()
        where_clauses = ["1=1"]
        params: Dict[str, Any] = {"rep_curr": rep_curr}

        if min_salary is not None:
            where_clauses.append("normalized_salary >= :min_val")
            params["min_val"] = Decimal(str(min_salary))

        if max_salary is not None:
            where_clauses.append("normalized_salary <= :max_val")
            params["max_val"] = Decimal(str(max_salary))

        where_sql = " AND ".join(where_clauses)

        query = text(f"""
        WITH current_salaries AS (
            SELECT DISTINCT ON (s.employee_id)
                s.employee_id,
                s.amount * COALESCE(
                    CASE 
                        WHEN s.currency = :rep_curr THEN 1.0
                        WHEN er_direct.rate IS NOT NULL THEN er_direct.rate
                        WHEN er_inverse.rate IS NOT NULL AND er_inverse.rate > 0 THEN (1.0 / er_inverse.rate)
                        ELSE 1.0
                    END, 1.0) AS normalized_salary
            FROM salaries s
            JOIN employees e ON s.employee_id = e.id
            LEFT JOIN exchange_rates er_direct 
                ON er_direct.from_currency = s.currency 
                AND er_direct.to_currency = :rep_curr
            LEFT JOIN exchange_rates er_inverse 
                ON er_inverse.from_currency = :rep_curr 
                AND er_inverse.to_currency = s.currency
            WHERE s.effective_date <= CURRENT_DATE
            ORDER BY s.employee_id, s.effective_date DESC
        )
        SELECT 
            COUNT(*) FILTER (WHERE {where_sql}) AS matched_count,
            COUNT(*) AS total_count
        FROM current_salaries
        """)

        row = db.execute(query, params).fetchone()
        if not row:
            return 0, 0
        return int(row.matched_count or 0), int(row.total_count or 0)
