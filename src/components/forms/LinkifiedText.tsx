import { Fragment, type ReactNode } from "react";

/**
 * Matches, in order of priority:
 *  1. Markdown-style links: [texto visible](https://ejemplo.com)
 *  2. Bare URLs: https://ejemplo.com · www.ejemplo.com
 */
const LINK_RE = /\[([^\]\n]+)\]\(((?:https?:\/\/|www\.)[^\s)]+)\)|((?:https?:\/\/|www\.)[^\s<]+)/gi;
const TRAILING_PUNCT = /[.,;:!?)\]}'"»]+$/;

function toHref(raw: string) {
  return raw.toLowerCase().startsWith("www.") ? `https://${raw}` : raw;
}

/** Turns URLs inside plain text into links that open in a new tab. */
export function LinkifiedText({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK_RE)) {
    const start = m.index ?? 0;
    let label: string;
    let url: string;
    let end = start + m[0].length;
    if (m[1] && m[2]) {
      label = m[1];
      url = m[2];
    } else {
      url = m[3] ?? "";
      const trail = url.match(TRAILING_PUNCT)?.[0] ?? "";
      url = url.slice(0, url.length - trail.length);
      end -= trail.length;
      label = url;
    }
    if (start > last) out.push(text.slice(last, start));
    out.push(
      <a key={start} href={toHref(url)} target="_blank" rel="noopener noreferrer" className="f-link">
        {label}
      </a>,
    );
    last = end;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out.map((n, i) => <Fragment key={i}>{n}</Fragment>)}</>;
}
