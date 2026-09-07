def test_post_ask_success(client):
    response = client.post(
        "/api/ask",
        json={"question": "How many employees are there?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["operation"] == "get_employee_count"
    assert "answer" in data
    assert "data" in data
    assert "metadata" in data


def test_post_ask_with_currency(client):
    response = client.post(
        "/api/ask",
        json={"question": "What is the average salary?", "reporting_currency": "EUR"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["currency"] == "EUR"


def test_post_ask_empty_question_validation(client):
    response = client.post("/api/ask", json={"question": ""})
    assert response.status_code == 422


def test_post_ask_whitespace_question_validation(client):
    response = client.post("/api/ask", json={"question": "    "})
    assert response.status_code == 422
