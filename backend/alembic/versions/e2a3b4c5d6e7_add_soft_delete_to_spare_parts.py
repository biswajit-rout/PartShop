"""add soft delete to spare_parts

Revision ID: e2a3b4c5d6e7
Revises: d1e8f3a5b7c9
Create Date: 2026-11-28 07:56:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e2a3b4c5d6e7'
down_revision = 'd1e8f3a5b7c9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'spare_parts',
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('false'), nullable=False)
    )
    op.add_column(
        'spare_parts',
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index(
        op.f('ix_spare_parts_is_deleted'),
        'spare_parts',
        ['is_deleted'],
        unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_spare_parts_is_deleted'), table_name='spare_parts')
    op.drop_column('spare_parts', 'deleted_at')
    op.drop_column('spare_parts', 'is_deleted')
