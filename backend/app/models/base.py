
# Every table in a production system should track when it was created and when it was last edited. Instead of copying and pasting created_at and updated_at into every table, we create a reusable Mixin.

from datetime import datetime, timezone
from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    """
    Reusable mixin that automatically adds created_at and updated_at
    timestamps (in UTC) to any database table.
    """
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

# Why we write it this way:
# Mapped[datetime]: This is modern SQLAlchemy 2.0 syntax. It tells Python and VS Code the exact data type, giving you instant autocomplete and catching bugs early.
# timezone=True & UTC: Always store timestamps in UTC in the database. Never store local machine time, because timezones can create messy bugs during billing reconciliations.
# onupdate: Automatically updates updated_at every time a price or quantity changes in that row!
