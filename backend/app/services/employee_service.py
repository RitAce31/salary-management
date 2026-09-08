from datetime import date
from typing import Dict, List, Optional, Tuple
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session
from app.db.models import Employee, Salary
from app.domain.schemas import EmployeeCreate, EmployeeUpdate
from app.domain.exceptions import (
    DuplicateEmployeeCodeError,
    DuplicateEmailError,
    EmployeeNotFoundError,
)


def create_employee(
    db: Session,
    employee_in: EmployeeCreate,
) -> Employee:
    """Creates an employee and their initial starting salary in a single atomic database transaction."""
    # Check for unique employee_code
    existing_code = db.scalar(
        select(Employee).where(Employee.employee_code == employee_in.employee_code)
    )
    if existing_code:
        raise DuplicateEmployeeCodeError(employee_in.employee_code)

    # Check for unique email
    existing_email = db.scalar(
        select(Employee).where(Employee.email == employee_in.email)
    )
    if existing_email:
        raise DuplicateEmailError(employee_in.email)

    employee = Employee(
        employee_code=employee_in.employee_code,
        first_name=employee_in.first_name,
        last_name=employee_in.last_name,
        email=employee_in.email,
        department=employee_in.department,
        job_title=employee_in.job_title,
        country=employee_in.country,
        currency=employee_in.currency,
        hire_date=employee_in.hire_date,
    )
    db.add(employee)
    db.flush()

    # Initial starting salary record
    initial_salary = Salary(
        employee_id=employee.id,
        amount=employee_in.initial_salary.amount,
        currency=employee.currency,
        effective_date=employee_in.initial_salary.effective_date,
        change_reason=employee_in.initial_salary.change_reason or "Starting Salary",
    )
    db.add(initial_salary)
    db.flush()

    db.refresh(employee)
    return employee


def get_employee_by_id(
    db: Session,
    employee_id: int,
) -> Optional[Employee]:
    """Retrieves an employee by internal primary key ID."""
    return db.get(Employee, employee_id)


def list_employees(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    department: Optional[str] = None,
    country: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> Tuple[List[Employee], int, Dict[int, Salary]]:
    """Retrieves a paginated list of employees matching filter criteria, with current active salaries.

    Avoids N+1 queries by resolving the latest current salary for all fetched employees in a single query.
    """
    stmt = select(Employee)

    # Filtering
    if department:
        stmt = stmt.where(Employee.department == department)
    if country:
        stmt = stmt.where(Employee.country == country)
    if search:
        search_clean = search.strip()
        search_term = f"%{search_clean}%"
        full_name = func.concat(Employee.first_name, " ", Employee.last_name)
        reverse_full_name = func.concat(Employee.last_name, " ", Employee.first_name)

        words = search_clean.split()
        if len(words) > 1:
            word_conditions = [
                or_(
                    Employee.first_name.ilike(f"%{w}%"),
                    Employee.last_name.ilike(f"%{w}%"),
                    Employee.email.ilike(f"%{w}%"),
                    Employee.employee_code.ilike(f"%{w}%"),
                    Employee.job_title.ilike(f"%{w}%"),
                )
                for w in words
            ]
            stmt = stmt.where(
                or_(
                    full_name.ilike(search_term),
                    reverse_full_name.ilike(search_term),
                    Employee.email.ilike(search_term),
                    Employee.employee_code.ilike(search_term),
                    and_(*word_conditions),
                )
            )
        else:
            stmt = stmt.where(
                or_(
                    Employee.first_name.ilike(search_term),
                    Employee.last_name.ilike(search_term),
                    full_name.ilike(search_term),
                    Employee.email.ilike(search_term),
                    Employee.employee_code.ilike(search_term),
                    Employee.job_title.ilike(search_term),
                )
            )

    # Total Count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    # Sorting
    sort_fields = {
        "created_at": Employee.created_at,
        "hire_date": Employee.hire_date,
        "first_name": Employee.first_name,
        "last_name": Employee.last_name,
        "department": Employee.department,
        "country": Employee.country,
        "employee_code": Employee.employee_code,
    }
    order_column = sort_fields.get(sort_by, Employee.created_at)
    stmt = stmt.order_by(order_column.asc() if sort_order == "asc" else order_column.desc())

    # Pagination
    offset = max(0, (page - 1) * page_size)
    stmt = stmt.offset(offset).limit(page_size)
    employees = list(db.scalars(stmt).all())

    # Resolve Current Salaries in a single batched query (No N+1)
    current_salaries: Dict[int, Salary] = {}
    if employees:
        employee_ids = [e.id for e in employees]
        today = date.today()
        salary_batch_stmt = (
            select(Salary)
            .distinct(Salary.employee_id)
            .where(
                Salary.employee_id.in_(employee_ids),
                Salary.effective_date <= today,
            )
            .order_by(Salary.employee_id, Salary.effective_date.desc(), Salary.id.desc())
        )
        for sal in db.scalars(salary_batch_stmt).all():
            current_salaries[sal.employee_id] = sal

    return employees, total, current_salaries


def update_employee(
    db: Session,
    employee_id: int,
    employee_in: EmployeeUpdate,
) -> Employee:
    """Updates profile attributes for an existing employee."""
    employee = db.get(Employee, employee_id)
    if not employee:
        raise EmployeeNotFoundError(employee_id)

    if employee_in.email is not None and employee_in.email != employee.email:
        existing_email = db.scalar(
            select(Employee).where(
                Employee.email == employee_in.email,
                Employee.id != employee_id,
            )
        )
        if existing_email:
            raise DuplicateEmailError(employee_in.email)

    update_data = employee_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(employee, field, value)

    db.flush()
    db.refresh(employee)
    return employee


def delete_employee(
    db: Session,
    employee_id: int,
) -> None:
    """Permanently deletes an employee. Associated salary records are removed via cascade."""
    employee = db.get(Employee, employee_id)
    if not employee:
        raise EmployeeNotFoundError(employee_id)

    db.delete(employee)
    db.flush()


def get_next_employee_code(db: Session) -> str:
    """Generates the next sequential employee code (e.g. EMP-10001)."""
    stmt = (
        select(Employee.employee_code)
        .where(Employee.employee_code.like("EMP-%"))
        .order_by(func.length(Employee.employee_code).desc(), Employee.employee_code.desc())
        .limit(1)
    )
    highest_code = db.scalar(stmt)
    if highest_code:
        _, _, num_str = highest_code.partition("-")
        if num_str.isdigit():
            next_num = int(num_str) + 1
            return f"EMP-{next_num:05d}"

    count = db.scalar(select(func.count(Employee.id))) or 0
    return f"EMP-{count + 1:05d}"

