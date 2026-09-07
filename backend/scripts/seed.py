"""
Deterministic Seed Script for ACME Salary Management System.

Populates approximately 10,000 realistic employees across multiple countries,
departments, and currencies, with multi-year append-only salary histories
and reference exchange rates.

Usage:
    poetry run python scripts/seed.py [--clean]
"""

import argparse
import random
import time
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Dict, Tuple

from sqlalchemy import text, insert
from app.db.session import SessionLocal, engine
from app.db.models import Employee, Salary, ExchangeRate


# Deterministic Seed
RANDOM_SEED = 42
TARGET_EMPLOYEE_COUNT = 10000

# Country & Currency Distribution
COUNTRIES_DATA = [
    # (Country, Currency, Weight, Min Base, Max Base)
    ("United States", "USD", 0.35, 55000, 210000),
    ("India", "INR", 0.30, 650000, 4200000),
    ("Germany", "EUR", 0.15, 48000, 155000),
    ("United Kingdom", "GBP", 0.10, 42000, 145000),
    ("Canada", "CAD", 0.05, 60000, 180000),
    ("Australia", "AUD", 0.05, 65000, 195000),
]

# Departments & Roles
DEPARTMENTS = {
    "Engineering": [
        "Software Engineer",
        "Senior Software Engineer",
        "Staff Engineer",
        "Principal Engineer",
        "Engineering Manager",
        "QA Automation Engineer",
        "DevOps Engineer",
        "Site Reliability Engineer",
    ],
    "Product": [
        "Associate Product Manager",
        "Product Manager",
        "Senior Product Manager",
        "Director of Product",
        "Product Designer",
        "Lead UX Researcher",
    ],
    "Sales": [
        "Business Development Rep",
        "Account Executive",
        "Senior Account Executive",
        "Enterprise Account Director",
        "Sales Manager",
        "VP of Sales",
    ],
    "Marketing": [
        "Marketing Specialist",
        "Content Marketing Strategist",
        "Performance Marketing Lead",
        "Product Marketing Manager",
        "Marketing Director",
    ],
    "Finance": [
        "Financial Analyst",
        "Senior Financial Analyst",
        "Accounting Specialist",
        "Finance Manager",
        "Corporate Controller",
    ],
    "HR": [
        "People Operations Coordinator",
        "Technical Recruiter",
        "Senior HR Business Partner",
        "Talent Acquisition Lead",
        "Director of People",
    ],
    "Operations": [
        "Operations Specialist",
        "Supply Chain Analyst",
        "Operations Manager",
        "Director of Business Operations",
    ],
    "Legal": [
        "Contracts Specialist",
        "Corporate Counsel",
        "Senior Legal Counsel",
        "Director of Compliance",
    ],
}

# Name Pools
FIRST_NAMES = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
    "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
    "Matthew", "Betty", "Anthony", "Margaret", "Donald", "Sandra", "Mark", "Ashley",
    "Aarav", "Aditi", "Rohan", "Priya", "Vikram", "Ananya", "Rahul", "Kavita",
    "Siddharth", "Neha", "Arjun", "Pooja", "Varun", "Deepika", "Aditya", "Meera",
    "Karan", "Sneha", "Amit", "Shreya", "Nikhil", "Divya", "Gaurav", "Swati",
    "Lukas", "Emma", "Maximilian", "Hannah", "Felix", "Sophia", "Jonas", "Mia",
    "Leon", "Anna", "Paul", "Lea", "David", "Emilia", "Elias", "Marie",
    "Oliver", "Olivia", "George", "Amelia", "Harry", "Isla", "Jack", "Ava",
    "Jacob", "Emily", "Noah", "Isabella", "Charlie", "Grace", "Liam", "Freya",
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
    "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
    "Sharma", "Patel", "Verma", "Gupta", "Singh", "Iyer", "Nair", "Reddy",
    "Kulkarni", "Mehta", "Deshmukh", "Joshi", "Bose", "Choudhury", "Bhat", "Rao",
    "Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker",
    "Schulz", "Hoffmann", "Schäfer", "Koch", "Bauer", "Richter", "Klein", "Wolf",
    "Davies", "Evans", "Wilson", "Roberts", "Robinson", "Wright", "Walker", "Clarke",
]

CHANGE_REASONS = [
    "Annual Merit Increment",
    "Promotion",
    "Market Adjustment",
    "Role Reclassification",
    "Cost of Living Adjustment",
]


def clean_database(db):
    """Truncates existing tables to ensure clean, duplicate-free seeding."""
    print("Cleaning existing records from database...")
    db.execute(text("TRUNCATE TABLE salaries, employees, exchange_rates RESTART IDENTITY CASCADE;"))
    db.commit()
    print("Database cleaned successfully.")


def seed_exchange_rates(db):
    """Seeds baseline reference exchange rates as of 2026-01-01."""
    print("Seeding reference exchange rates...")
    ref_date = date(2026, 1, 1)
    rates = [
        {"from_currency": "USD", "to_currency": "USD", "rate": Decimal("1.000000"), "reference_date": ref_date},
        {"from_currency": "EUR", "to_currency": "USD", "rate": Decimal("1.087000"), "reference_date": ref_date},
        {"from_currency": "GBP", "to_currency": "USD", "rate": Decimal("1.266000"), "reference_date": ref_date},
        {"from_currency": "INR", "to_currency": "USD", "rate": Decimal("0.011980"), "reference_date": ref_date},
        {"from_currency": "CAD", "to_currency": "USD", "rate": Decimal("0.735000"), "reference_date": ref_date},
        {"from_currency": "AUD", "to_currency": "USD", "rate": Decimal("0.658000"), "reference_date": ref_date},
    ]
    db.execute(insert(ExchangeRate), rates)
    db.commit()
    print(f"Seeded {len(rates)} reference exchange rates.")


def generate_seed_data() -> Tuple[List[dict], List[dict]]:
    """Deterministically generates 10,000 employees and ~25,000 historical salary records."""
    random.seed(RANDOM_SEED)

    country_names = [c[0] for c in COUNTRIES_DATA]
    country_weights = [c[2] for c in COUNTRIES_DATA]
    country_map = {c[0]: c for c in COUNTRIES_DATA}

    department_names = list(DEPARTMENTS.keys())

    employee_rows = []
    salary_rows = []

    salary_id_counter = 1
    now_utc = datetime.now(timezone.utc)

    # Base date range: 2020-01-01 to 2025-06-30
    start_date = date(2020, 1, 1)
    end_date = date(2025, 6, 30)
    total_days = (end_date - start_date).days

    print(f"Generating {TARGET_EMPLOYEE_COUNT} deterministic employee profiles...")

    used_emails = set()

    for emp_id in range(1, TARGET_EMPLOYEE_COUNT + 1):
        # Deterministic country selection based on weights
        country_name = random.choices(country_names, weights=country_weights, k=1)[0]
        _, currency, _, min_base, max_base = country_map[country_name]

        # Name selection
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)

        # Ensure unique email
        base_email = f"{first_name.lower()}.{last_name.lower()}"
        email = f"{base_email}@acme.corp"
        suffix = 1
        while email in used_emails:
            suffix += 1
            email = f"{base_email}{suffix}@acme.corp"
        used_emails.add(email)

        # Department and Job Title
        department = random.choice(department_names)
        job_title = random.choice(DEPARTMENTS[department])

        # Hire date
        hire_day_offset = random.randint(0, total_days)
        hire_date = start_date + timedelta(days=hire_day_offset)

        # Employee code
        employee_code = f"EMP-{emp_id:05d}"

        employee_rows.append({
            "id": emp_id,
            "employee_code": employee_code,
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "department": department,
            "job_title": job_title,
            "country": country_name,
            "currency": currency,
            "hire_date": hire_date,
            "created_at": now_utc,
            "updated_at": now_utc,
        })

        # --- Salary History Generation ---
        # 1. Starting salary
        base_salary = random.randint(min_base, max_base)
        # Round to nearest 100 for realism
        current_amount = Decimal(str(round(base_salary, -2)))

        salary_rows.append({
            "id": salary_id_counter,
            "employee_id": emp_id,
            "amount": current_amount,
            "currency": currency,
            "effective_date": hire_date,
            "change_reason": "Starting Salary",
            "created_at": now_utc,
        })
        salary_id_counter += 1

        # 2. Subsequent annual increments / promotions
        current_year = hire_date.year + 1
        last_effective_date = hire_date

        while current_year <= 2026:
            # ~75% chance of raise/promotion per elapsed year
            if random.random() < 0.75:
                # 4% to 18% increment
                percentage = Decimal(str(random.uniform(0.04, 0.18)))
                current_amount = Decimal(str(round(float(current_amount * (1 + percentage)), 2)))

                # Effective around Q1 or hire anniversary
                increment_date = date(current_year, min(hire_date.month, 12), min(hire_date.day, 28))
                if increment_date > last_effective_date and increment_date <= date(2026, 4, 1):
                    reason = random.choice(CHANGE_REASONS)
                    salary_rows.append({
                        "id": salary_id_counter,
                        "employee_id": emp_id,
                        "amount": current_amount,
                        "currency": currency,
                        "effective_date": increment_date,
                        "change_reason": reason,
                        "created_at": now_utc,
                    })
                    salary_id_counter += 1
                    last_effective_date = increment_date

            current_year += 1

    return employee_rows, salary_rows


def bulk_insert_data(db, employee_rows: List[dict], salary_rows: List[dict]):
    """Performs high-speed chunked bulk inserts."""
    print("Executing bulk insert of employees...")
    start_time = time.time()

    # Insert Employees in batches of 2,000
    emp_batch_size = 2000
    for i in range(0, len(employee_rows), emp_batch_size):
        chunk = employee_rows[i:i + emp_batch_size]
        db.execute(insert(Employee), chunk)
    db.commit()
    print(f"Inserted {len(employee_rows)} employees in {time.time() - start_time:.2f}s.")

    # Insert Salaries in batches of 5,000
    sal_start_time = time.time()
    sal_batch_size = 5000
    for i in range(0, len(salary_rows), sal_batch_size):
        chunk = salary_rows[i:i + sal_batch_size]
        db.execute(insert(Salary), chunk)
    db.commit()
    print(f"Inserted {len(salary_rows)} salary records in {time.time() - sal_start_time:.2f}s.")

    # Sync Postgres Serial Sequences
    print("Synchronizing PostgreSQL ID sequences...")
    db.execute(text("SELECT setval(pg_get_serial_sequence('employees', 'id'), (SELECT MAX(id) FROM employees));"))
    db.execute(text("SELECT setval(pg_get_serial_sequence('salaries', 'id'), (SELECT MAX(id) FROM salaries));"))
    db.execute(text("SELECT setval(pg_get_serial_sequence('exchange_rates', 'id'), (SELECT MAX(id) FROM exchange_rates));"))
    db.commit()


def main():
    parser = argparse.ArgumentParser(description="Deterministic Seed Script for ACME Salary Management")
    parser.add_argument("--clean", action="store_true", help="Wipe existing records before seeding")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        existing_count = db.query(Employee).count()
        if existing_count > 0:
            if not args.clean:
                print(f"Database already contains {existing_count} employees. Use '--clean' to overwrite and re-seed.")
                return
            clean_database(db)

        overall_start = time.time()
        seed_exchange_rates(db)

        employees, salaries = generate_seed_data()
        bulk_insert_data(db, employees, salaries)

        total_duration = time.time() - overall_start
        print("\n" + "=" * 50)
        print("SEEDING COMPLETE!")
        print(f"Total Employees Seeded: {len(employees):,}")
        print(f"Total Salaries Seeded:   {len(salaries):,}")
        print(f"Total Execution Time:    {total_duration:.2f} seconds")
        print("=" * 50)

    except Exception as ex:
        db.rollback()
        print(f"Error during seeding: {ex}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
