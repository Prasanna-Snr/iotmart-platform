"""add_email_pending_verifications

Revision ID: c1a2b3d4e5f6
Revises: db6006ec09bd
Create Date: 2026-08-03 10:15:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c1a2b3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'db6006ec09bd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use IF NOT EXISTS — the table may already exist if the app created it
    # via Base.metadata.create_all before this migration was added.
    op.execute("""
        CREATE TABLE IF NOT EXISTS email_pending_verifications (
            id          UUID                     NOT NULL DEFAULT gen_random_uuid(),
            email       VARCHAR(255)             NOT NULL,
            hashed_otp  VARCHAR(255)             NOT NULL,
            expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
            attempts    INTEGER                  NOT NULL DEFAULT 0,
            used        BOOLEAN                  NOT NULL DEFAULT false,
            created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            PRIMARY KEY (id),
            UNIQUE (email)
        )
    """)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS ix_email_pending_verifications_email
        ON email_pending_verifications (email)
    """)


def downgrade() -> None:
    op.drop_index(
        op.f('ix_email_pending_verifications_email'),
        table_name='email_pending_verifications',
    )
    op.drop_table('email_pending_verifications')
