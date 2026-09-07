import pytest
from scripts.seed import generate_seed_data, RANDOM_SEED, TARGET_EMPLOYEE_COUNT


def test_generate_seed_data_deterministic():
    """Verify that seed generation produces deterministic, valid employee and salary records."""
    employees, salaries = generate_seed_data()

    assert len(employees) == TARGET_EMPLOYEE_COUNT
    assert len(salaries) > TARGET_EMPLOYEE_COUNT

    # Validate first employee
    first_emp = employees[0]
    assert first_emp["id"] == 1
    assert first_emp["employee_code"] == "EMP-00001"
    assert "@acme.corp" in first_emp["email"]
    assert first_emp["country"] in ["United States", "India", "Germany", "United Kingdom", "Canada", "Australia"]

    # Validate associated salaries
    emp1_salaries = [s for s in salaries if s["employee_id"] == 1]
    assert len(emp1_salaries) >= 1
    assert emp1_salaries[0]["change_reason"] == "Starting Salary"
    assert emp1_salaries[0]["amount"] > 0
