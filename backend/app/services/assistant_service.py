import re
from decimal import Decimal
from typing import Optional, Dict, Any, Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.domain.assistant_schemas import AssistantResponse
from app.services.analytics_service import AnalyticsService
from app.services.gemini_service import GeminiToolService


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

        tool_result = GeminiToolService.call_tool(q)
        if tool_result is not None:
            intent, params = tool_result
            answer, operation, data, metadata = cls._execute_intent(db, intent, params, currency, q)
            metadata["ai_provider"] = "AI Verified"
            metadata["based_on"] = "Verified enterprise database records"
            return AssistantResponse(
                answer=answer,
                operation=operation,
                data=data,
                metadata=metadata,
            )

        answer, operation, data, metadata = cls._execute_intent(
            db, "unsupported", {}, currency, q
        )
        metadata["ai_provider"] = "AI Assistant"
        metadata["based_on"] = "Enterprise AI Intelligence"
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
        if intent == "ai_text_response":
            answer = str(params.get("text") or "").strip()
            data = {"response_type": "text"}
            metadata = {"based_on": "Enterprise AI intelligence"}
            return answer, intent, data, metadata

        if intent == "query_employees":
            country = params.get("country")
            department = params.get("department")
            job_title = params.get("job_title")
            min_salary = params.get("min_salary")
            max_salary = params.get("max_salary")
            target_curr = params.get("currency") or currency
            sort_by = params.get("sort_by", "salary")
            sort_order = params.get("sort_order", "desc")
            limit = params.get("limit", 10)

            employees, total_matched = cls._query_employees_list(
                db=db,
                reporting_currency=target_curr,
                country=country,
                department=department,
                job_title=job_title,
                min_salary=min_salary,
                max_salary=max_salary,
                currency=target_curr,
                sort_by=sort_by,
                sort_order=sort_order,
                limit=limit,
            )

            if not employees:
                answer = "No active employees found matching the specified criteria."
                data = {
                    "count": 0,
                    "total_matched": 0,
                    "employees": [],
                    "currency": target_curr,
                    "filters": {
                        "country": country,
                        "department": department,
                        "job_title": job_title,
                        "min_salary": min_salary,
                        "max_salary": max_salary,
                    },
                }
                metadata = {"based_on": "Active employee database query"}
                return answer, intent, data, metadata

            scope_desc = []
            if job_title:
                scope_desc.append(f"with role matching '{job_title}'")
            if department:
                scope_desc.append(f"in {department}")
            if country:
                scope_desc.append(f"in {country}")
            scope_str = f" {' '.join(scope_desc)}" if scope_desc else ""

            threshold_desc = []
            if min_salary is not None and max_salary is not None:
                threshold_desc.append(f"earning between {cls._format_money(min_salary, target_curr)} and {cls._format_money(max_salary, target_curr)}")
            elif min_salary is not None:
                threshold_desc.append(f"earning more than {cls._format_money(min_salary, target_curr)}")
            elif max_salary is not None:
                threshold_desc.append(f"earning less than {cls._format_money(max_salary, target_curr)}")
            thresh_str = f" {' '.join(threshold_desc)}" if threshold_desc else ""

            order_desc = "highest paid" if str(sort_order).lower() == "desc" else "lowest paid"
            if len(employees) == 1:
                e = employees[0]
                answer = f"The {order_desc} employee{scope_str}{thresh_str} is {e['name']} ({e['job_title']}, {e['department']}), earning {e['formatted_native']} ({e['formatted_salary']})."
            else:
                top_e = employees[0]
                bottom_e = employees[-1]
                answer = (
                    f"Found {len(employees)} employees{scope_str}{thresh_str} ordered by {order_desc} "
                    f"(ranging from {top_e['formatted_salary']} to {bottom_e['formatted_salary']})."
                )

            data = {
                "count": len(employees),
                "total_matched": total_matched,
                "employees": employees,
                "currency": target_curr,
                "sort_by": sort_by,
                "sort_order": sort_order,
                "filters": {
                    "country": country,
                    "department": department,
                    "job_title": job_title,
                    "min_salary": min_salary,
                    "max_salary": max_salary,
                },
            }
            metadata = {
                "based_on": f"Verified active employee compensation records normalized to {target_curr}",
            }
            return answer, intent, data, metadata

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
                "based_on": "Active employee contract records",
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
                    {"based_on": "Active employee database query"},
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
                "based_on": "Verified employee record and active compensation history",
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
            country = params.get("country")
            dept = params.get("department")
            target_curr = params.get("currency") or currency
            count, total_count = cls._query_salary_range(
                db, target_curr, min_salary, max_salary, country=country, department=dept
            )
            pct = (count / total_count * 100) if total_count > 0 else 0.0

            scope_desc = []
            if dept:
                scope_desc.append(f"in {dept}")
            if country:
                scope_desc.append(f"in {country}")
            scope_str = f" {' '.join(scope_desc)}" if scope_desc else ""
            pct_scope = f"of workforce {' '.join(scope_desc)}" if scope_desc else "of total workforce"

            if min_salary is not None and max_salary is not None:
                range_text = f"between {cls._format_money(min_salary, target_curr)} and {cls._format_money(max_salary, target_curr)}"
            elif min_salary is not None:
                range_text = f"greater than {cls._format_money(min_salary, target_curr)}"
            else:
                range_text = f"less than {cls._format_money(max_salary, target_curr)}"

            answer = (
                f"There are {count:,} employees{scope_str} earning {range_text} "
                f"({pct:.1f}% {pct_scope})."
            )
            data = {
                "count": count,
                "total_workforce": total_count,
                "percentage": round(pct, 1),
                "min_salary": min_salary,
                "max_salary": max_salary,
                "currency": target_curr,
                "country": country,
                "department": dept,
            }
            metadata = {
                "based_on": f"Salary range query normalized to {target_curr}",
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
            "I specialize in enterprise compensation and employee workforce intelligence. "
            "You can ask me to search, filter, rank, or analyze our workforce—such as:\n"
            "• 'Top 50 employees in India by salary'\n"
            "• 'Employees in India earning more than 50K (lowest 10)'\n"
            "• 'Who has the highest or lowest salary in Engineering?'\n"
            "• 'Average and median salary across departments or countries'\n"
            "• 'Compare Engineering and Finance'\n"
            "• 'How many employees earn between 50,000 and 100,000?'"
        )
        data = {
            "unsupported_question": original_question,
            "supported_categories": [
                "Employee Analytics & Headcount",
                "Salary Rankings & Custom Thresholds",
                "Department & Country Benchmarks",
                "Compensation Distribution Bands",
            ],
        }
        metadata = {
            "status": "out_of_scope",
            "based_on": "Enterprise Intelligence Guidelines",
        }
        return answer, "unsupported_query", data, metadata

    @classmethod
    def _query_salary_range(
        cls,
        db: Session,
        currency: str,
        min_salary: Optional[float],
        max_salary: Optional[float],
        country: Optional[str] = None,
        department: Optional[str] = None,
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

        scope_clauses = ["s.effective_date <= CURRENT_DATE"]
        if country:
            scope_clauses.append("e.country = :country")
            params["country"] = country
        if department:
            scope_clauses.append("e.department = :department")
            params["department"] = department
        scope_sql = " AND ".join(scope_clauses)

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
            WHERE {scope_sql}
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

    @classmethod
    def _query_employees_list(
        cls,
        db: Session,
        reporting_currency: str,
        country: Optional[str] = None,
        department: Optional[str] = None,
        job_title: Optional[str] = None,
        min_salary: Optional[float] = None,
        max_salary: Optional[float] = None,
        currency: Optional[str] = None,
        sort_by: str = "salary",
        sort_order: str = "desc",
        limit: int = 10,
    ) -> Tuple[List[Dict[str, Any]], int]:
        rep_curr = (currency or reporting_currency).strip().upper()
        order_dir = "ASC" if str(sort_order).lower() == "asc" else "DESC"
        limit_val = max(1, min(int(limit or 10), 100))

        scope_clauses = ["s.effective_date <= CURRENT_DATE"]
        sql_params: Dict[str, Any] = {"rep_curr": rep_curr, "limit": limit_val}

        if country:
            scope_clauses.append("LOWER(e.country) = LOWER(:country)")
            sql_params["country"] = country
        if department:
            scope_clauses.append("LOWER(e.department) = LOWER(:department)")
            sql_params["department"] = department
        if job_title:
            scope_clauses.append("LOWER(e.job_title) LIKE :job_title")
            sql_params["job_title"] = f"%{job_title.lower()}%"

        scope_sql = " AND ".join(scope_clauses)

        where_clauses = ["1=1"]
        if min_salary is not None:
            where_clauses.append("amount_conv >= :min_salary")
            sql_params["min_salary"] = Decimal(str(min_salary))
        if max_salary is not None:
            where_clauses.append("amount_conv <= :max_salary")
            sql_params["max_salary"] = Decimal(str(max_salary))

        where_sql = " AND ".join(where_clauses)

        if str(sort_by).lower() == "name":
            order_sql = f"last_name {order_dir}, first_name {order_dir}"
        else:
            order_sql = f"amount_conv {order_dir}, employee_id ASC"

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
            WHERE {scope_sql}
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
                cs.currency AS native_currency,
                cs.amount AS native_amount,
                ROUND(
                    cs.amount * COALESCE(
                        CASE 
                            WHEN cs.currency = :rep_curr THEN 1.0
                            WHEN er_direct.rate IS NOT NULL THEN er_direct.rate
                            WHEN er_inverse.rate IS NOT NULL AND er_inverse.rate > 0 THEN (1.0 / er_inverse.rate)
                            ELSE 1.0
                        END, 1.0
                    ), 2
                ) AS amount_conv
            FROM current_salaries cs
            LEFT JOIN exchange_rates er_direct 
                ON er_direct.from_currency = cs.currency 
               AND er_direct.to_currency = :rep_curr
            LEFT JOIN exchange_rates er_inverse 
                ON er_inverse.from_currency = :rep_curr 
               AND er_inverse.to_currency = cs.currency
        )
        SELECT * FROM converted_salaries
        WHERE {where_sql}
        ORDER BY {order_sql}
        LIMIT :limit;
        """)

        rows = db.execute(query, sql_params).mappings().all()

        count_query = text(f"""
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
            WHERE {scope_sql}
            ORDER BY s.employee_id, s.effective_date DESC, s.id DESC
        ),
        converted_salaries AS (
            SELECT
                cs.employee_id,
                ROUND(
                    cs.amount * COALESCE(
                        CASE 
                            WHEN cs.currency = :rep_curr THEN 1.0
                            WHEN er_direct.rate IS NOT NULL THEN er_direct.rate
                            WHEN er_inverse.rate IS NOT NULL AND er_inverse.rate > 0 THEN (1.0 / er_inverse.rate)
                            ELSE 1.0
                        END, 1.0
                    ), 2
                ) AS amount_conv
            FROM current_salaries cs
            LEFT JOIN exchange_rates er_direct 
                ON er_direct.from_currency = cs.currency 
               AND er_direct.to_currency = :rep_curr
            LEFT JOIN exchange_rates er_inverse 
                ON er_inverse.from_currency = :rep_curr 
               AND er_inverse.to_currency = cs.currency
        )
        SELECT COUNT(*) FROM converted_salaries
        WHERE {where_sql};
        """)
        total_count = db.execute(count_query, sql_params).scalar() or 0

        employees = []
        for idx, row in enumerate(rows):
            raw_amt = float(row["native_amount"])
            conv_amt = float(row["amount_conv"])
            native_curr = row["native_currency"]
            employees.append({
                "rank": idx + 1,
                "employee_id": row["employee_id"],
                "name": f"{row['first_name']} {row['last_name']}",
                "first_name": row["first_name"],
                "last_name": row["last_name"],
                "job_title": row["job_title"],
                "department": row["department"],
                "country": row["country"],
                "native_salary": raw_amt,
                "native_currency": native_curr,
                "salary": conv_amt,
                "currency": rep_curr,
                "formatted_salary": cls._format_money(conv_amt, rep_curr),
                "formatted_native": cls._format_money(raw_amt, native_curr),
            })

        return employees, int(total_count)
