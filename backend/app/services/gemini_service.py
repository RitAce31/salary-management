from typing import Any, Dict, Optional, Tuple
import logging
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

GEMINI_TOOLS = [
    {
        "functionDeclarations": [
            {
                "name": "query_employees",
                "description": "Searches, filters, ranks, and lists employees based on salary, country, department, role, or salary threshold (e.g. top earners, lowest earners, employees earning above/below a threshold, top 50 employees, lowest 10 employees, etc.).",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "country": {
                            "type": "STRING",
                            "description": "Optional country filter (e.g. India, United States, Germany, United Kingdom, Canada, Australia)",
                        },
                        "department": {
                            "type": "STRING",
                            "description": "Optional department filter (e.g. Engineering, Sales, Finance, Product, HR, Marketing, Operations, Legal)",
                        },
                        "job_title": {
                            "type": "STRING",
                            "description": "Optional job title filter or keyword (e.g. Software Engineer, Manager, Director)",
                        },
                        "min_salary": {
                            "type": "NUMBER",
                            "description": "Minimum salary threshold (e.g. 50000 for more than 50K or > 50,000)",
                        },
                        "max_salary": {
                            "type": "NUMBER",
                            "description": "Maximum salary threshold (e.g. 100000 for less than 100K)",
                        },
                        "currency": {
                            "type": "STRING",
                            "description": "Currency of the salary threshold or requested output, e.g. INR, USD, EUR, GBP, CAD, AUD",
                        },
                        "sort_by": {
                            "type": "STRING",
                            "enum": ["salary", "name"],
                            "description": "Field to sort by, defaults to salary",
                        },
                        "sort_order": {
                            "type": "STRING",
                            "enum": ["desc", "asc"],
                            "description": "Sort direction: 'desc' for highest/top earners, 'asc' for lowest/bottom earners",
                        },
                        "limit": {
                            "type": "INTEGER",
                            "description": "Number of employee records to return (1 to 100, default 10, e.g. 50 for top 50, 10 for lowest 10)",
                        },
                    },
                },
            },
            {
                "name": "get_top_earning_employee",
                "description": "Finds the specific employee with the highest or lowest compensation, optionally filtered by country or department.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "order": {
                            "type": "STRING",
                            "enum": ["highest", "lowest"],
                            "description": "Whether to return the highest paid or lowest paid employee",
                        },
                        "department": {
                            "type": "STRING",
                            "description": "Department name, e.g. Engineering, Sales, Finance, Product, HR, Marketing, Operations, Legal",
                        },
                        "country": {
                            "type": "STRING",
                            "description": "Country name, e.g. India, United States, Germany, United Kingdom, Canada, Australia",
                        },
                    },
                },
            },
            {
                "name": "get_salary_metrics",
                "description": "Calculates aggregate salary metrics (average, highest, lowest, median) optionally filtered by department or country.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "metric": {
                            "type": "STRING",
                            "enum": ["average", "highest", "lowest", "median"],
                            "description": "The compensation statistic to calculate",
                        },
                        "department": {
                            "type": "STRING",
                            "description": "Optional department filter",
                        },
                        "country": {
                            "type": "STRING",
                            "description": "Optional country filter",
                        },
                    },
                    "required": ["metric"],
                },
            },
            {
                "name": "get_employee_count",
                "description": "Returns employee headcount count optionally filtered by department or country.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "department": {
                            "type": "STRING",
                            "description": "Optional department filter",
                        },
                        "country": {
                            "type": "STRING",
                            "description": "Optional country filter",
                        },
                    },
                },
            },
            {
                "name": "compare_departments",
                "description": "Compares headcount and compensation statistics between two departments.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "department_a": {
                            "type": "STRING",
                            "description": "First department to compare",
                        },
                        "department_b": {
                            "type": "STRING",
                            "description": "Second department to compare",
                        },
                    },
                    "required": ["department_a", "department_b"],
                },
            },
            {
                "name": "compare_countries",
                "description": "Compares headcount and compensation statistics between two countries.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "country_a": {
                            "type": "STRING",
                            "description": "First country to compare",
                        },
                        "country_b": {
                            "type": "STRING",
                            "description": "Second country to compare",
                        },
                    },
                    "required": ["country_a", "country_b"],
                },
            },
            {
                "name": "get_salary_range_count",
                "description": "Counts how many employees earn within a specified salary threshold (e.g. lower than, less than, greater than, more than, above, below, or between salary amounts), optionally filtered by country, department, or currency.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "min_salary": {
                            "type": "NUMBER",
                            "description": "Minimum annual salary threshold",
                        },
                        "max_salary": {
                            "type": "NUMBER",
                            "description": "Maximum annual salary threshold (e.g. 500000 for lower than 500,000)",
                        },
                        "country": {
                            "type": "STRING",
                            "description": "Optional country filter, e.g. India, United States",
                        },
                        "department": {
                            "type": "STRING",
                            "description": "Optional department filter, e.g. Engineering, Sales",
                        },
                        "currency": {
                            "type": "STRING",
                            "description": "Optional currency specified in question, e.g. INR, USD, EUR",
                        },
                    },
                },
            },
            {
                "name": "get_salary_by_department",
                "description": "Returns a breakdown of headcount and compensation across all departments.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {},
                },
            },
            {
                "name": "get_salary_by_country",
                "description": "Returns a breakdown of headcount and compensation across all countries.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {},
                },
            },
            {
                "name": "get_highest_lowest_department",
                "description": "Finds the department with either the highest or lowest average compensation across the company.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "order": {
                            "type": "STRING",
                            "enum": ["highest", "lowest"],
                            "description": "Whether highest or lowest average salary department",
                        },
                    },
                },
            },
            {
                "name": "get_highest_lowest_country",
                "description": "Finds the country with either the highest or lowest average compensation across the company.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "order": {
                            "type": "STRING",
                            "enum": ["highest", "lowest"],
                            "description": "Whether highest or lowest average salary country",
                        },
                    },
                },
            },
            {
                "name": "get_salary_distribution",
                "description": "Returns organizational salary distribution tiers and brackets.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {},
                },
            },
        ]
    }
]


class GeminiToolService:
    @classmethod
    def call_tool(cls, question: str) -> Optional[Tuple[str, Dict[str, Any]]]:
        if not settings.GEMINI_API_KEY:
            return None

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {
            "systemInstruction": {
                "parts": [{
                    "text": (
                        "You are an enterprise compensation analytics assistant for ACME Corporation. "
                        "When the user asks any question regarding employees, salaries, compensation, headcount, "
                        "roles, departments, countries, comparisons, or rankings, you MUST call the appropriate function tool. "
                        "Always select the best matching function tool to retrieve verified facts."
                    )
                }]
            },
            "contents": [{"parts": [{"text": question}]}],
            "tools": GEMINI_TOOLS,
        }

        try:
            with httpx.Client(timeout=20.0) as client:
                response = client.post(url, json=payload)

            if response.status_code != 200:
                logger.warning(f"Gemini API returned status {response.status_code}: {response.text[:200]}")
                return None

            data = response.json()
            candidates = data.get("candidates", [])
            if not candidates:
                return None

            parts = candidates[0].get("content", {}).get("parts", [])
            function_calls = [p.get("functionCall") for p in parts if p.get("functionCall")]
            if not function_calls:
                texts = [p.get("text") for p in parts if p.get("text")]
                if texts:
                    return "ai_text_response", {"text": " ".join(texts).strip()}
                return None

            selected = function_calls[0]
            # Prioritize specific complex query tools when multiple calls or matches occur
            for fc in function_calls:
                name = fc.get("name")
                if name in ("query_employees", "get_salary_range_count", "get_top_earning_employee", "compare_departments", "compare_countries"):
                    selected = fc
                    break

            return selected.get("name"), selected.get("args", {})
        except Exception as e:
            logger.warning(f"Gemini tool call failed: {e}")
            return None

