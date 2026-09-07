from decimal import Decimal
from datetime import date
import pytest


def test_get_analytics_overview(client):
    """Test GET /api/analytics/overview returns valid aggregate metrics."""
    response = client.get("/api/analytics/overview?reporting_currency=USD")
    assert response.status_code == 200
    data = response.json()

    assert data["reporting_currency"] == "USD"
    assert data["total_headcount"] >= 0
    assert float(data["total_payroll"]) >= 0
    assert float(data["average_salary"]) >= 0
    assert float(data["median_salary"]) >= 0
    assert float(data["min_salary"]) >= 0
    assert float(data["max_salary"]) >= 0


def test_get_analytics_overview_filtered(client):
    """Test GET /api/analytics/overview with department and country filters."""
    response = client.get("/api/analytics/overview?department=Engineering&country=United+States")
    assert response.status_code == 200
    data = response.json()

    assert data["reporting_currency"] == "USD"
    assert "total_headcount" in data
    assert "total_payroll" in data


def test_get_analytics_overview_empty_filter(client):
    """Test GET /api/analytics/overview for non-existent slice returns zeroed metrics cleanly."""
    response = client.get("/api/analytics/overview?department=NonExistentDept999")
    assert response.status_code == 200
    data = response.json()

    assert data["total_headcount"] == 0
    assert float(data["total_payroll"]) == 0.0
    assert float(data["average_salary"]) == 0.0
    assert float(data["median_salary"]) == 0.0


def test_get_analytics_by_department(client):
    """Test GET /api/analytics/by-department returns departmental breakdown."""
    response = client.get("/api/analytics/by-department?reporting_currency=USD")
    assert response.status_code == 200
    data = response.json()

    assert data["reporting_currency"] == "USD"
    assert isinstance(data["departments"], list)
    if len(data["departments"]) > 0:
        first_dept = data["departments"][0]
        assert "department" in first_dept
        assert "headcount" in first_dept
        assert "total_payroll" in first_dept
        assert "average_salary" in first_dept
        assert "median_salary" in first_dept
        assert "min_salary" in first_dept
        assert "max_salary" in first_dept


def test_get_analytics_by_country(client):
    """Test GET /api/analytics/by-country returns regional metrics."""
    response = client.get("/api/analytics/by-country?reporting_currency=USD")
    assert response.status_code == 200
    data = response.json()

    assert data["reporting_currency"] == "USD"
    assert isinstance(data["countries"], list)
    if len(data["countries"]) > 0:
        first_country = data["countries"][0]
        assert "country" in first_country
        assert "currency" in first_country
        assert "headcount" in first_country
        assert "total_payroll" in first_country
        assert "average_salary" in first_country
        assert "median_salary" in first_country


def test_get_salary_distribution(client):
    """Test GET /api/analytics/distribution returns 7 standard histogram buckets."""
    response = client.get("/api/analytics/distribution?reporting_currency=USD")
    assert response.status_code == 200
    data = response.json()

    assert data["reporting_currency"] == "USD"
    assert isinstance(data["brackets"], list)
    assert len(data["brackets"]) == 7

    # Verify standard bucket labels
    expected_brackets = [
        "< $30k",
        "$30k - $50k",
        "$50k - $75k",
        "$75k - $100k",
        "$100k - $150k",
        "$150k - $200k",
        "$200k+",
    ]
    returned_labels = [b["bracket"] for b in data["brackets"]]
    assert returned_labels == expected_brackets

    # Sum of percentages should be ~100% if headcount > 0
    total_count = sum(b["count"] for b in data["brackets"])
    if total_count > 0:
        total_pct = sum(b["percentage"] for b in data["brackets"])
        assert 99.0 <= total_pct <= 101.0


def test_get_reference_exchange_rates(client):
    """Test GET /api/analytics/exchange-rates returns list of rates."""
    response = client.get("/api/analytics/exchange-rates")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        rate_entry = data[0]
        assert "from_currency" in rate_entry
        assert "to_currency" in rate_entry
        assert "rate" in rate_entry
        assert "reference_date" in rate_entry
