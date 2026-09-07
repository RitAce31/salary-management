from datetime import date
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db.models import Employee, Salary
from app.domain.schemas import SalaryCreate
from app.domain.exceptions import EmployeeNotFoundError, InvalidSalaryAmountError


def add_salary_adjustment(
    db: Session,
    employee_id: int,
    salary_in: SalaryCreate,
) -> Salary:
    """Appends a new salary record for an employee.

    Enforces the append-only invariant: historical salary records are NEVER overwritten.
    """
    employee = db.get(Employee, employee_id)
    if not employee:
        raise EmployeeNotFoundError(employee_id)

    if salary_in.amount <= 0:
        raise InvalidSalaryAmountError(float(salary_in.amount))

    salary = Salary(
        employee_id=employee.id,
        amount=salary_in.amount,
        currency=employee.currency,
        effective_date=salary_in.effective_date,
        change_reason=salary_in.change_reason,
    )
    db.add(salary)
    db.flush()
    return salary


def get_salary_history(
    db: Session,
    employee_id: int,
) -> List[Salary]:
    """Retrieves all historical salary records for an employee in chronological descending order."""
    stmt = (
        select(Salary)
        .where(Salary.employee_id == employee_id)
        .order_by(Salary.effective_date.desc(), Salary.id.desc())
    )
    return list(db.scalars(stmt).all())


def get_current_salary(
    db: Session,
    employee_id: int,
    as_of_date: Optional[date] = None,
) -> Optional[Salary]:
    """Resolves the single active salary record as of a given date (effective_date <= as_of_date)."""
    target_date = as_of_date or date.today()
    stmt = (
        select(Salary)
        .where(
            Salary.employee_id == employee_id,
            Salary.effective_date <= target_date,
        )
        .order_by(Salary.effective_date.desc(), Salary.id.desc())
        .limit(1)
    )
    return db.scalars(stmt).first()
