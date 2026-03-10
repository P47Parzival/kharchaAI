"use client";

import { BOMData } from "@/lib/api";

interface BOMTableProps {
  bom: BOMData;
}

function confidenceBadge(confidence: string) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    high: { bg: "rgba(16,185,129,0.15)", text: "#10b981", border: "rgba(16,185,129,0.3)" },
    medium: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b", border: "rgba(245,158,11,0.3)" },
    low: { bg: "rgba(239,68,68,0.15)", text: "#ef4444", border: "rgba(239,68,68,0.3)" },
    no_data: { bg: "rgba(96,96,120,0.15)", text: "#606078", border: "rgba(96,96,120,0.3)" },
  };
  const c = colors[confidence] || colors.no_data;
  return (
    <span style={{ display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 500, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {confidence === "no_data" ? "No data" : confidence}
    </span>
  );
}

function formatPrice(val: number | null | undefined, currency: string = "USD") {
  if (val == null) return "—";
  return `${currency === "INR" ? "₹" : "$"}${val.toFixed(2)}`;
}

export default function BOMTable({ bom }: BOMTableProps) {
  const thStyle: React.CSSProperties = { padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", background: "var(--bg-input)" };
  const tdStyle: React.CSSProperties = { padding: "0.75rem 1rem", borderBottom: "1px solid var(--border-subtle)", fontSize: "0.85rem" };

  return (
    <div className="animate-slide-up" style={{ margin: "1rem 0", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "16px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>📋 Bill of Materials</h3>
          {bom.project_summary && <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{bom.project_summary}</p>}
        </div>
        {bom.total_estimate && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Estimated Total</div>
            <div className="gradient-text" style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              {formatPrice(bom.total_estimate.min)} – {formatPrice(bom.total_estimate.max)}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Component</th>
              <th style={thStyle}>Qty</th>
              <th style={thStyle}>Unit Price</th>
              <th style={thStyle}>Subtotal</th>
              <th style={thStyle}>Confidence</th>
              <th style={thStyle}>Sources</th>
            </tr>
          </thead>
          <tbody>
            {bom.components.map((comp, i) => (
              <tr key={i}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{comp.name}</div>
                  {comp.specs && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>{comp.specs}</div>}
                </td>
                <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>{comp.quantity}</td>
                <td style={tdStyle}>
                  {comp.pricing?.min != null ? (
                    <span style={{ color: "var(--text-primary)" }}>{formatPrice(comp.pricing.min, comp.pricing.currency)} – {formatPrice(comp.pricing.max, comp.pricing.currency)}</span>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>Pending</span>
                  )}
                </td>
                <td style={{ ...tdStyle, fontWeight: 500, color: "var(--text-primary)" }}>
                  {comp.total_min != null ? `${formatPrice(comp.total_min)} – ${formatPrice(comp.total_max)}` : "—"}
                </td>
                <td style={tdStyle}>{comp.pricing ? confidenceBadge(comp.pricing.confidence) : confidenceBadge("no_data")}</td>
                <td style={tdStyle}>
                  {comp.pricing?.sources?.length ? (
                    <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                      {comp.pricing.sources.map((src, j) => (
                        <a key={j} href={src.source_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "0.2rem 0.5rem", borderRadius: "6px", fontSize: "0.7rem", background: "var(--bg-input)", color: "var(--accent-secondary)", border: "1px solid var(--border-subtle)", textDecoration: "none" }}>
                          {src.source_site}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bom.additional_notes && (
        <div style={{ padding: "0.75rem 1.5rem", borderTop: "1px solid var(--border-subtle)", fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
          💡 {bom.additional_notes}
        </div>
      )}
    </div>
  );
}
