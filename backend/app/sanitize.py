"""Server-side sanitization of user-authored content.

- HTML sanitization for CMS blocks that are later rendered with
  `dangerouslySetInnerHTML` (paragraph blocks).
- URL scheme allow-listing for block link/media fields.

Defense in depth: the storefront must never render unsanitized author HTML;
this module removes active content (script/event handlers/javascript: URLs)
at the point of persistence so no downstream consumer has to trust it.
"""

import re
import bleach
from bleach.css_sanitizer import CSSSanitizer

_ALLOWED_TAGS = {
    "p", "br", "hr", "div", "span",
    "b", "strong", "i", "em", "u", "s", "strike", "sub", "sup",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "a",
    "blockquote", "pre", "code",
    "table", "thead", "tbody", "tr", "th", "td",
    "img",
}

_ALLOWED_ATTRIBUTES = {
    "a": ["href", "target", "rel", "title"],
    "img": ["src", "alt", "title", "width", "height"],
    "td": ["colspan", "rowspan", "align"],
    "th": ["colspan", "rowspan", "align"],
    "table": ["border", "cellpadding", "cellspacing"],
    "*": ["class", "style"],
}

_ALLOWED_CSS = {
    "color", "background-color", "font-size", "font-weight", "font-style",
    "text-align", "text-decoration", "text-indent", "line-height",
    "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
    "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
    "border", "border-color", "border-radius", "width", "height", "float",
}

_ALLOWED_PROTOCOLS = {"http", "https", "mailto", "tel", "ftp"}

_CLEANER = bleach.Cleaner(
    tags=_ALLOWED_TAGS,
    attributes=_ALLOWED_ATTRIBUTES,
    protocols=_ALLOWED_PROTOCOLS,
    css_sanitizer=CSSSanitizer(allowed_css_properties=_ALLOWED_CSS),
    strip=True,
)

_ABSOLUTE_URL_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9+.-]*:")
_RELATIVE_URL_RE = re.compile(r"^/[^\s]*$")


def sanitize_html(html: str | None) -> str:
    """Strip script/event handlers and disallowed markup from HTML."""
    if not html:
        return ""
    return _CLEANER.clean(html)


def safe_url(url: str | None) -> str:
    """Allow http(s)/mailto/tel URLs and local absolute paths; else empty."""
    if not url:
        return ""
    url = url.strip()
    if _RELATIVE_URL_RE.match(url):
        return url
    if _ABSOLUTE_URL_RE.match(url):
        return url if url.split(":", 1)[0].lower() in _ALLOWED_PROTOCOLS else ""
    return ""


_URL_FIELDS = (
    "link",          # button
    "src",           # image / cover / audio / video
    "bgImage",       # container background
)


def sanitize_block(block: dict) -> dict:
    """Recursively sanitize a single CMS block dict (mutates and returns it)."""
    if not isinstance(block, dict):
        return block

    btype = block.get("type")
    if btype == "paragraph" and isinstance(block.get("content"), str):
        block["content"] = sanitize_html(block["content"])

    for field in _URL_FIELDS:
        if isinstance(block.get(field), str):
            block[field] = safe_url(block[field])

    children = block.get("children")
    if isinstance(children, list):
        block["children"] = [sanitize_block(c) for c in children if isinstance(c, dict)]

    return block


def sanitize_blocks(blocks: list) -> list:
    """Sanitize an entire CMS page's block tree."""
    return [sanitize_block(b) for b in blocks if isinstance(b, dict)]
