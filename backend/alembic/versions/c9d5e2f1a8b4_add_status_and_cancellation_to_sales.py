"""add_status_and_cancellation_to_sales

Revision ID: c9d5e2f1a8b4
Revises: b8e4f1a2c3d5
Create Date: 2026-11-27 07:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c9d5e2f1a8b4'
down_revision: Union[str, None] = 'b8e4f1a2c3d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create enum if not exists
    salestatus_enum = postgresql.ENUM('COMPLETED', 'VOIDED', name='salestatus', create_type=False)
    salestatus_enum.create(op.get_bind(), checkfirst=True)

    # 2. Add status column to sales
    op.add_column(
        'sales',
        sa.Column(
            'status',
            sa.Enum('COMPLETED', 'VOIDED', name='salestatus'),
            server_default='COMPLETED',
            nullable=False
        )
    )
    op.create_index(op.f('ix_sales_status'), 'sales', ['status'], unique=False)

    # 3. Add cancellation_reason and cancelled_at columns to sales
    op.add_column('sales', sa.Column('cancellation_reason', sa.String(length=255), nullable=True))
    op.add_column('sales', sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('sales', 'cancelled_at')
    op.drop_column('sales', 'cancellation_reason')
    op.drop_index(op.f('ix_sales_status'), table_name='sales')
    op.drop_column('sales', 'status')
    op.execute('DROP TYPE IF EXISTS salestatus')
