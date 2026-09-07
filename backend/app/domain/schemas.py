from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class SalaryBase(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Salary amount, must be greater than zero.")
    effective_date: date = Field(..., description="Date when this salary became active.")
    change_reason: Optional[str] = Field(None, max_length=100, description="Reason for salary change.")

    @field_validator("amount")
    @classmethod
    def validate_amount_precision(cls, v: Decimal) -> Decimal:
        return round(v, 2)


class SalaryCreate(SalaryBase):
    pass


class SalaryResponse(SalaryBase):
    id: int
    employee_id: int
    currency: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmployeeBase(BaseModel):
    employee_code: str = Field(..., min_length=1, max_length=32, description="Unique human-readable employee code.")
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr = Field(..., description="Corporate email address.")
    department: str = Field(..., min_length=1, max_length=100)
    job_title: str = Field(..., min_length=1, max_length=100)
    country: str = Field(..., min_length=1, max_length=100)
    currency: str = Field(..., min_length=3, max_length=3, description="ISO 4217 currency code.")
    hire_date: date = Field(..., description="Employment start date.")

    @field_validator("currency")
    @classmethod
    def validate_currency_code(cls, v: str) -> str:
        v = v.strip().upper()
        if len(v) != 3 or not v.isalpha():
            raise ValueError("Currency must be a 3-letter ISO code.")
        return v

    @field_validator("employee_code", "first_name", "last_name", "department", "job_title", "country")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Field cannot be empty or whitespace only.")
        return v


class EmployeeCreate(EmployeeBase):
    initial_salary: SalaryCreate


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    department: Optional[str] = Field(None, min_length=1, max_length=100)
    job_title: Optional[str] = Field(None, min_length=1, max_length=100)
    country: Optional[str] = Field(None, min_length=1, max_length=100)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    hire_date: Optional[date] = None

    @field_validator("currency")
    @classmethod
    def validate_currency_code(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().upper()
            if len(v) != 3 or not v.isalpha():
                raise ValueError("Currency must be a 3-letter ISO code.")
        return v

    @field_validator("first_name", "last_name", "department", "job_title", "country")
    @classmethod
    def strip_whitespace(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Field cannot be empty or whitespace only.")
        return v


class NextEmployeeCodeResponse(BaseModel):
    next_employee_code: str


class EmployeeResponse(EmployeeBase):
    id: int
    created_at: datetime
    updated_at: datetime
    current_salary: Optional[SalaryResponse] = None

    model_config = ConfigDict(from_attributes=True)


class EmployeeDetailResponse(EmployeeResponse):
    salary_history: List[SalaryResponse] = []


class PaginatedEmployeesResponse(BaseModel):
    items: List[EmployeeResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ExchangeRateResponse(BaseModel):
    id: int
    from_currency: str
    to_currency: str
    rate: Decimal
    reference_date: date

    model_config = ConfigDict(from_attributes=True)


class AnalyticsOverview(BaseModel):
    reporting_currency: str = "USD"
    total_headcount: int
    total_payroll: Decimal
    average_salary: Decimal
    median_salary: Decimal
    min_salary: Decimal
    max_salary: Decimal


class DepartmentMetric(BaseModel):
    department: str
    headcount: int
    total_payroll: Decimal
    average_salary: Decimal
    median_salary: Decimal
    min_salary: Decimal
    max_salary: Decimal


class DepartmentAnalyticsResponse(BaseModel):
    reporting_currency: str = "USD"
    departments: List[DepartmentMetric]


class CountryMetric(BaseModel):
    country: str
    currency: str
    headcount: int
    total_payroll: Decimal
    average_salary: Decimal
    median_salary: Decimal


class CountryAnalyticsResponse(BaseModel):
    reporting_currency: str = "USD"
    countries: List[CountryMetric]


class SalaryBracket(BaseModel):
    bracket: str
    count: int
    percentage: float


class DistributionAnalyticsResponse(BaseModel):
    reporting_currency: str = "USD"
    brackets: List[SalaryBracket]

