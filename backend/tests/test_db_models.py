from datetime import date
from decimal import Decimal
import pytest
from sqlalchemy.exc import IntegrityError
from app.db.models import Employee, Salary, ExchangeRate


def test_create_employee_with_salary_history(db):
    """Verify that an employee can be created and salary history appended without overwriting."""
    employee = Employee(
        employee_code="EMP-TEST-001",
        first_name="Ritesh",
        last_name="Mistri",
        email="ritesh.test@acme.corp",
        department="Engineering",
        job_title="Software Craftsperson",
        country="India",
        currency="INR",
        hire_date=date(2024, 1, 15),
    )
    db.add(employee)
    db.flush()

    assert employee.id is not None

    # 1. Initial Salary
    salary_2024 = Salary(
        employee_id=employee.id,
        amount=Decimal("1200000.00"),
        currency="INR",
        effective_date=date(2024, 1, 15),
        change_reason="Starting Salary",
    )
    db.add(salary_2024)
    db.flush()

    # 2. Append New Salary (Raise in 2025)
    salary_2025 = Salary(
        employee_id=employee.id,
        amount=Decimal("1500000.00"),
        currency="INR",
        effective_date=date(2025, 1, 15),
        change_reason="Annual Merit Increment",
    )
    db.add(salary_2025)
    db.flush()

    # 3. Append New Salary (Promotion in 2026)
    salary_2026 = Salary(
        employee_id=employee.id,
        amount=Decimal("1800000.00"),
        currency="INR",
        effective_date=date(2026, 1, 15),
        change_reason="Promotion to Lead Craftsperson",
    )
    db.add(salary_2026)
    db.flush()

    # Query back employee and verify history
    db.refresh(employee)
    salaries = employee.salaries
    assert len(salaries) == 3

    # Ordered by effective_date DESC
    assert salaries[0].effective_date == date(2026, 1, 15)
    assert salaries[0].amount == Decimal("1800000.00")
    assert salaries[1].effective_date == date(2025, 1, 15)
    assert salaries[1].amount == Decimal("1500000.00")
    assert salaries[2].effective_date == date(2024, 1, 15)
    assert salaries[2].amount == Decimal("1200000.00")


def test_salary_positive_amount_check_constraint(db):
    """Verify that salary amount must be greater than zero."""
    employee = Employee(
        employee_code="EMP-TEST-002",
        first_name="Jane",
        last_name="Doe",
        email="jane.doe@acme.corp",
        department="Product",
        job_title="Product Manager",
        country="United States",
        currency="USD",
        hire_date=date(2024, 2, 1),
    )
    db.add(employee)
    db.flush()

    invalid_salary = Salary(
        employee_id=employee.id,
        amount=Decimal("-100.00"),
        currency="USD",
        effective_date=date(2024, 2, 1),
        change_reason="Invalid",
    )
    db.add(invalid_salary)
    with pytest.raises(IntegrityError):
        db.flush()


def test_exchange_rate_model(db):
    """Verify exchange rate storage and unique constraint per currency pair & reference date."""
    rate = ExchangeRate(
        from_currency="JPY",
        to_currency="USD",
        rate=Decimal("0.006500"),
        reference_date=date(2026, 1, 1),
    )
    db.add(rate)
    db.flush()

    assert rate.id is not None

    duplicate_rate = ExchangeRate(
        from_currency="JPY",
        to_currency="USD",
        rate=Decimal("0.006700"),
        reference_date=date(2026, 1, 1),
    )
    db.add(duplicate_rate)
    with pytest.raises(IntegrityError):
        db.flush()

