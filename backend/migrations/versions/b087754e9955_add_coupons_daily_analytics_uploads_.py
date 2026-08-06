"""add coupons daily analytics uploads search_vector and indexes

Revision ID: b087754e9955
Revises: 740f602fcdfd
Create Date: 2026-08-05 17:26:54.329624

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b087754e9955'
down_revision: Union[str, Sequence[str], None] = '740f602fcdfd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ─── New tables ────────────────────────────────────────────────────────
    # Tables may already exist if created earlier via Base.metadata.create_all,
    # so guard creation with IF NOT EXISTS.
    op.execute("""
        CREATE TABLE IF NOT EXISTS coupons (
            id                  UUID                     NOT NULL,
            code                VARCHAR(50)              NOT NULL,
            description         TEXT                     NOT NULL,
            percent_off         DOUBLE PRECISION,
            fixed_amount        DOUBLE PRECISION,
            min_subtotal        DOUBLE PRECISION         NOT NULL,
            max_uses            INTEGER,
            used_count          INTEGER                  NOT NULL,
            max_uses_per_user   INTEGER,
            active              BOOLEAN                  NOT NULL,
            starts_at           TIMESTAMP WITH TIME ZONE,
            expires_at          TIMESTAMP WITH TIME ZONE,
            created_at          TIMESTAMP WITH TIME ZONE NOT NULL,
            PRIMARY KEY (id)
        )
    """)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS ix_coupons_code
        ON coupons (code)
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS daily_analytics (
            day             DATE                     NOT NULL,
            views           INTEGER                  NOT NULL,
            visitors        INTEGER                  NOT NULL,
            sessions        INTEGER                  NOT NULL,
            avg_duration_ms INTEGER,
            top_paths       JSONB                    NOT NULL,
            devices         JSONB                    NOT NULL,
            browsers        JSONB                    NOT NULL,
            countries       JSONB                    NOT NULL,
            PRIMARY KEY (day)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS user_uploads (
            id          UUID                     NOT NULL,
            user_id     UUID,
            path        TEXT                     NOT NULL,
            size_bytes  INTEGER                  NOT NULL,
            created_at  TIMESTAMP WITH TIME ZONE NOT NULL,
            PRIMARY KEY (id)
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_user_uploads_user_id
        ON user_uploads (user_id)
    """)

    # ─── Orders ────────────────────────────────────────────────────────────
    # server_default backfills existing rows before the NOT NULL constraint;
    # it is dropped afterwards to match the model (Python-side default only).
    op.add_column('orders', sa.Column('discount_amount', sa.Float(), nullable=False, server_default='0'))
    op.alter_column('orders', 'discount_amount', server_default=None)
    op.add_column('orders', sa.Column('coupon_code', sa.String(length=50), nullable=True))
    op.create_index(op.f('ix_orders_status'), 'orders', ['status'], unique=False)
    op.create_index(op.f('ix_orders_user_id'), 'orders', ['user_id'], unique=False)

    # ─── Products ──────────────────────────────────────────────────────────
    op.add_column('products', sa.Column('search_vector', postgresql.TSVECTOR(), nullable=True))
    op.execute("UPDATE products SET search_vector = to_tsvector('english', coalesce(name,''))")
    op.create_index('ix_products_search_vector', 'products', ['search_vector'], unique=False, postgresql_using='gin')
    op.create_index('ix_products_brand_price', 'products', ['brand_id', 'price'], unique=False)
    op.create_index(op.f('ix_products_brand_id'), 'products', ['brand_id'], unique=False)
    op.create_index('ix_products_category_price', 'products', ['category_id', 'price'], unique=False)
    op.create_index(op.f('ix_products_category_id'), 'products', ['category_id'], unique=False)

    # ─── Reviews / Page views / Tutorials ──────────────────────────────────
    op.create_index(op.f('ix_product_reviews_product_id'), 'product_reviews', ['product_id'], unique=False)
    op.create_index(op.f('ix_product_reviews_user_id'), 'product_reviews', ['user_id'], unique=False)
    op.create_index('ix_page_views_created_visitor', 'page_views', ['created_at', 'visitor_id'], unique=False)
    op.create_index(op.f('ix_tutorials_category_id'), 'tutorials', ['category_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_tutorials_category_id'), table_name='tutorials')
    op.drop_index('ix_page_views_created_visitor', table_name='page_views')
    op.drop_index(op.f('ix_product_reviews_user_id'), table_name='product_reviews')
    op.drop_index(op.f('ix_product_reviews_product_id'), table_name='product_reviews')

    op.drop_index('ix_products_search_vector', table_name='products', postgresql_using='gin')
    op.drop_index('ix_products_category_price', table_name='products')
    op.drop_index(op.f('ix_products_category_id'), table_name='products')
    op.drop_index('ix_products_brand_price', table_name='products')
    op.drop_index(op.f('ix_products_brand_id'), table_name='products')
    op.drop_column('products', 'search_vector')

    op.drop_index(op.f('ix_orders_user_id'), table_name='orders')
    op.drop_index(op.f('ix_orders_status'), table_name='orders')
    op.drop_column('orders', 'coupon_code')
    op.drop_column('orders', 'discount_amount')

    op.drop_index('ix_user_uploads_user_id', table_name='user_uploads')
    op.drop_table('user_uploads')
    op.drop_table('daily_analytics')
    op.drop_index('ix_coupons_code', table_name='coupons')
    op.drop_table('coupons')
