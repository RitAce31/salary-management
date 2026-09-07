class DomainError(Exception):
    """Base exception for all domain-level business rule violations."""
    pass


class EmployeeNotFoundError(DomainError):
    def __init__(self, employee_id: int):
        super().__init__(f"Employee with ID {employee_id} not found.")
        self.employee_id = employee_id


class DuplicateEmployeeCodeError(DomainError):
    def __init__(self, employee_code: str):
        super().__init__(f"Employee code '{employee_code}' is already registered.")
        self.employee_code = employee_code


class DuplicateEmailError(DomainError):
    def __init__(self, email: str):
        super().__init__(f"Email '{email}' is already registered.")
        self.email = email


class InvalidSalaryAmountError(DomainError):
    def __init__(self, amount: float):
        super().__init__(f"Salary amount must be greater than zero, got: {amount}")
        self.amount = amount
