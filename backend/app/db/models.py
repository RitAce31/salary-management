from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import (
    String,
    Date,
    DateTime,
    Numeric,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
    Index,
    text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    employee_code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    department: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    job_title: Mapped[str] = mapped_column(String(100), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    hire_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    salaries: Mapped[List["Salary"]] = relationship(
        "Salary",
        back_populates="employee",
        cascade="all, delete-orphan",
        order_by="desc(Salary.effective_date)",
    )


class Salary(Base):
    __tablename__ = "salaries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    change_reason: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", back_populates="salaries")

    __table_args__ = (
        CheckConstraint("amount > 0", name="check_positive_salary_amount"),
        Index("idx_salaries_emp_effective", "employee_id", text("effective_date DESC")),
    )


class ExchangeRate(Base):
    __tablename__ = "exchange_rates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    from_currency: Mapped[str] = mapped_column(String(3), nullable=False)
    to_currency: Mapped[str] = mapped_column(String(3), nullable=False)
    rate: Mapped[Decimal] = mapped_column(Numeric(12, 6), nullable=False)
    reference_date: Mapped[date] = mapped_column(Date, nullable=False)

    __table_args__ = (
        CheckConstraint("rate > 0", name="check_positive_exchange_rate"),
        UniqueConstraint("from_currency", "to_currency", "reference_date", name="uq_exchange_rates_currency_date"),
        Index("idx_exchange_rates_pair", "from_currency", "to_currency"),
    )
