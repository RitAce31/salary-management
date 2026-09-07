from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.domain.exceptions import EmployeeNotFoundError
from app.domain.schemas import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    EmployeeDetailResponse,
    NextEmployeeCodeResponse,
    SalaryCreate,
    SalaryResponse,
    PaginatedEmployeesResponse,
)
from app.services.employee_service import (
    create_employee,
    get_employee_by_id,
    list_employees,
    update_employee,
    delete_employee,
    get_next_employee_code,
)
from app.services.salary_service import (
    add_salary_adjustment,
    get_salary_history,
    get_current_salary,
)

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.get("", response_model=PaginatedEmployeesResponse)
def get_employees(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by name, email, or code"),
    department: Optional[str] = Query(None, description="Filter by department"),
    country: Optional[str] = Query(None, description="Filter by country"),
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Sort direction"),
    db: Session = Depends(get_db),
):
    """Retrieves a paginated list of employees with server-side filtering, sorting, and attached current active salaries."""
    employees, total, current_salaries = list_employees(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        department=department,
        country=country,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    items: List[EmployeeResponse] = []
    for emp in employees:
        emp_dict = EmployeeResponse.model_validate(emp).model_dump()
        current_sal = current_salaries.get(emp.id)
        emp_dict["current_salary"] = SalaryResponse.model_validate(current_sal) if current_sal else None
        items.append(EmployeeResponse(**emp_dict))

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    return PaginatedEmployeesResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_new_employee(
    employee_in: EmployeeCreate,
    db: Session = Depends(get_db),
):
    """Atomically registers a new employee and their starting salary record."""
    employee = create_employee(db=db, employee_in=employee_in)
    current_sal = get_current_salary(db=db, employee_id=employee.id)
    emp_dict = EmployeeResponse.model_validate(employee).model_dump()
    emp_dict["current_salary"] = SalaryResponse.model_validate(current_sal) if current_sal else None
    return EmployeeResponse(**emp_dict)


@router.get("/next-code", response_model=NextEmployeeCodeResponse)
def get_suggested_employee_code(
    db: Session = Depends(get_db),
):
    """Suggests the next sequential employee code based on current workforce records."""
    code = get_next_employee_code(db=db)
    return NextEmployeeCodeResponse(next_employee_code=code)


@router.get("/{id}", response_model=EmployeeDetailResponse)
def get_employee(
    id: int,
    db: Session = Depends(get_db),
):
    """Retrieves full details for a single employee, including active salary and historical progression."""
    employee = get_employee_by_id(db=db, employee_id=id)
    if not employee:
        raise EmployeeNotFoundError(id)

    history = get_salary_history(db=db, employee_id=id)
    current_sal = get_current_salary(db=db, employee_id=id)

    emp_dict = EmployeeDetailResponse.model_validate(employee).model_dump()
    emp_dict["current_salary"] = SalaryResponse.model_validate(current_sal) if current_sal else None
    emp_dict["salary_history"] = [SalaryResponse.model_validate(s) for s in history]
    return EmployeeDetailResponse(**emp_dict)


@router.put("/{id}", response_model=EmployeeResponse)
def update_existing_employee(
    id: int,
    employee_in: EmployeeUpdate,
    db: Session = Depends(get_db),
):
    """Updates profile attributes for an existing employee."""
    employee = update_employee(db=db, employee_id=id, employee_in=employee_in)
    current_sal = get_current_salary(db=db, employee_id=employee.id)
    emp_dict = EmployeeResponse.model_validate(employee).model_dump()
    emp_dict["current_salary"] = SalaryResponse.model_validate(current_sal) if current_sal else None
    return EmployeeResponse(**emp_dict)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_employee(
    id: int,
    db: Session = Depends(get_db),
):
    """Permanently deletes an employee and cascades removal to all their salary history records."""
    delete_employee(db=db, employee_id=id)
    return None


@router.get("/{id}/salaries", response_model=List[SalaryResponse])
def get_employee_salaries(
    id: int,
    db: Session = Depends(get_db),
):
    """Retrieves the complete chronological salary history for an employee."""
    employee = get_employee_by_id(db=db, employee_id=id)
    if not employee:
        raise EmployeeNotFoundError(id)

    history = get_salary_history(db=db, employee_id=id)
    return [SalaryResponse.model_validate(s) for s in history]


@router.post("/{id}/salaries", response_model=SalaryResponse, status_code=status.HTTP_201_CREATED)
def add_employee_salary(
    id: int,
    salary_in: SalaryCreate,
    db: Session = Depends(get_db),
):
    """Appends a new salary record for an employee without modifying previous records."""
    salary = add_salary_adjustment(db=db, employee_id=id, salary_in=salary_in)
    return SalaryResponse.model_validate(salary)
