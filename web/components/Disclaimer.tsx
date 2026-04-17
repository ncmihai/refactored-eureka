"use client";

import { useEffect, useState } from "react";

import {
  fetchDisclaimere,
  type Disclaimer as DisclaimerDoc,
} from "@/lib/cms";

type Modul = DisclaimerDoc["modul"];

type Props = {
  modul: Modul;
  limba?: "ro" | "en";
};

type LexicalNode = {
  type?: string;
  tag?: string;
  text?: string;
  format?: number | string;
  children?: LexicalNode[];
};

function renderNode(node: LexicalNode, key: number | string): React.ReactNode {
  if (!node) return null;

  if (node.type === "text") {
    const text = node.text ?? "";
    const bold = typeof node.format === "number" && (node.format & 1) === 1;
    const italic = typeof node.format === "number" && (node.format & 2) === 2;
    let el: React.ReactNode = text;
    if (italic) el = <em key={`i-${key}`}>{el}</em>;
    if (bold) el = <strong key={`b-${key}`}>{el}</strong>;
    return <span key={key}>{el}</span>;
  }

  const children = node.children?.map((c, i) => renderNode(c, `${key}-${i}`));

  switch (node.type) {
    case "heading": {
      const Tag = (node.tag as keyof React.JSX.IntrinsicElements) ?? "h3";
      return (
        <Tag key={key} className="font-serif text-lg mt-3 mb-1">
          {children}
        </Tag>
      );
    }
    case "list": {
      const Tag = node.tag === "ol" ? "ol" : "ul";
      return (
        <Tag
          key={key}
          className={`${Tag === "ol" ? "list-decimal" : "list-disc"} pl-5 space-y-1`}
        >
          {children}
        </Tag>
      );
    }
    case "listitem":
      return <li key={key}>{children}</li>;
    case "paragraph":
      return (
        <p key={key} className="leading-relaxed">
          {children}
        </p>
      );
    case "link":
      return <span key={key}>{children}</span>;
    default:
      return <span key={key}>{children}</span>;
  }
}

function renderLexical(content: unknown): React.ReactNode {
  if (!content || typeof content !== "object") return null;
  const root = (content as { root?: LexicalNode }).root;
  if (!root) return null;
  return root.children?.map((c, i) => renderNode(c, i));
}

export function Disclaimer({ modul, limba = "ro" }: Props) {
  const [doc, setDoc] = useState<DisclaimerDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchDisclaimere().then((docs) => {
      if (cancelled) return;
      const match =
        docs
          .filter((d) => d.modul === modul && d.limba === limba && d.activ)
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() -
              new Date(a.updatedAt).getTime(),
          )[0] ?? null;
      setDoc(match);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [modul, limba]);

  if (loading || !doc) return null;

  return (
    <aside
      className="card p-5 text-xs leading-relaxed text-[var(--muted)] space-y-2"
      aria-label="Disclaimer"
    >
      <div className="flex items-center justify-between">
        <span className="uppercase tracking-[0.14em] text-[var(--muted-2)]">
          Disclaimer
        </span>
        <span className="text-[10px] text-[var(--muted-2)]">
          {doc.versiune}
        </span>
      </div>
      <div className="space-y-2 [&_p]:leading-relaxed [&_strong]:text-[var(--foreground)]">
        {renderLexical(doc.continut)}
      </div>
    </aside>
  );
}
