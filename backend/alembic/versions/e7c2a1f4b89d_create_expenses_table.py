"""create_expenses_table

Revision ID: e7c2a1f4b89d
Revises: a5c007d4e19b
Create Date: 2026-11-26 19:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e7c2a1f4b89d'
down_revision: Union[str, None] = 'a5c007d4e19b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create enum if not exists
    expense_category_enum = postgresql.ENUM(
        'RENT', 'ELECTRICITY', 'TEA_REFRESHMENT', 'SALARY_WAGES',
        'MAINTENANCE', 'TRANSPORT', 'STATIONERY', 'OTHER',
        name='expensecategory',
        create_type=False
    )
    expense_category_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create expenses table using the existing enum
    op.create_table(
        'expenses',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('category', expense_category_enum, nullable=False, server_default='OTHER'),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('payment_mode', sa.String(length=50), nullable=False, server_default='CASH'),
        sa.Column('expense_date', sa.Date(), nullable=False, server_default=sa.text('CURRENT_DATE')),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by_user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_expenses_expense_date'), 'expenses', ['expense_date'], unique=False)
    op.create_index(op.f('ix_expenses_category'), 'expenses', ['category'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_expenses_category'), table_name='expenses')
    op.drop_index(op.f('ix_expenses_expense_date'), table_name='expenses')
    op.drop_table('expenses')
    postgresql.ENUM(name='expensecategory').drop(op.get_bind(), checkfirst=True)
