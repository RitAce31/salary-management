import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.db.session import engine, get_db


@pytest.fixture
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    if transaction.is_active:
        transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def mock_gemini_tools(monkeypatch):
    from app.services.gemini_service import GeminiToolService

    def fake_tool(q: str):
        ql = q.lower()
        if "joke" in ql or "capital of france" in ql:
            return None
        if "who has the highest salary in india" in ql:
            return "get_top_earning_employee", {"order": "highest", "country": "India"}
        if "engineering in india" in ql:
            return "get_employee_count", {"department": "Engineering", "country": "India"}
        if "between 50,000 and 100,000" in ql:
            return "get_salary_range_count", {"min_salary": 50000.0, "max_salary": 100000.0}
        if "median salary in engineering" in ql:
            return "get_salary_metrics", {"metric": "median", "department": "Engineering"}
        if "highest average salary" in ql:
            return "get_highest_lowest_department", {"order": "highest"}
        if "lowest average salary" in ql:
            return "get_highest_lowest_country", {"order": "lowest"}
        if "compare engineering and finance" in ql:
            return "compare_departments", {"department_a": "Engineering", "department_b": "Finance"}
        if "compare india and united states" in ql:
            return "compare_countries", {"country_a": "India", "country_b": "United States"}
        if "salary by department" in ql:
            return "get_salary_by_department", {}
        if "salary by country" in ql:
            return "get_salary_by_country", {}
        if "top 50 employee" in ql or "top 5 employee" in ql:
            return "query_employees", {"country": "India", "sort_by": "salary", "sort_order": "desc", "limit": 50}
        if "lowest 10" in ql:
            return "query_employees", {"country": "India", "min_salary": 50000.0, "sort_by": "salary", "sort_order": "asc", "limit": 10}
        if "how many employees" in ql:
            return "get_employee_count", {}
        if "average salary" in ql:
            return "get_salary_metrics", {"metric": "average"}
        return None

    monkeypatch.setattr(GeminiToolService, "call_tool", fake_tool)

