"""add is_confirmed to spare_parts

Revision ID: d1e8f3a5b7c9
Revises: c9d5e2f1a8b4
Create Date: 2026-11-27 23:36:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1e8f3a5b7c9'
down_revision: Union[str, None] = 'c9d5e2f1a8b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add is_confirmed column to spare_parts with default True for existing items
    op.add_column(
        'spare_parts',
        sa.Column('is_confirmed', sa.Boolean(), server_default=sa.text('true'), nullable=False)
    )
    # 2. Index is_confirmed for rapid querying
    op.create_index(
        op.f('ix_spare_parts_is_confirmed'),
        'spare_parts',
        ['is_confirmed'],
        unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_spare_parts_is_confirmed'), table_name='spare_parts')
    op.drop_column('spare_parts', 'is_confirmed')
