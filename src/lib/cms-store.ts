// ─── CMS Store ────────────────────────────────────────────────────────────────

export type BlockType =
  // Text
  | "paragraph"
  | "heading"
  | "list"
  | "table"
  | "quote"
  | "code"
  // Media
  | "image"
  | "cover"
  | "audio"
  | "video"
  // Layout
  | "button"
  // Containers
  | "row"
  | "column"
  | "container";

export interface BlockBase { id: string; type: BlockType }

// ── Text Blocks ───────────────────────────────────────────────────────────────

export interface ParagraphBlock extends BlockBase {
  type: "paragraph";
  content: string;
  align: "left" | "center" | "right";
  fontSize: "sm" | "base" | "lg" | "xl";
  width: "auto" | "full" | "fit" | string;
  height: "auto" | "fit" | string;
  paddingTop: number; paddingRight: number; paddingBottom: number; paddingLeft: number;
}

export interface HeadingBlock extends BlockBase {
  type: "heading";
  text: string;
  level: "h1" | "h2" | "h3" | "h4";
  align: "left" | "center" | "right";
  color: string; // hex color, "" = default (#11100E)
}

export interface ListBlock extends BlockBase {
  type: "list";
  style: "unordered" | "ordered";
  items: string[];
}

export interface TableBlock extends BlockBase {
  type: "table";
  headers: string[];
  rows: string[][];
}

export interface QuoteBlock extends BlockBase {
  type: "quote";
  text: string;
  author: string;
  align: "left" | "center";
}

export interface CodeBlock extends BlockBase {
  type: "code";
  code: string;
  language: string;
  caption: string;
}

// ── Media Blocks ──────────────────────────────────────────────────────────────

export interface ImageBlock extends BlockBase {
  type: "image";
  src: string;
  alt: string;
  caption: string;
  align: "left" | "center" | "right";
  // Dimensions
  width: "auto" | "full" | "fit" | string;
  height: "auto" | "fit" | string;
  maxWidth: "none" | "full" | string;
  maxHeight: "none" | string;
  // Display
  objectFit: "cover" | "contain" | "fill" | "none" | "scale-down";
  objectPosition: "center" | "top" | "bottom" | "left" | "right" | string;
  opacity: number; // 0–100
  overlayColor: string; // hex color for color tint overlay, "" = no overlay
  overlayOpacity: number; // 0–100, opacity of the color overlay
  // Border
  rounded: boolean;
  borderColor: string;
  borderWidth: number;
  borderStyle: "none" | "solid" | "dashed" | "dotted";
  borderRadius: number;
}

export interface CoverBlock extends BlockBase {
  type: "cover";
  src: string;
  heading: string;
  subheading: string;
  overlay: number; // 0–90 opacity %
  height: "sm" | "md" | "lg" | "full";
  textColor: string;
}

export interface AudioBlock extends BlockBase {
  type: "audio";
  src: string;
  title: string;
  caption: string;
}

export interface VideoBlock extends BlockBase {
  type: "video";
  src: string;       // URL or embed URL
  title: string;
  caption: string;
  autoplay: boolean;
}

// ── Layout Blocks ─────────────────────────────────────────────────────────────

export interface ButtonBlock extends BlockBase {
  type: "button";
  text: string;
  link: string;
  variant: "primary" | "secondary" | "outline" | "ghost";
  size: "sm" | "md" | "lg";
  align: "left" | "center" | "right";
  openNewTab: boolean;
}

// ── Container Blocks ──────────────────────────────────────────────────────────

export interface RowBlock extends BlockBase {
  type: "row";
  children: Block[];
  alignItems: "flex-start" | "center" | "flex-end" | "stretch" | "space-between" | "space-around";
  justifyContent: "flex-start" | "center" | "flex-end" | "space-between" | "space-around";
  width: "auto" | "full" | "fit" | string;
  height: "auto" | "full" | "fit" | string;
}

export interface ColumnBlock extends BlockBase {
  type: "column";
  children: Block[];
  alignItems: "flex-start" | "center" | "flex-end" | "stretch" | "space-between" | "space-around";
  justifyContent: "flex-start" | "center" | "flex-end" | "space-between" | "space-around";
  width: "auto" | "full" | "fit" | string;
  height: "auto" | "full" | "fit" | string;
}

export interface ContainerBlock extends BlockBase {
  type: "container";
  children: Block[];
  // Spacing
  paddingTop: number; paddingRight: number; paddingBottom: number; paddingLeft: number;
  marginTop: number;  marginRight: number;  marginBottom: number;  marginLeft: number;
  // Dimensions
  width: "auto" | "full" | "fit" | string;
  height: "auto" | "full" | "fit" | string;
  // Decoration
  bgColor: string;
  bgGradient: string;
  bgImage: string;
  borderColor: string;
  borderWidth: number;
  borderStyle: "none" | "solid" | "dashed" | "dotted";
  borderRadius: number;
  boxShadow: "none" | "sm" | "md" | "lg" | "xl";
}

export type Block =
  | ParagraphBlock | HeadingBlock | ListBlock | TableBlock | QuoteBlock | CodeBlock
  | ImageBlock | CoverBlock | AudioBlock | VideoBlock
  | ButtonBlock
  | RowBlock | ColumnBlock | ContainerBlock;

export type PageStatus = "published" | "draft";

export interface CMSPage {
  id: string;
  title: string;
  slug: string;
  status: PageStatus;
  blocks: Block[];
  updatedAt: string;
}

// ─── uid helper ──────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── Block defaults ───────────────────────────────────────────────────────────
export const BLOCK_DEFAULTS: Record<BlockType, () => Block> = {
  paragraph: () => ({ id: uid(), type: "paragraph", content: "Write your paragraph content here. Click to edit this text.", align: "left", fontSize: "base", width: "auto", height: "auto", paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0 }),
  heading:   () => ({ id: uid(), type: "heading",   text: "Section Heading", level: "h2", align: "left", color: "" }),
  list:      () => ({ id: uid(), type: "list",       style: "unordered", items: ["First item", "Second item", "Third item"] }),
  table:     () => ({ id: uid(), type: "table",      headers: ["Column 1", "Column 2", "Column 3"], rows: [["Cell", "Cell", "Cell"], ["Cell", "Cell", "Cell"]] }),
  quote:     () => ({ id: uid(), type: "quote",      text: "The best way to predict the future is to build it.", author: "— Unknown", align: "center" }),
  code:      () => ({ id: uid(), type: "code",       code: "// Write your code here\nconsole.log('Hello, World!');", language: "javascript", caption: "" }),
  image:     () => ({ id: uid(), type: "image", src: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80", alt: "Image", caption: "", align: "center", width: "full", height: "auto", maxWidth: "none", maxHeight: "none", objectFit: "cover", objectPosition: "center", opacity: 100, overlayColor: "", overlayOpacity: 0, rounded: false, borderColor: "#CDBBAD", borderWidth: 0, borderStyle: "none", borderRadius: 0 }),
  cover:     () => ({ id: uid(), type: "cover",      src: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80", heading: "Cover Heading", subheading: "A short subtitle goes here", overlay: 50, height: "md", textColor: "#FFFFFF" }),
  audio:     () => ({ id: uid(), type: "audio",      src: "", title: "Audio Title", caption: "" }),
  video:     () => ({ id: uid(), type: "video",      src: "", title: "Video Title", caption: "", autoplay: false }),
  button:    () => ({ id: uid(), type: "button",     text: "Click Here", link: "/", variant: "primary", size: "md", align: "left", openNewTab: false }),
  row:       () => ({ id: uid(), type: "row",    children: [], alignItems: "flex-start", justifyContent: "flex-start", width: "auto", height: "auto" }),
  container: () => ({ id: uid(), type: "container", children: [], paddingTop: 16, paddingRight: 16, paddingBottom: 16, paddingLeft: 16, marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0, width: "auto", height: "auto", bgColor: "", bgGradient: "", bgImage: "", borderColor: "#CDBBAD", borderWidth: 0, borderStyle: "none", borderRadius: 8, boxShadow: "none" } as ContainerBlock),
  column:    () => ({ id: uid(), type: "column", children: [], alignItems: "flex-start", justifyContent: "flex-start", width: "auto", height: "auto" }),
};

// ─── Block meta (labels + icons, no emojis) ───────────────────────────────────
export const BLOCK_META: Record<BlockType, { label: string; icon: string; description: string }> = {
  paragraph: { label: "Paragraph",  icon: "P",   description: "Rich text paragraph" },
  heading:   { label: "Heading",    icon: "H",   description: "H1, H2, H3, or H4 title" },
  list:      { label: "List",       icon: "Li",  description: "Ordered or unordered list" },
  table:     { label: "Table",      icon: "Tb",  description: "Data table with rows and columns" },
  quote:     { label: "Quote",      icon: "\"",  description: "Blockquote with attribution" },
  code:      { label: "Code",       icon: "</>", description: "Syntax-highlighted code block" },
  image:     { label: "Image",      icon: "Img", description: "Image with caption and alignment" },
  cover:     { label: "Cover",      icon: "Cv",  description: "Full-width cover image with text overlay" },
  audio:     { label: "Audio",      icon: "Au",  description: "Audio player with title" },
  video:     { label: "Video",      icon: "Vid", description: "Video player or embed" },
  button:    { label: "Button",     icon: "Btn", description: "Styled call-to-action button" },
  row:       { label: "Row",        icon: "||",  description: "Horizontal side-by-side layout" },
  column:    { label: "Column",     icon: "=",   description: "Vertical stacked layout" },
  container: { label: "Container", icon: "[ ]", description: "Wrapper with padding, colors, border & shadow" },
};

// ─── Mutable page store ───────────────────────────────────────────────────────

/**
 * Map an API CMSPageOut (backend) record to the local CMSPage shape used by
 * the page builder. The backend is the single source of truth.
 */
export function apiPageToLocal(a: any): CMSPage {
  return {
    id: String(a.id),
    title: a.title,
    slug: a.slug,
    status: a.status === "published" ? "published" : "draft",
    blocks: a.blocks ?? [],
    updatedAt: a.updated_at ?? new Date().toISOString(),
  };
}

/** Map a local CMSPage to the payload the CMS API accepts. */
export function localPageToApi(p: CMSPage): { title: string; slug: string; status: PageStatus; blocks: Block[] } {
  return { title: p.title, slug: p.slug, status: p.status, blocks: p.blocks };
}
