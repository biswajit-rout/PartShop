"""create_supplier_brand_discounts_table

Revision ID: b8e4f1a2c3d5
Revises: e7c2a1f4b89d
Create Date: 2026-11-26 20:16:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8e4f1a2c3d5'
down_revision: Union[str, None] = 'e7c2a1f4b89d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add default customer and mechanic selling discounts to brands
    op.add_column(
        'brands',
        sa.Column('default_customer_discount', sa.Numeric(precision=5, scale=2), server_default='0.00', nullable=False)
    )
    op.add_column(
        'brands',
        sa.Column('default_mechanic_discount', sa.Numeric(precision=5, scale=2), server_default='0.00', nullable=False)
    )

    # 2. Create supplier_brand_discounts table
    op.create_table(
        'supplier_brand_discounts',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('supplier_id', sa.Integer(), nullable=False),
        sa.Column('brand_id', sa.Integer(), nullable=False),
        sa.Column('discount_percentage', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['brand_id'], ['brands.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('supplier_id', 'brand_id', name='uq_supplier_brand_discount')
    )
    op.create_index(op.f('ix_supplier_brand_discounts_supplier_id'), 'supplier_brand_discounts', ['supplier_id'], unique=False)
    op.create_index(op.f('ix_supplier_brand_discounts_brand_id'), 'supplier_brand_discounts', ['brand_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_supplier_brand_discounts_brand_id'), table_name='supplier_brand_discounts')
    op.drop_index(op.f('ix_supplier_brand_discounts_supplier_id'), table_name='supplier_brand_discounts')
    op.drop_table('supplier_brand_discounts')
    op.drop_column('brands', 'default_mechanic_discount')
    op.drop_column('brands', 'default_customer_discount')
