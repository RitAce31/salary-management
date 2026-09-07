from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import ExchangeRate
from app.services.analytics_service import AnalyticsService
from app.domain.schemas import (
    AnalyticsOverview,
    DepartmentAnalyticsResponse,
    CountryAnalyticsResponse,
    DistributionAnalyticsResponse,
    ExchangeRateResponse,
)

router = APIRouter()


@router.get("/overview", response_model=AnalyticsOverview, summary="High-level organizational compensation overview")
def get_analytics_overview(
    reporting_currency: str = Query("USD", min_length=3, max_length=3, description="ISO 4217 reporting currency code"),
    department: Optional[str] = Query(None, description="Optional department filter"),
    country: Optional[str] = Query(None, description="Optional country filter"),
    db: Session = Depends(get_db),
):
    """
    Returns total headcount, payroll, mean, median, min, and max salary
    normalized to the specified reporting currency.
    """
    return AnalyticsService.get_overview(
        db,
        reporting_currency=reporting_currency,
        department=department,
        country=country,
    )


@router.get("/by-department", response_model=DepartmentAnalyticsResponse, summary="Compensation breakdown by department")
def get_analytics_by_department(
    reporting_currency: str = Query("USD", min_length=3, max_length=3, description="ISO 4217 reporting currency code"),
    country: Optional[str] = Query(None, description="Optional country filter"),
    db: Session = Depends(get_db),
):
    """
    Returns departmental breakdown with headcount, total spend, and average/median salaries.
    """
    return AnalyticsService.get_by_department(
        db,
        reporting_currency=reporting_currency,
        country=country,
    )


@router.get("/by-country", response_model=CountryAnalyticsResponse, summary="Compensation breakdown by country")
def get_analytics_by_country(
    reporting_currency: str = Query("USD", min_length=3, max_length=3, description="ISO 4217 reporting currency code"),
    department: Optional[str] = Query(None, description="Optional department filter"),
    db: Session = Depends(get_db),
):
    """
    Returns country-level breakdown showing local currencies and normalized compensation metrics.
    """
    return AnalyticsService.get_by_country(
        db,
        reporting_currency=reporting_currency,
        department=department,
    )


@router.get("/distribution", response_model=DistributionAnalyticsResponse, summary="Salary distribution brackets")
def get_salary_distribution(
    reporting_currency: str = Query("USD", min_length=3, max_length=3, description="ISO 4217 reporting currency code"),
    department: Optional[str] = Query(None, description="Optional department filter"),
    country: Optional[str] = Query(None, description="Optional country filter"),
    db: Session = Depends(get_db),
):
    """
    Returns salary distribution histogram brackets and headcount percentages in reporting currency.
    """
    return AnalyticsService.get_salary_distribution(
        db,
        reporting_currency=reporting_currency,
        department=department,
        country=country,
    )


@router.get("/exchange-rates", response_model=List[ExchangeRateResponse], summary="List active reference exchange rates")
def get_reference_exchange_rates(
    db: Session = Depends(get_db),
):
    """
    Returns all baseline reference exchange rates configured in the system.
    """
    stmt = select(ExchangeRate).order_by(ExchangeRate.from_currency, ExchangeRate.to_currency)
    return db.scalars(stmt).all()
