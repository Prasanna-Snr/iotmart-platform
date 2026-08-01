import Image from "next/image";
import type { Block } from "@/lib/cms-store";

const alignCls = { left: "text-left", center: "text-center", right: "text-right" };
const widthCls = { full: "w-full", large: "max-w-3xl mx-auto", medium: "max-w-xl mx-auto", small: "max-w-xs mx-auto" };
const heightCls = { sm: "h-40", md: "h-64", lg: "h-96", full: "h-screen" };

function BlockPreview({ block }: { block: Block }): React.ReactElement | null {
  switch (block.type) {

    // ── Text ────────────────────────────────────────────────────────────────
    // ── Paragraph ───────────────────────────────────────────────────────────
    case "paragraph": {
      const sz = { sm: "text-sm", base: "text-base", lg: "text-lg", xl: "text-xl" };
      const widthMap: Record<string, string> = { auto: "auto", full: "100%", fit: "fit-content" };
      const heightMap: Record<string, string> = { auto: "auto", fit: "fit-content" };
      return (
        <div
          style={{
            width:         widthMap[block.width]  ?? block.width,
            height:        heightMap[block.height] ?? block.height,
            overflow:      "auto",
            paddingTop:    block.paddingTop    || undefined,
            paddingRight:  block.paddingRight  || undefined,
            paddingBottom: block.paddingBottom || undefined,
            paddingLeft:   block.paddingLeft   || undefined,
          }}
          className={`text-[#11100E] leading-relaxed py-1
            [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic
            [&_u]:underline [&_s]:line-through [&_strike]:line-through
            [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
            [&_li]:mb-0.5 [&_a]:text-[#5D1C34] [&_a]:underline
            ${sz[block.fontSize]} ${alignCls[block.align]}`}
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );
    }

    case "heading": {
      const Tag = block.level as "h1" | "h2" | "h3" | "h4";
      const sz = { h1: "text-4xl font-extrabold", h2: "text-3xl font-bold", h3: "text-2xl font-bold", h4: "text-xl font-semibold" };
      return <Tag style={{ color: block.color || "#11100E" }} className={`py-2 ${sz[block.level]} ${alignCls[block.align]}`}>{block.text}</Tag>;
    }

    case "list":
      return block.style === "unordered" ? (
        <ul className="list-disc list-inside space-y-1.5 py-2 text-sm text-[#11100E]">
          {block.items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      ) : (
        <ol className="list-decimal list-inside space-y-1.5 py-2 text-sm text-[#11100E]">
          {block.items.map((item, i) => <li key={i}>{item}</li>)}
        </ol>
      );

    case "table":
      return (
        <div className="overflow-x-auto py-2">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#F0E9E3]">
                {block.headers.map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-left font-semibold text-[#11100E] border border-[#CDBBAD]/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-[#F0E9E3]/40"}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2.5 text-[#899581] border border-[#CDBBAD]/40">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "quote":
      return (
        <blockquote className={`border-l-4 border-[#5D1C34] pl-5 py-3 my-2 ${block.align === "center" ? "text-center border-l-0 border-t-4 pt-5 pl-0" : ""}`}>
          <p className="text-lg italic text-[#11100E] leading-relaxed">&ldquo;{block.text}&rdquo;</p>
          {block.author && <footer className="text-sm text-[#899581] mt-2 font-medium">{block.author}</footer>}
        </blockquote>
      );

    case "code":
      return (
        <div className="py-2">
          <div className="bg-[#11100E] rounded-xl overflow-hidden">
            {block.language && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                <span className="text-xs text-[#899581] font-mono uppercase">{block.language}</span>
                <div className="flex gap-1.5">
                  {["bg-red-500","bg-amber-400","bg-green-500"].map((c,i) => <span key={i} className={`w-2.5 h-2.5 rounded-full ${c}`} />)}
                </div>
              </div>
            )}
            <pre className="p-4 text-sm text-[#CDBBAD] font-mono overflow-x-auto leading-relaxed">
              <code>{block.code}</code>
            </pre>
          </div>
          {block.caption && <p className="text-xs text-[#899581] text-center mt-2">{block.caption}</p>}
        </div>
      );

    // ── Media ───────────────────────────────────────────────────────────────
    case "image": {
      const widthMap:  Record<string, string> = { auto: "auto", full: "100%", fit: "fit-content" };
      const heightMap: Record<string, string> = { auto: "auto", fit: "fit-content" };
      const alignWrap = { left: "mr-auto", center: "mx-auto", right: "ml-auto" };
      const shadowBorder: React.CSSProperties = {
        borderColor:  block.borderWidth > 0 ? block.borderColor : undefined,
        borderWidth:  block.borderWidth > 0 ? block.borderWidth : undefined,
        borderStyle:  block.borderStyle !== "none" ? block.borderStyle as React.CSSProperties["borderStyle"] : undefined,
        borderRadius: block.rounded ? 9999 : block.borderRadius,
        opacity:      block.opacity / 100,
      };
      return (
        <figure className="py-2">
          <div
            className={`overflow-hidden relative ${alignWrap[block.align]}`}
            style={{
              width:     widthMap[block.width]    ?? block.width,
              height:    heightMap[block.height]  ?? block.height,
              maxWidth:  block.maxWidth  === "none" ? undefined : (block.maxWidth  === "full" ? "100%" : block.maxWidth),
              maxHeight: block.maxHeight === "none" ? undefined : block.maxHeight,
              ...shadowBorder,
            }}
          >
            {block.src ? (
              <img
                src={block.src}
                alt={block.alt || "Image"}
                style={{
                  width: "100%",
                  height: heightMap[block.height] ?? block.height === "auto" ? undefined : "100%",
                  objectFit:     block.objectFit,
                  objectPosition: block.objectPosition,
                  display: "block",
                }}
              />
            ) : (
              <div className="w-full aspect-video bg-[#F0E9E3] border-2 border-dashed border-[#CDBBAD] rounded-xl flex items-center justify-center text-[#CDBBAD] text-sm">
                No image URL set
              </div>
            )}
            {/* Color overlay / tint */}
            {block.overlayColor && block.overlayOpacity > 0 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundColor: block.overlayColor,
                  opacity: block.overlayOpacity / 100,
                }}
              />
            )}
          </div>
          {block.caption && <figcaption className="text-center text-xs text-[#899581] mt-2">{block.caption}</figcaption>}
        </figure>
      );
    }

    case "cover": {
      const h = heightCls[block.height];
      return (
        <div className={`relative ${h} w-full overflow-hidden rounded-xl`}>
          {block.src ? (
            <Image src={block.src} alt={block.heading} fill className="object-cover" sizes="100vw" />
          ) : (
            <div className="absolute inset-0 bg-[#11100E]" />
          )}
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${block.overlay / 100})` }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
            <h2 style={{ color: block.textColor }} className="text-3xl md:text-5xl font-bold mb-3 drop-shadow-lg">{block.heading}</h2>
            {block.subheading && <p style={{ color: block.textColor, opacity: 0.85 }} className="text-lg drop-shadow">{block.subheading}</p>}
          </div>
        </div>
      );
    }

    case "audio":
      return (
        <div className="py-2">
          {block.title && <p className="text-sm font-medium text-[#11100E] mb-2">{block.title}</p>}
          {block.src ? (
            <audio controls className="w-full" src={block.src}>Your browser does not support audio.</audio>
          ) : (
            <div className="w-full h-12 bg-[#F0E9E3] border-2 border-dashed border-[#CDBBAD] rounded-lg flex items-center justify-center text-xs text-[#CDBBAD]">No audio URL set</div>
          )}
          {block.caption && <p className="text-xs text-[#899581] mt-1.5">{block.caption}</p>}
        </div>
      );

    case "video":
      return (
        <div className="py-2">
          {block.title && <p className="text-sm font-medium text-[#11100E] mb-2">{block.title}</p>}
          {block.src ? (
            block.src.includes("youtube") || block.src.includes("vimeo") ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden">
                <iframe src={block.src} title={block.title} className="absolute inset-0 w-full h-full" allowFullScreen />
              </div>
            ) : (
              <video controls autoPlay={block.autoplay} className="w-full rounded-xl" src={block.src}>Your browser does not support video.</video>
            )
          ) : (
            <div className="w-full aspect-video bg-[#F0E9E3] border-2 border-dashed border-[#CDBBAD] rounded-xl flex items-center justify-center text-xs text-[#CDBBAD]">No video URL set</div>
          )}
          {block.caption && <p className="text-xs text-[#899581] mt-1.5">{block.caption}</p>}
        </div>
      );

    // ── Layout ──────────────────────────────────────────────────────────────
    case "button": {
      const variants = {
        primary:   "bg-[#5D1C34] text-white hover:bg-[#4a1628]",
        secondary: "bg-[#A67D45] text-white hover:bg-[#8f6b39]",
        outline:   "border-2 border-[#5D1C34] text-[#5D1C34] hover:bg-[#5D1C34]/5",
        ghost:     "text-[#5D1C34] hover:bg-[#5D1C34]/5 underline",
      };
      const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-5 py-2.5 text-sm", lg: "px-7 py-3 text-base" };
      const wrapAlign = { left: "text-left", center: "text-center", right: "text-right" };
      return (
        <div className={`py-2 ${wrapAlign[block.align]}`}>
          <a
            href={block.link}
            target={block.openNewTab ? "_blank" : "_self"}
            rel={block.openNewTab ? "noopener noreferrer" : undefined}
            className={`inline-block font-semibold rounded-lg transition-colors ${variants[block.variant]} ${sizes[block.size]}`}
          >
            {block.text}
          </a>
        </div>
      );
    }

    // ── Containers ──────────────────────────────────────────────────────────
    case "row": {
      const rw = (v: string) => v === "fit" ? "fit-content" : v === "full" ? "100%" : v && v !== "auto" ? v : "100%";
      const rh = (v: string) => v === "auto" || !v ? undefined : v === "full" ? "100%" : v === "fit" ? "fit-content" : v;
      return (
        <div style={{ display: "flex", flexDirection: "row", alignItems: block.alignItems ?? "flex-start", justifyContent: block.justifyContent ?? "flex-start", gap: "1rem", width: rw(block.width), height: rh(block.height) }} className="py-1">
          {block.children.length > 0
            ? block.children.map((c) => <div key={c.id} className="min-w-0" style={{ flex: (block.justifyContent === "space-between" || block.justifyContent === "space-around") ? "0 1 auto" : "1 1 0" }}><BlockPreview block={c} /></div>)
            : <div className="flex-1 border-2 border-dashed border-[#CDBBAD] rounded-lg p-4 text-center text-xs text-[#CDBBAD]">Empty Row</div>}
        </div>
      );
    }

    case "column": {
      const rw = (v: string) => v === "fit" ? "fit-content" : v === "full" ? "100%" : v && v !== "auto" ? v : "100%";
      const rh = (v: string) => v === "auto" || !v ? undefined : v === "full" ? "100%" : v === "fit" ? "fit-content" : v;
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: block.alignItems ?? "flex-start", justifyContent: block.justifyContent ?? "flex-start", gap: "0.5rem", width: rw(block.width), height: rh(block.height) }} className="py-1">
          {block.children.length > 0
            ? block.children.map((c) => <div key={c.id} style={{ width: "100%" }}><BlockPreview block={c} /></div>)
            : <div className="border-2 border-dashed border-[#CDBBAD] rounded-lg p-4 text-center text-xs text-[#CDBBAD]">Empty Column</div>}
        </div>
      );
    }

    case "container": {
      const shadowMap: Record<string, string> = { none: "", sm: "0 1px 3px rgba(0,0,0,0.12)", md: "0 4px 6px rgba(0,0,0,0.1)", lg: "0 10px 15px rgba(0,0,0,0.1)", xl: "0 20px 25px rgba(0,0,0,0.1)" };
      const heightMap: Record<string, string> = { auto: "auto", full: "100%", fit: "fit-content" };
      const resolveWidth = (w: string) => {
        if (w === "fit") return "fit-content";
        if (w === "full") return "100%";
        if (w && w !== "auto") return w; // custom e.g. "50%", "400px", "100vw"
        return "100%"; // auto = fill parent (Flutter default)
      };
      const style: React.CSSProperties = {
        paddingTop:    block.paddingTop,
        paddingRight:  block.paddingRight,
        paddingBottom: block.paddingBottom,
        paddingLeft:   block.paddingLeft,
        marginTop:     block.marginTop,
        marginRight:   block.marginRight,
        marginBottom:  block.marginBottom,
        marginLeft:    block.marginLeft,
        width:         resolveWidth(block.width),
        height:        heightMap[block.height] ?? block.height,
        background:    block.bgGradient
                       || (block.bgImage ? `url(${block.bgImage}) center/cover no-repeat` : undefined)
                       || block.bgColor
                       || undefined,
        borderColor:   block.borderWidth > 0 ? block.borderColor : undefined,
        borderWidth:   block.borderWidth > 0 ? block.borderWidth : undefined,
        borderStyle:   block.borderStyle !== "none" ? block.borderStyle as React.CSSProperties["borderStyle"] : undefined,
        borderRadius:  block.borderRadius,
        boxShadow:     shadowMap[block.boxShadow] || undefined,
        minHeight:     40,
      };
      const child = block.children[0];
      return (
        <div style={style}>
          {child
            ? <BlockPreview block={child} />
            : <div className="border-2 border-dashed border-[#CDBBAD] rounded-lg p-4 text-center text-xs text-[#CDBBAD]">Empty Container</div>}
        </div>
      );
    }

    default:
      return null;
  }
}

export default BlockPreview;
