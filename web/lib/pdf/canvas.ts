import { BORDER, INK, M, MUTED, PAGE_H, PAGE_W, rgb, type RGB } from "./constants";

function ascii(value: unknown) {
  return String(value ?? "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[“”„]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/[^\x20-\x7E]/g, "");
}

function escapePdf(value: string) {
  return ascii(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function approxTextWidth(value: string, size: number) {
  return value.length * size * 0.52;
}

function wrapText(value: string, size: number, maxWidth: number) {
  const words = ascii(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (approxTextWidth(next, size) <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export class PdfCanvas {
  pages: string[][] = [];
  private current: string[] = [];
  private pageNo = 0;
  private readonly brand: RGB;

  constructor(brand: RGB) {
    this.brand = brand;
    this.addPage();
  }

  addPage() {
    if (this.current.length) this.pages.push(this.current);
    this.pageNo += 1;
    this.current = [];
    this.rect(0, 0, PAGE_W, 22, { fill: this.brand });
    this.text(M, 17, "Finance Platform", 8, { color: [1, 1, 1], bold: true });
    this.text(PAGE_W - M, PAGE_H - 22, `Pagina ${this.pageNo}`, 8, {
      color: MUTED,
      align: "right",
    });
  }

  finish() {
    if (this.current.length) this.pages.push(this.current);
    this.current = [];
  }

  text(
    x: number,
    y: number,
    value: unknown,
    size = 10,
    opts: { color?: RGB; bold?: boolean; align?: "left" | "right" | "center"; maxWidth?: number } = {},
  ) {
    const safe = escapePdf(String(value ?? ""));
    const width = approxTextWidth(safe, size);
    const dx =
      opts.align === "right" ? x - width : opts.align === "center" ? x - width / 2 : x;
    const font = opts.bold ? "F2" : "F1";
    this.current.push(
      `BT /${font} ${size} Tf ${rgb(opts.color ?? INK)} rg ${dx.toFixed(2)} ${(PAGE_H - y).toFixed(2)} Td (${safe}) Tj ET`,
    );
  }

  wrappedText(
    x: number,
    y: number,
    value: unknown,
    size: number,
    maxWidth: number,
    opts: { color?: RGB; bold?: boolean; lineHeight?: number } = {},
  ) {
    const lines = wrapText(ascii(value), size, maxWidth);
    lines.forEach((line, i) => {
      this.text(x, y + i * (opts.lineHeight ?? size + 4), line, size, opts);
    });
    return y + lines.length * (opts.lineHeight ?? size + 4);
  }

  rect(
    x: number,
    y: number,
    w: number,
    h: number,
    opts: { fill?: RGB; stroke?: RGB; lineWidth?: number } = {},
  ) {
    const py = PAGE_H - y - h;
    if (opts.fill) this.current.push(`q ${rgb(opts.fill)} rg ${x} ${py} ${w} ${h} re f Q`);
    if (opts.stroke) {
      this.current.push(
        `q ${rgb(opts.stroke)} RG ${(opts.lineWidth ?? 1).toFixed(2)} w ${x} ${py} ${w} ${h} re S Q`,
      );
    }
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB = BORDER, width = 1) {
    this.current.push(
      `q ${rgb(color)} RG ${width.toFixed(2)} w ${x1.toFixed(2)} ${(PAGE_H - y1).toFixed(2)} m ${x2.toFixed(2)} ${(PAGE_H - y2).toFixed(2)} l S Q`,
    );
  }

  path(points: Array<[number, number]>, color: RGB, width = 1.6) {
    if (points.length < 2) return;
    const [first, ...rest] = points;
    if (!first) return;
    const ops = [
      `${first[0].toFixed(2)} ${(PAGE_H - first[1]).toFixed(2)} m`,
      ...rest.map((p) => `${p[0].toFixed(2)} ${(PAGE_H - p[1]).toFixed(2)} l`),
    ].join(" ");
    this.current.push(`q ${rgb(color)} RG ${width.toFixed(2)} w ${ops} S Q`);
  }
}

export function serializePdf(pages: string[][]) {
  const pageKids = pages.map((_, i) => `${5 + i * 2} 0 R`).join(" ");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageKids}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  pages.forEach((ops, i) => {
    const pageId = 5 + i * 2;
    const contentId = pageId + 1;
    const stream = ops.join("\n");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  });

  let out = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(out));
    out += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    out += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(out, "utf8");
}
