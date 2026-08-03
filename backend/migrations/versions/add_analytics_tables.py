"""add analytics tables

Revision ID: a1b2c3d4e5f6
Revises: c1a2b3d4e5f6
Create Date: 2026-08-03
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
import uuid

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'c1a2b3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # page_views table
    op.create_table(
        'page_views',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('visitor_id', sa.String(64), nullable=False),
        sa.Column('session_id', sa.String(64), nullable=False),
        sa.Column('ip_hash', sa.String(64), nullable=False),
        sa.Column('path', sa.String(2048), nullable=False),
        sa.Column('referrer', sa.Text, nullable=True),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('browser', sa.String(100), nullable=True),
        sa.Column('browser_version', sa.String(50), nullable=True),
        sa.Column('os', sa.String(100), nullable=True),
        sa.Column('device_type', sa.String(50), nullable=True),
        sa.Column('country', sa.String(100), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('duration_ms', sa.Integer, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_page_views_visitor_id', 'page_views', ['visitor_id'])
    op.create_index('ix_page_views_session_id', 'page_views', ['session_id'])
    op.create_index('ix_page_views_path', 'page_views', ['path'])
    op.create_index('ix_page_views_created_at', 'page_views', ['created_at'])
    op.create_index('ix_page_views_created_at_visitor', 'page_views', ['created_at', 'visitor_id'])

    # online_visitors table
    op.create_table(
        'online_visitors',
        sa.Column('session_id', sa.String(64), primary_key=True),
        sa.Column('visitor_id', sa.String(64), nullable=False),
        sa.Column('path', sa.String(2048), nullable=False),
        sa.Column('last_seen', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_online_visitors_visitor_id', 'online_visitors', ['visitor_id'])
    op.create_index('ix_online_visitors_last_seen', 'online_visitors', ['last_seen'])


def downgrade() -> None:
    op.drop_index('ix_online_visitors_last_seen', table_name='online_visitors')
    op.drop_index('ix_online_visitors_visitor_id', table_name='online_visitors')
    op.drop_table('online_visitors')

    op.drop_index('ix_page_views_created_at_visitor', table_name='page_views')
    op.drop_index('ix_page_views_created_at', table_name='page_views')
    op.drop_index('ix_page_views_path', table_name='page_views')
    op.drop_index('ix_page_views_session_id', table_name='page_views')
    op.drop_index('ix_page_views_visitor_id', table_name='page_views')
    op.drop_table('page_views')
