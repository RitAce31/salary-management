from decimal import Decimal


def test_create_employee_api(client):
    """Test POST /api/employees creates employee and initial salary."""
    payload = {
        "employee_code": "EMP-API-001",
        "first_name": "Marcus",
        "last_name": "Aurelius",
        "email": "marcus.aurelius@acme.corp",
        "department": "Leadership",
        "job_title": "Director",
        "country": "Italy",
        "currency": "EUR",
        "hire_date": "2024-01-01",
        "initial_salary": {
            "amount": 120000.00,
            "effective_date": "2024-01-01",
            "change_reason": "Executive Offer",
        },
    }
    response = client.post("/api/employees", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["employee_code"] == "EMP-API-001"
    assert Decimal(str(data["current_salary"]["amount"])) == Decimal("120000.00")
    assert data["current_salary"]["currency"] == "EUR"


def test_create_employee_duplicate_conflict(client):
    """Test POST /api/employees returns 409 Conflict for duplicate employee_code or email."""
    payload = {
        "employee_code": "EMP-API-DUP",
        "first_name": "Duplicate",
        "last_name": "User",
        "email": "dup.user@acme.corp",
        "department": "Engineering",
        "job_title": "Engineer",
        "country": "Germany",
        "currency": "EUR",
        "hire_date": "2024-01-01",
        "initial_salary": {
            "amount": 75000.00,
            "effective_date": "2024-01-01",
        },
    }
    resp1 = client.post("/api/employees", json=payload)
    assert resp1.status_code == 201

    # Same code
    resp2 = client.post("/api/employees", json=payload)
    assert resp2.status_code == 409
    assert "already registered" in resp2.json()["detail"]


def test_get_employees_paginated(client):
    """Test GET /api/employees returns paginated employees with current salaries attached."""
    for i in range(1, 4):
        client.post(
            "/api/employees",
            json={
                "employee_code": f"EMP-LIST-{i:03d}",
                "first_name": f"User{i}",
                "last_name": "List",
                "email": f"user{i}.list@acme.corp",
                "department": "Sales" if i == 1 else "Engineering",
                "job_title": "Specialist",
                "country": "United States",
                "currency": "USD",
                "hire_date": "2024-01-01",
                "initial_salary": {
                    "amount": 60000.00 + i * 5000,
                    "effective_date": "2024-01-01",
                },
            },
        )

    # List all
    response = client.get("/api/employees?page=1&page_size=2&search=EMP-LIST")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["page_size"] == 2
    assert data["total"] == 3
    assert len(data["items"]) == 2
    assert data["items"][0]["current_salary"] is not None

    # Filter by department
    filtered_resp = client.get("/api/employees?department=Sales&search=EMP-LIST")
    assert filtered_resp.status_code == 200
    filtered_data = filtered_resp.json()
    assert filtered_data["total"] == 1
    assert filtered_data["items"][0]["department"] == "Sales"



def test_get_employee_detail_with_history(client):
    """Test GET /api/employees/{id} returns full employee details and chronological salary history."""
    create_resp = client.post(
        "/api/employees",
        json={
            "employee_code": "EMP-HIST-001",
            "first_name": "Chronos",
            "last_name": "Time",
            "email": "chronos.time@acme.corp",
            "department": "Operations",
            "job_title": "Lead",
            "country": "India",
            "currency": "INR",
            "hire_date": "2024-01-01",
            "initial_salary": {
                "amount": 1000000.00,
                "effective_date": "2024-01-01",
                "change_reason": "Starting Salary",
            },
        },
    )
    emp_id = create_resp.json()["id"]

    # Append 2025 raise
    client.post(
        f"/api/employees/{emp_id}/salaries",
        json={
            "amount": 1300000.00,
            "effective_date": "2025-01-01",
            "change_reason": "Merit Increase",
        },
    )

    # Get employee detail
    detail_resp = client.get(f"/api/employees/{emp_id}")
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()
    assert detail_data["employee_code"] == "EMP-HIST-001"
    assert len(detail_data["salary_history"]) == 2
    # Verify latest salary first
    assert Decimal(str(detail_data["salary_history"][0]["amount"])) == Decimal("1300000.00")
    assert Decimal(str(detail_data["salary_history"][1]["amount"])) == Decimal("1000000.00")


def test_get_employee_not_found(client):
    """Test GET /api/employees/999999 returns 404 Not Found."""
    response = client.get("/api/employees/999999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_post_salary_adjustment_api(client):
    """Test POST /api/employees/{id}/salaries appends salary record without mutating previous records."""
    create_resp = client.post(
        "/api/employees",
        json={
            "employee_code": "EMP-ADJ-001",
            "first_name": "Diana",
            "last_name": "Prince",
            "email": "diana.prince@acme.corp",
            "department": "Security",
            "job_title": "Lead Security Officer",
            "country": "United States",
            "currency": "USD",
            "hire_date": "2024-01-01",
            "initial_salary": {
                "amount": 90000.00,
                "effective_date": "2024-01-01",
                "change_reason": "Starting Salary",
            },
        },
    )
    emp_id = create_resp.json()["id"]

    # Append salary
    adj_resp = client.post(
        f"/api/employees/{emp_id}/salaries",
        json={
            "amount": 105000.00,
            "effective_date": "2025-01-01",
            "change_reason": "Annual Raise",
        },
    )
    assert adj_resp.status_code == 201
    assert Decimal(str(adj_resp.json()["amount"])) == Decimal("105000.00")
    assert adj_resp.json()["currency"] == "USD"

    # Get salaries history endpoint
    salaries_resp = client.get(f"/api/employees/{emp_id}/salaries")
    assert salaries_resp.status_code == 200
    assert len(salaries_resp.json()) == 2


def test_post_salary_adjustment_invalid_amount_returns_422(client):
    """Test POST /api/employees/{id}/salaries with negative amount returns 422."""
    create_resp = client.post(
        "/api/employees",
        json={
            "employee_code": "EMP-INV-001",
            "first_name": "Clark",
            "last_name": "Kent",
            "email": "clark.kent@acme.corp",
            "department": "Media",
            "job_title": "Journalist",
            "country": "United States",
            "currency": "USD",
            "hire_date": "2024-01-01",
            "initial_salary": {
                "amount": 50000.00,
                "effective_date": "2024-01-01",
            },
        },
    )
    emp_id = create_resp.json()["id"]

    adj_resp = client.post(
        f"/api/employees/{emp_id}/salaries",
        json={
            "amount": -500.00,
            "effective_date": "2025-01-01",
        },
    )
    assert adj_resp.status_code == 422


def test_get_next_employee_code_api(client):
    """Test GET /api/employees/next-code returns expected next sequential employee code."""
    resp = client.get("/api/employees/next-code")
    assert resp.status_code == 200
    data = resp.json()
    assert "next_employee_code" in data
    assert data["next_employee_code"].startswith("EMP-")


def test_update_employee_api(client):
    """Test PUT /api/employees/{id} updates profile attributes."""
    create_resp = client.post(
        "/api/employees",
        json={
            "employee_code": "EMP-UPD-001",
            "first_name": "Bruce",
            "last_name": "Wayne",
            "email": "bruce.wayne@acme.corp",
            "department": "Executive",
            "job_title": "CEO",
            "country": "United States",
            "currency": "USD",
            "hire_date": "2024-01-01",
            "initial_salary": {
                "amount": 200000.00,
                "effective_date": "2024-01-01",
            },
        },
    )
    emp_id = create_resp.json()["id"]

    update_resp = client.put(
        f"/api/employees/{emp_id}",
        json={
            "job_title": "Executive Chairman",
            "department": "Board of Directors",
        },
    )
    assert update_resp.status_code == 200
    updated_data = update_resp.json()
    assert updated_data["job_title"] == "Executive Chairman"
    assert updated_data["department"] == "Board of Directors"
    assert updated_data["first_name"] == "Bruce"


def test_update_employee_duplicate_email_conflict(client):
    """Test PUT /api/employees/{id} returns 409 Conflict if email is already taken by another employee."""
    c1 = client.post(
        "/api/employees",
        json={
            "employee_code": "EMP-DUP-E1",
            "first_name": "User",
            "last_name": "One",
            "email": "user.one@acme.corp",
            "department": "IT",
            "job_title": "Specialist",
            "country": "United States",
            "currency": "USD",
            "hire_date": "2024-01-01",
            "initial_salary": {"amount": 60000.00, "effective_date": "2024-01-01"},
        },
    )
    c2 = client.post(
        "/api/employees",
        json={
            "employee_code": "EMP-DUP-E2",
            "first_name": "User",
            "last_name": "Two",
            "email": "user.two@acme.corp",
            "department": "IT",
            "job_title": "Specialist",
            "country": "United States",
            "currency": "USD",
            "hire_date": "2024-01-01",
            "initial_salary": {"amount": 60000.00, "effective_date": "2024-01-01"},
        },
    )
    emp2_id = c2.json()["id"]

    dup_resp = client.put(
        f"/api/employees/{emp2_id}",
        json={"email": "user.one@acme.corp"},
    )
    assert dup_resp.status_code == 409


def test_update_employee_not_found(client):
    """Test PUT /api/employees/{id} returns 404 for nonexistent employee."""
    resp = client.put(
        "/api/employees/999999",
        json={"first_name": "Ghost"},
    )
    assert resp.status_code == 404


def test_delete_employee_api_cascades_salaries(client):
    """Test DELETE /api/employees/{id} removes employee and cascades to salary records."""
    create_resp = client.post(
        "/api/employees",
        json={
            "employee_code": "EMP-DEL-001",
            "first_name": "Peter",
            "last_name": "Parker",
            "email": "peter.parker@acme.corp",
            "department": "Media",
            "job_title": "Photographer",
            "country": "United States",
            "currency": "USD",
            "hire_date": "2024-01-01",
            "initial_salary": {
                "amount": 40000.00,
                "effective_date": "2024-01-01",
            },
        },
    )
    emp_id = create_resp.json()["id"]

    # Delete employee
    del_resp = client.delete(f"/api/employees/{emp_id}")
    assert del_resp.status_code == 204

    # Verify 404 on get
    get_resp = client.get(f"/api/employees/{emp_id}")
    assert get_resp.status_code == 404

    # Verify 404 on salary history
    sal_resp = client.get(f"/api/employees/{emp_id}/salaries")
    assert sal_resp.status_code == 404


def test_delete_employee_not_found(client):
    """Test DELETE /api/employees/{id} returns 404 for nonexistent employee."""
    resp = client.delete("/api/employees/999999")
    assert resp.status_code == 404

