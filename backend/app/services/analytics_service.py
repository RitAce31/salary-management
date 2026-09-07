from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.domain.schemas import (
    AnalyticsOverview,
    DepartmentMetric,
    DepartmentAnalyticsResponse,
    CountryMetric,
    CountryAnalyticsResponse,
    SalaryBracket,
    DistributionAnalyticsResponse,
)


class AnalyticsService:
    """
    High-performance organizational compensation analytics engine.
    Executes native PostgreSQL aggregations with on-the-fly multi-currency normalization.
    """

    DISTRIBUTION_BRACKETS = [
        "< $30k",
        "$30k - $50k",
        "$50k - $75k",
        "$75k - $100k",
        "$100k - $150k",
        "$150k - $200k",
        "$200k+",
    ]

    @classmethod
    def get_overview(
        cls,
        db: Session,
        reporting_currency: str = "USD",
        department: Optional[str] = None,
        country: Optional[str] = None,
    ) -> AnalyticsOverview:
        """
        Calculates organizational compensation overview metrics normalized to reporting currency.
        Supports optional filtering by department and country.
        """
        rep_curr = reporting_currency.strip().upper()
        where_clauses = ["s.effective_date <= CURRENT_DATE"]
        params: Dict[str, Any] = {"rep_curr": rep_curr}

        if department:
            where_clauses.append("e.department = :dept")
            params["dept"] = department.strip()
        if country:
            where_clauses.append("e.country = :country")
            params["country"] = country.strip()

        where_sql = " AND ".join(where_clauses)

        query = text(f"""
        WITH current_salaries AS (
            SELECT DISTINCT ON (s.employee_id)
                s.employee_id,
                s.amount,
                s.currency,
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
        SELECT
            COUNT(*) AS total_headcount,
            COALESCE(ROUND(SUM(amount_conv), 2), 0) AS total_payroll,
            COALESCE(ROUND(AVG(amount_conv), 2), 0) AS average_salary,
            COALESCE(ROUND(CAST(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount_conv) AS NUMERIC), 2), 0) AS median_salary,
            COALESCE(ROUND(MIN(amount_conv), 2), 0) AS min_salary,
            COALESCE(ROUND(MAX(amount_conv), 2), 0) AS max_salary
        FROM converted_salaries;
        """)

        row = db.execute(query, params).mappings().first()

        return AnalyticsOverview(
            reporting_currency=rep_curr,
            total_headcount=int(row["total_headcount"]),
            total_payroll=Decimal(str(row["total_payroll"])),
            average_salary=Decimal(str(row["average_salary"])),
            median_salary=Decimal(str(row["median_salary"])),
            min_salary=Decimal(str(row["min_salary"])),
            max_salary=Decimal(str(row["max_salary"])),
        )

    @classmethod
    def get_by_department(
        cls,
        db: Session,
        reporting_currency: str = "USD",
        country: Optional[str] = None,
    ) -> DepartmentAnalyticsResponse:
        """
        Aggregates compensation and headcount metrics grouped by department,
        normalized to reporting currency.
        """
        rep_curr = reporting_currency.strip().upper()
        where_clauses = ["s.effective_date <= CURRENT_DATE"]
        params: Dict[str, Any] = {"rep_curr": rep_curr}

        if country:
            where_clauses.append("e.country = :country")
            params["country"] = country.strip()

        where_sql = " AND ".join(where_clauses)

        query = text(f"""
        WITH current_salaries AS (
            SELECT DISTINCT ON (s.employee_id)
                s.employee_id,
                s.amount,
                s.currency,
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
        SELECT
            department,
            COUNT(*) AS headcount,
            COALESCE(ROUND(SUM(amount_conv), 2), 0) AS total_payroll,
            COALESCE(ROUND(AVG(amount_conv), 2), 0) AS average_salary,
            COALESCE(ROUND(CAST(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount_conv) AS NUMERIC), 2), 0) AS median_salary,
            COALESCE(ROUND(MIN(amount_conv), 2), 0) AS min_salary,
            COALESCE(ROUND(MAX(amount_conv), 2), 0) AS max_salary
        FROM converted_salaries
        GROUP BY department
        ORDER BY total_payroll DESC;
        """)

        rows = db.execute(query, params).mappings().all()

        dept_metrics = [
            DepartmentMetric(
                department=r["department"],
                headcount=int(r["headcount"]),
                total_payroll=Decimal(str(r["total_payroll"])),
                average_salary=Decimal(str(r["average_salary"])),
                median_salary=Decimal(str(r["median_salary"])),
                min_salary=Decimal(str(r["min_salary"])),
                max_salary=Decimal(str(r["max_salary"])),
            )
            for r in rows
        ]

        return DepartmentAnalyticsResponse(
            reporting_currency=rep_curr,
            departments=dept_metrics,
        )

    @classmethod
    def get_by_country(
        cls,
        db: Session,
        reporting_currency: str = "USD",
        department: Optional[str] = None,
    ) -> CountryAnalyticsResponse:
        """
        Aggregates compensation and headcount metrics grouped by country and native currency,
        with total spend and averages normalized to reporting currency.
        """
        rep_curr = reporting_currency.strip().upper()
        where_clauses = ["s.effective_date <= CURRENT_DATE"]
        params: Dict[str, Any] = {"rep_curr": rep_curr}

        if department:
            where_clauses.append("e.department = :dept")
            params["dept"] = department.strip()

        where_sql = " AND ".join(where_clauses)

        query = text(f"""
        WITH current_salaries AS (
            SELECT DISTINCT ON (s.employee_id)
                s.employee_id,
                s.amount,
                s.currency,
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
        SELECT
            country,
            currency,
            COUNT(*) AS headcount,
            COALESCE(ROUND(SUM(amount_conv), 2), 0) AS total_payroll,
            COALESCE(ROUND(AVG(amount_conv), 2), 0) AS average_salary,
            COALESCE(ROUND(CAST(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount_conv) AS NUMERIC), 2), 0) AS median_salary
        FROM converted_salaries
        GROUP BY country, currency
        ORDER BY headcount DESC;
        """)

        rows = db.execute(query, params).mappings().all()

        country_metrics = [
            CountryMetric(
                country=r["country"],
                currency=r["currency"],
                headcount=int(r["headcount"]),
                total_payroll=Decimal(str(r["total_payroll"])),
                average_salary=Decimal(str(r["average_salary"])),
                median_salary=Decimal(str(r["median_salary"])),
            )
            for r in rows
        ]

        return CountryAnalyticsResponse(
            reporting_currency=rep_curr,
            countries=country_metrics,
        )

    @classmethod
    def get_salary_distribution(
        cls,
        db: Session,
        reporting_currency: str = "USD",
        department: Optional[str] = None,
        country: Optional[str] = None,
    ) -> DistributionAnalyticsResponse:
        """
        Calculates organizational salary distribution histogram buckets in reporting currency.
        Guarantees all 7 standard buckets are represented in the response.
        """
        rep_curr = reporting_currency.strip().upper()
        where_clauses = ["s.effective_date <= CURRENT_DATE"]
        params: Dict[str, Any] = {"rep_curr": rep_curr}

        if department:
            where_clauses.append("e.department = :dept")
            params["dept"] = department.strip()
        if country:
            where_clauses.append("e.country = :country")
            params["country"] = country.strip()

        where_sql = " AND ".join(where_clauses)

        query = text(f"""
        WITH current_salaries AS (
            SELECT DISTINCT ON (s.employee_id)
                s.employee_id,
                s.amount,
                s.currency,
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
        SELECT
            CASE
                WHEN amount_conv < 30000 THEN '< $30k'
                WHEN amount_conv >= 30000 AND amount_conv < 50000 THEN '$30k - $50k'
                WHEN amount_conv >= 50000 AND amount_conv < 75000 THEN '$50k - $75k'
                WHEN amount_conv >= 75000 AND amount_conv < 100000 THEN '$75k - $100k'
                WHEN amount_conv >= 100000 AND amount_conv < 150000 THEN '$100k - $150k'
                WHEN amount_conv >= 150000 AND amount_conv < 200000 THEN '$150k - $200k'
                ELSE '$200k+'
            END AS bracket,
            CASE
                WHEN amount_conv < 30000 THEN 1
                WHEN amount_conv >= 30000 AND amount_conv < 50000 THEN 2
                WHEN amount_conv >= 50000 AND amount_conv < 75000 THEN 3
                WHEN amount_conv >= 75000 AND amount_conv < 100000 THEN 4
                WHEN amount_conv >= 100000 AND amount_conv < 150000 THEN 5
                WHEN amount_conv >= 150000 AND amount_conv < 200000 THEN 6
                ELSE 7
            END AS sort_order,
            COUNT(*) AS count
        FROM converted_salaries
        GROUP BY bracket, sort_order
        ORDER BY sort_order;
        """)

        rows = db.execute(query, params).mappings().all()

        counts_by_bracket = {r["bracket"]: int(r["count"]) for r in rows}
        total_matching = sum(counts_by_bracket.values())

        brackets = []
        for b_name in cls.DISTRIBUTION_BRACKETS:
            count = counts_by_bracket.get(b_name, 0)
            pct = round((count / total_matching * 100), 2) if total_matching > 0 else 0.0
            brackets.append(SalaryBracket(bracket=b_name, count=count, percentage=pct))

        return DistributionAnalyticsResponse(
            reporting_currency=rep_curr,
            brackets=brackets,
        )
