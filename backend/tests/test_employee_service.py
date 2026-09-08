from datetime import date
from decimal import Decimal
import pytest
from app.domain.schemas import EmployeeCreate, SalaryCreate
from app.domain.exceptions import (
    DuplicateEmployeeCodeError,
    DuplicateEmailError,
)
from app.services.employee_service import (
    create_employee,
    get_employee_by_id,
    list_employees,
)


def test_create_employee_atomic_success(db):
    """Verify that creating an employee also creates their starting salary in one atomic transaction."""
    emp_in = EmployeeCreate(
        employee_code="EMP-EMP-001",
        first_name="Carlos",
        last_name="Santana",
        email="carlos.santana@acme.corp",
        department="Engineering",
        job_title="DevOps Engineer",
        country="Spain",
        currency="EUR",
        hire_date=date(2024, 5, 1),
        initial_salary=SalaryCreate(
            amount=Decimal("65000.00"),
            effective_date=date(2024, 5, 1),
            change_reason="Starting Salary",
        ),
    )
    employee = create_employee(db, emp_in)

    assert employee.id is not None
    assert employee.employee_code == "EMP-EMP-001"
    assert len(employee.salaries) == 1
    assert employee.salaries[0].amount == Decimal("65000.00")
    assert employee.salaries[0].currency == "EUR"


def test_create_employee_duplicate_code_raises_error(db):
    """Verify that duplicate employee codes are rejected."""
    emp_in1 = EmployeeCreate(
        employee_code="EMP-DUP-001",
        first_name="User",
        last_name="One",
        email="user.one@acme.corp",
        department="Operations",
        job_title="Coordinator",
        country="United States",
        currency="USD",
        hire_date=date(2024, 1, 1),
        initial_salary=SalaryCreate(
            amount=Decimal("50000.00"),
            effective_date=date(2024, 1, 1),
        ),
    )
    create_employee(db, emp_in1)

    emp_in2 = EmployeeCreate(
        employee_code="EMP-DUP-001",  # Same code
        first_name="User",
        last_name="Two",
        email="user.two@acme.corp",
        department="Operations",
        job_title="Coordinator",
        country="United States",
        currency="USD",
        hire_date=date(2024, 1, 1),
        initial_salary=SalaryCreate(
            amount=Decimal("55000.00"),
            effective_date=date(2024, 1, 1),
        ),
    )
    with pytest.raises(DuplicateEmployeeCodeError):
        create_employee(db, emp_in2)


def test_create_employee_duplicate_email_raises_error(db):
    """Verify that duplicate corporate email addresses are rejected."""
    emp_in1 = EmployeeCreate(
        employee_code="EMP-EML-001",
        first_name="Test",
        last_name="Alpha",
        email="same.email@acme.corp",
        department="HR",
        job_title="Recruiter",
        country="United States",
        currency="USD",
        hire_date=date(2024, 1, 1),
        initial_salary=SalaryCreate(
            amount=Decimal("50000.00"),
            effective_date=date(2024, 1, 1),
        ),
    )
    create_employee(db, emp_in1)

    emp_in2 = EmployeeCreate(
        employee_code="EMP-EML-002",  # Different code
        first_name="Test",
        last_name="Beta",
        email="same.email@acme.corp",  # Same email
        department="HR",
        job_title="Recruiter",
        country="United States",
        currency="USD",
        hire_date=date(2024, 1, 1),
        initial_salary=SalaryCreate(
            amount=Decimal("50000.00"),
            effective_date=date(2024, 1, 1),
        ),
    )
    with pytest.raises(DuplicateEmailError):
        create_employee(db, emp_in2)


def test_list_employees_pagination_and_current_salaries(db):
    """Verify that list_employees supports pagination and attaches current salaries without N+1 queries."""
    # Create 3 employees
    for i in range(1, 4):
        create_employee(
            db,
            EmployeeCreate(
                employee_code=f"EMP-PAGE-{i:03d}",
                first_name=f"Worker{i}",
                last_name="Test",
                email=f"worker{i}@acme.corp",
                department="Engineering" if i <= 2 else "Marketing",
                job_title="Staff",
                country="India" if i == 1 else "Germany",
                currency="INR" if i == 1 else "EUR",
                hire_date=date(2024, 1, 1),
                initial_salary=SalaryCreate(
                    amount=Decimal(f"{50000 + i * 10000}.00"),
                    effective_date=date(2024, 1, 1),
                ),
            ),
        )

    # 1. Test pagination
    employees, total, current_salaries = list_employees(
        db, page=1, page_size=2, search="Worker", department="Engineering"
    )
    assert total == 2
    assert len(employees) == 2
    assert all(e.id in current_salaries for e in employees)

    # 2. Test search filter
    employees_search, total_search, _ = list_employees(
        db, page=1, page_size=10, search="Worker1"
    )
    assert total_search == 1
    assert employees_search[0].first_name == "Worker1"

    # 3. Test full name search (first + last name combined)
    employees_fullname, total_fullname, _ = list_employees(
        db, page=1, page_size=10, search="Worker1 Test"
    )
    assert total_fullname == 1
    assert employees_fullname[0].first_name == "Worker1"

    # 4. Test reverse full name search (last + first name)
    employees_rev, total_rev, _ = list_employees(
        db, page=1, page_size=10, search="Test Worker2"
    )
    assert total_rev == 1
    assert employees_rev[0].first_name == "Worker2"

