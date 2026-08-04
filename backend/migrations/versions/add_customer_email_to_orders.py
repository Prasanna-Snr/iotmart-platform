"""add customer_email to orders

Revision ID: f1a2b3c4d5e6
Revises: a1b2c3d4e5f6
Create Date: 2026-08-04
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'orders',
        sa.Column('customer_email', sa.String(255), nullable=True)
    )
    op.create_index('ix_orders_customer_email', 'orders', ['customer_email'])


def downgrade() -> None:
    op.drop_index('ix_orders_customer_email', table_name='orders')
    op.drop_column('orders', 'customer_email')
