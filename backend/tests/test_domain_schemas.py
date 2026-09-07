from datetime import date
from decimal import Decimal
import pytest
from pydantic import ValidationError
from app.domain.schemas import (
    SalaryCreate,
    EmployeeCreate,
)


def test_salary_create_valid():
    salary_in = SalaryCreate(
        amount=Decimal("85000.00"),
        effective_date=date(2025, 1, 1),
        change_reason="Starting Salary",
    )
    assert salary_in.amount == Decimal("85000.00")
    assert salary_in.effective_date == date(2025, 1, 1)
    assert salary_in.change_reason == "Starting Salary"


def test_salary_create_invalid_amount_zero_or_negative():
    with pytest.raises(ValidationError):
        SalaryCreate(
            amount=Decimal("0.00"),
            effective_date=date(2025, 1, 1),
        )

    with pytest.raises(ValidationError):
        SalaryCreate(
            amount=Decimal("-500.00"),
            effective_date=date(2025, 1, 1),
        )


def test_employee_create_valid():
    emp_in = EmployeeCreate(
        employee_code="EMP-00101",
        first_name="Priya",
        last_name="Sharma",
        email="priya.sharma@acme.corp",
        department="Engineering",
        job_title="Senior Software Craftsperson",
        country="India",
        currency="INR",
        hire_date=date(2024, 3, 1),
        initial_salary=SalaryCreate(
            amount=Decimal("1800000.00"),
            effective_date=date(2024, 3, 1),
            change_reason="Starting Salary",
        ),
    )
    assert emp_in.employee_code == "EMP-00101"
    assert emp_in.currency == "INR"
    assert emp_in.initial_salary.amount == Decimal("1800000.00")


def test_employee_create_invalid_email():
    with pytest.raises(ValidationError):
        EmployeeCreate(
            employee_code="EMP-00102",
            first_name="John",
            last_name="Doe",
            email="not-an-email",
            department="Sales",
            job_title="Representative",
            country="United States",
            currency="USD",
            hire_date=date(2024, 1, 1),
            initial_salary=SalaryCreate(
                amount=Decimal("60000.00"),
                effective_date=date(2024, 1, 1),
            ),
        )


def test_employee_create_invalid_currency_code():
    with pytest.raises(ValidationError):
        EmployeeCreate(
            employee_code="EMP-00103",
            first_name="John",
            last_name="Doe",
            email="john.doe@acme.corp",
            department="Sales",
            job_title="Representative",
            country="United States",
            currency="US",  # Not 3 characters
            hire_date=date(2024, 1, 1),
            initial_salary=SalaryCreate(
                amount=Decimal("60000.00"),
                effective_date=date(2024, 1, 1),
            ),
        )
