from datetime import date
from decimal import Decimal
import pytest
from app.db.models import Employee
from app.domain.schemas import SalaryCreate
from app.domain.exceptions import EmployeeNotFoundError, InvalidSalaryAmountError
from app.services.salary_service import (
    add_salary_adjustment,
    get_salary_history,
    get_current_salary,
)


@pytest.fixture
def test_employee(db):
    emp = Employee(
        employee_code="EMP-SAL-001",
        first_name="Alice",
        last_name="Smith",
        email="alice.smith@acme.corp",
        department="Finance",
        job_title="Financial Analyst",
        country="United Kingdom",
        currency="GBP",
        hire_date=date(2023, 1, 1),
    )
    db.add(emp)
    db.flush()
    return emp


def test_add_salary_adjustment_preserves_history(db, test_employee):
    """Verify that adding new salary adjustments appends records without modifying past records."""
    # 1. Starting salary
    sal1 = add_salary_adjustment(
        db,
        employee_id=test_employee.id,
        salary_in=SalaryCreate(
            amount=Decimal("45000.00"),
            effective_date=date(2023, 1, 1),
            change_reason="Starting Salary",
        ),
    )
    assert sal1.id is not None
    assert sal1.currency == "GBP"

    # 2. Raise in 2024
    sal2 = add_salary_adjustment(
        db,
        employee_id=test_employee.id,
        salary_in=SalaryCreate(
            amount=Decimal("52000.00"),
            effective_date=date(2024, 1, 1),
            change_reason="Annual Merit Increment",
        ),
    )
    assert sal2.id != sal1.id

    # 3. Retrieve history
    history = get_salary_history(db, employee_id=test_employee.id)
    assert len(history) == 2
    # Verify chronological descending order
    assert history[0].amount == Decimal("52000.00")
    assert history[0].effective_date == date(2024, 1, 1)
    assert history[1].amount == Decimal("45000.00")
    assert history[1].effective_date == date(2023, 1, 1)


def test_get_current_salary_respects_effective_date(db, test_employee):
    """Verify that current salary resolution selects the latest record with effective_date <= reference date."""
    add_salary_adjustment(
        db,
        employee_id=test_employee.id,
        salary_in=SalaryCreate(
            amount=Decimal("45000.00"),
            effective_date=date(2023, 1, 1),
            change_reason="Starting Salary",
        ),
    )
    add_salary_adjustment(
        db,
        employee_id=test_employee.id,
        salary_in=SalaryCreate(
            amount=Decimal("50000.00"),
            effective_date=date(2024, 1, 1),
            change_reason="2024 Raise",
        ),
    )
    # Future scheduled salary
    add_salary_adjustment(
        db,
        employee_id=test_employee.id,
        salary_in=SalaryCreate(
            amount=Decimal("60000.00"),
            effective_date=date(2030, 1, 1),
            change_reason="Future Promotion",
        ),
    )

    # As of mid-2024, current salary should be 50,000 GBP (future 60,000 GBP must NOT be active)
    current = get_current_salary(db, employee_id=test_employee.id, as_of_date=date(2024, 6, 1))
    assert current is not None
    assert current.amount == Decimal("50000.00")
    assert current.effective_date == date(2024, 1, 1)


def test_add_salary_nonexistent_employee_raises_error(db):
    """Verify that attempting to add a salary for a non-existent employee raises EmployeeNotFoundError."""
    with pytest.raises(EmployeeNotFoundError):
        add_salary_adjustment(
            db,
            employee_id=999999,
            salary_in=SalaryCreate(
                amount=Decimal("70000.00"),
                effective_date=date(2024, 1, 1),
            ),
        )
