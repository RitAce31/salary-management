from decimal import Decimal
from datetime import date
import pytest

from app.db.models import ExchangeRate
from app.services.currency_service import CurrencyService
from app.domain.exceptions import CurrencyRateNotFoundError


def test_currency_service_identity(db):
    """Converting from currency X to X returns identical amount."""
    result = CurrencyService.convert(db, Decimal("1000.00"), "USD", "USD")
    assert result == Decimal("1000.00")

    result_eur = CurrencyService.convert(db, Decimal("5432.10"), "eur", "EUR")
    assert result_eur == Decimal("5432.10")


def test_currency_service_direct_conversion(db):
    """Direct reference rate conversion."""
    # Ensure a known rate exists in test transaction
    rate = ExchangeRate(
        from_currency="ABC",
        to_currency="USD",
        rate=Decimal("2.500000"),
        reference_date=date(2026, 1, 1),
    )
    db.add(rate)
    db.flush()

    result = CurrencyService.convert(db, Decimal("100.00"), "ABC", "USD")
    assert result == Decimal("250.00")


def test_currency_service_inverse_conversion(db):
    """Inverse rate fallback conversion."""
    rate = ExchangeRate(
        from_currency="XYZ",
        to_currency="USD",
        rate=Decimal("2.000000"),
        reference_date=date(2026, 1, 1),
    )
    db.add(rate)
    db.flush()

    # Inverse: converting USD to XYZ
    result = CurrencyService.convert(db, Decimal("100.00"), "USD", "XYZ")
    assert result == Decimal("50.00")


def test_currency_service_missing_rate_raises(db):
    """Attempting conversion for an unknown pair raises CurrencyRateNotFoundError."""
    with pytest.raises(CurrencyRateNotFoundError) as exc_info:
        CurrencyService.convert(db, Decimal("100.00"), "FOO", "USD")

    assert "FOO" in str(exc_info.value)



def test_currency_service_get_exchange_rates(db):
    """Retrieving exchange rates for target currency includes identity and mapped rates."""
    rates = CurrencyService.get_exchange_rates(db, "USD")
    assert "USD" in rates
    assert rates["USD"] == Decimal("1.000000")


def test_currency_service_get_supported_currencies(db):
    """Returns sorted distinct currencies."""
    currencies = CurrencyService.get_supported_currencies(db)
    assert isinstance(currencies, list)
    assert "USD" in currencies
