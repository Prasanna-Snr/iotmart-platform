"""Admin audit log helper.

Every privileged mutation routes through :func:`record` so the audit trail
captures who did what (order status changes, CMS saves, settings edits, ...).

Entries are append-only — the table has no update/delete endpoints, so the
trail cannot be rewritten after the fact.
"""

from app.models.models import AdminAuditLog


async def record(
    db,
    actor,
    action: str,
    target_type: str,
    target_id=None,
    detail: str = "",
) -> None:
    """Queue an audit log entry on the current session.

    The row is committed with the rest of the request's transaction by
    ``get_db`` — no explicit flush/commit needed.
    """
    db.add(
        AdminAuditLog(
            actor_id=getattr(actor, "id", None),
            actor_email=getattr(actor, "email", None),
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id is not None else None,
            detail=detail or "",
        )
    )
