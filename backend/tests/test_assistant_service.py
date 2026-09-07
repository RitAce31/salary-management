from app.services.assistant_service import CompensationAssistantService


def test_assistant_headcount_overall(db):
    response = CompensationAssistantService.answer_question(db, "How many employees are there?")
    assert response.operation == "get_employee_count"
    assert response.data["headcount"] == 10000
    assert "10,000" in response.answer


def test_assistant_headcount_department_and_country(db):
    response = CompensationAssistantService.answer_question(
        db, "How many employees are in Engineering in India?"
    )
    assert response.operation == "get_employee_count"
    assert response.data["department"] == "Engineering"
    assert response.data["country"] == "India"
    assert response.data["headcount"] > 0


def test_assistant_average_salary(db):
    response = CompensationAssistantService.answer_question(db, "What is the average salary?")
    assert response.operation == "get_salary_metrics"
    assert response.data["metric"] == "average"
    assert response.data["amount"] > 0
    assert response.data["currency"] == "USD"


def test_assistant_salary_metrics_department(db):
    response = CompensationAssistantService.answer_question(
        db, "What is the median salary in Engineering?"
    )
    assert response.operation == "get_salary_metrics"
    assert response.data["metric"] == "median"
    assert response.data["department"] == "Engineering"


def test_assistant_highest_department(db):
    response = CompensationAssistantService.answer_question(
        db, "Which department has the highest average salary?"
    )
    assert response.operation == "get_highest_lowest_department"
    assert response.data["order"] == "highest"
    assert response.data["department"] is not None


def test_assistant_highest_country(db):
    response = CompensationAssistantService.answer_question(
        db, "Which country has the lowest average salary?"
    )
    assert response.operation == "get_highest_lowest_country"
    assert response.data["order"] == "lowest"
    assert response.data["country"] is not None


def test_assistant_compare_departments(db):
    response = CompensationAssistantService.answer_question(
        db, "Compare Engineering and Finance"
    )
    assert response.operation == "compare_departments"
    assert response.data["department_a"]["department"] == "Engineering"
    assert response.data["department_b"]["department"] == "Finance"


def test_assistant_compare_countries(db):
    response = CompensationAssistantService.answer_question(
        db, "Compare India and United States"
    )
    assert response.operation == "compare_countries"
    assert response.data["country_a"]["country"] == "India"
    assert response.data["country_b"]["country"] == "United States"


def test_assistant_salary_by_department(db):
    response = CompensationAssistantService.answer_question(
        db, "Show salary by department"
    )
    assert response.operation == "get_salary_by_department"
    assert len(response.data["departments"]) > 0


def test_assistant_salary_by_country(db):
    response = CompensationAssistantService.answer_question(
        db, "Show salary by country"
    )
    assert response.operation == "get_salary_by_country"
    assert len(response.data["countries"]) > 0


def test_assistant_salary_range(db):
    response = CompensationAssistantService.answer_question(
        db, "How many employees earn between 50,000 and 100,000?"
    )
    assert response.operation == "get_salary_range_count"
    assert response.data["min_salary"] == 50000.0
    assert response.data["max_salary"] == 100000.0
    assert response.data["count"] > 0


def test_assistant_currency_override(db):
    response = CompensationAssistantService.answer_question(
        db, "What is the average salary in EUR?"
    )
    assert response.data["currency"] == "EUR"
    assert "EUR" in response.answer or "€" in response.answer


def test_assistant_unsupported_query(db):
    response = CompensationAssistantService.answer_question(
        db, "What is the capital of France?"
    )
    assert response.operation == "unsupported_query"
    assert "specializes in employee headcount" in response.answer.lower() or "specialize" in response.answer.lower()
