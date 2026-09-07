from decimal import Decimal
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, or_

from app.db.models import ExchangeRate
from app.domain.exceptions import CurrencyRateNotFoundError


class CurrencyService:
    """Service handling multi-currency reference rates and conversions."""

    @staticmethod
    def get_exchange_rates(db: Session, to_currency: str = "USD") -> Dict[str, Decimal]:
        """
        Retrieves all active reference exchange rates targeted at `to_currency`.
        Always includes a 1.0 identity mapping for the target currency itself.
        """
        to_curr = to_currency.strip().upper()
        rates_map: Dict[str, Decimal] = {to_curr: Decimal("1.000000")}

        stmt = select(ExchangeRate).where(ExchangeRate.to_currency == to_curr)
        results = db.scalars(stmt).all()

        for er in results:
            rates_map[er.from_currency.upper()] = er.rate

        return rates_map

    @staticmethod
    def convert(
        db: Session,
        amount: Decimal,
        from_currency: str,
        to_currency: str = "USD",
    ) -> Decimal:
        """
        Converts an amount from one currency to another using deterministic reference rates.
        Raises CurrencyRateNotFoundError if no conversion path is available.
        """
        from_curr = from_currency.strip().upper()
        to_curr = to_currency.strip().upper()

        if from_curr == to_curr:
            return round(amount, 2)

        # 1. Direct rate
        stmt = (
            select(ExchangeRate)
            .where(
                ExchangeRate.from_currency == from_curr,
                ExchangeRate.to_currency == to_curr,
            )
            .order_by(ExchangeRate.reference_date.desc())
        )
        rate_record = db.scalars(stmt).first()

        if rate_record:
            converted = amount * rate_record.rate
            return round(converted, 2)

        # 2. Inverse rate fallback
        inverse_stmt = (
            select(ExchangeRate)
            .where(
                ExchangeRate.from_currency == to_curr,
                ExchangeRate.to_currency == from_curr,
            )
            .order_by(ExchangeRate.reference_date.desc())
        )
        inverse_record = db.scalars(inverse_stmt).first()

        if inverse_record and inverse_record.rate > 0:
            converted = amount / inverse_record.rate
            return round(converted, 2)

        raise CurrencyRateNotFoundError(from_curr, to_curr)

    @staticmethod
    def get_supported_currencies(db: Session) -> List[str]:
        """Returns a list of all distinct currencies configured in exchange rates."""
        stmt = select(ExchangeRate.from_currency).distinct()
        from_currencies = set(db.scalars(stmt).all())

        to_stmt = select(ExchangeRate.to_currency).distinct()
        to_currencies = set(db.scalars(to_stmt).all())

        all_currencies = sorted(list(from_currencies | to_currencies))
        return all_currencies
