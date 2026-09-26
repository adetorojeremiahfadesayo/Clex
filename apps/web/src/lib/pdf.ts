import { PDFDocument, type PDFFont, type PDFPage, StandardFonts, rgb } from "pdf-lib";

// Standard PDF fonts only cover WinAnsi; map common symbols and drop anything else.
const map: Record<string, string> = { "₦": "NGN ", "→": "->", "✓": "[done]", "↗": "", "≥": ">=", "≤": "<=" };
const winAnsiExtra = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
export function clean(text: string) {
  return [...text].map((c) => map[c] ?? (c.charCodeAt(0) < 256 || winAnsiExtra.has(c) ? c : "")).join("").replace(/\t/g, "  ");
}

export type Block =
  | { type: "title"; text: string; sub?: string }
  | { type: "h2"; text: string }
  | { type: "p"; text: string; muted?: boolean }
  | { type: "list"; items: string[]; checks?: boolean[] }
  | { type: "kv"; rows: [string, string][] }
  | { type: "note"; text: string };

const emerald = rgb(0.04, 0.36, 0.26);
const ink = rgb(0.07, 0.07, 0.08);
const muted = rgb(0.38, 0.4, 0.42);

export async function renderPdf(blocks: Block[], footer: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595, H = 842, M = 56;
  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;
  const ensure = (h: number) => { if (y - h < M + 20) { page = pdf.addPage([W, H]); y = H - M; } };
  const wrap = (text: string, font: PDFFont, size: number, width: number) => {
    const out: string[] = [];
    for (const para of clean(text).split("\n")) {
      let line = "";
      for (const word of para.split(" ")) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) > width && line) { out.push(line); line = word; } else line = next;
      }
      out.push(line);
    }
    return out;
  };
  const write = (text: string, font: PDFFont, size: number, color = ink, x = M, width = W - 2 * M, gap = 4) => {
    for (const l of wrap(text, font, size, width)) { ensure(size + gap); page.drawText(l, { x, y: y - size, size, font, color }); y -= size + gap; }
  };
  for (const b of blocks) {
    if (b.type === "title") {
      page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: emerald });
      write(b.text, bold, 24, ink, M, W - 2 * M, 8);
      if (b.sub) { y -= 2; write(b.sub, regular, 11, muted); }
      y -= 14;
    } else if (b.type === "h2") {
      y -= 10; ensure(30);
      write(b.text, bold, 14, emerald, M, W - 2 * M, 6);
      page.drawLine({ start: { x: M, y: y + 1 }, end: { x: W - M, y: y + 1 }, thickness: 0.6, color: rgb(0.88, 0.88, 0.86) });
      y -= 8;
    } else if (b.type === "p") {
      write(b.text, regular, 10.5, b.muted ? muted : ink); y -= 6;
    } else if (b.type === "note") {
      write(b.text, regular, 9, muted); y -= 6;
    } else if (b.type === "list") {
      b.items.forEach((item, i) => {
        const mark = b.checks ? (b.checks[i] ? "[x]" : "[  ]") : "•";
        ensure(16);
        page.drawText(mark, { x: M, y: y - 10.5, size: 10.5, font: bold, color: b.checks?.[i] ? emerald : ink });
        write(item, regular, 10.5, ink, M + 22, W - 2 * M - 22);
        y -= 4;
      });
      y -= 4;
    } else if (b.type === "kv") {
      const keyW = 200, gap = 14, valX = M + keyW + gap, valW = W - M - valX;
      for (const [k, v] of b.rows) {
        const keyLines = wrap(k, bold, 9, keyW);
        const valLines = wrap(v, regular, 10.5, valW);
        const h = Math.max(keyLines.length * 12, valLines.length * 14);
        ensure(h + 6);
        keyLines.forEach((l, i) => page.drawText(l, { x: M, y: y - 9 - i * 12, size: 9, font: bold, color: muted }));
        valLines.forEach((l, i) => page.drawText(l, { x: valX, y: y - 10.5 - i * 14, size: 10.5, font: regular, color: ink }));
        y -= h + 7;
      }
      y -= 4;
    }
  }
  const pages = pdf.getPages();
  pages.forEach((p, i) => p.drawText(clean(`${footer} · Page ${i + 1} of ${pages.length}`), { x: M, y: 30, size: 8, font: regular, color: muted }));
  return pdf.save();
}
