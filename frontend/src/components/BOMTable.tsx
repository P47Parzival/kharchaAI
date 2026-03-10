"use client";

import { BOMData } from "@/lib/api";

interface BOMTableProps {
  bom: BOMData;
}

function confidenceBadge(confidence: string) {
  const styles: Record<string, string> = {
    high: "bg-[rgba(16,185,129,0.15)] text-[#10b981] border-[rgba(16,185,129,0.3)]",
    medium:
      "bg-[rgba(245,158,11,0.15)] text-[#f59e0b] border-[rgba(245,158,11,0.3)]",
    low: "bg-[rgba(239,68,68,0.15)] text-[#ef4444] border-[rgba(239,68,68,0.3)]",
    no_data:
      "bg-[rgba(96,96,120,0.15)] text-[#606078] border-[rgba(96,96,120,0.3)]",
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border ${
        styles[confidence] || styles.no_data
      }`}
    >
      {confidence === "no_data" ? "No data" : confidence}
    </span>
  );
}

function formatPrice(val: number | null | undefined, currency: string = "USD") {
  if (val == null) return "—";
  const symbol = currency === "INR" ? "₹" : "$";
  return `${symbol}${val.toFixed(2)}`;
}

export default function BOMTable({ bom }: BOMTableProps) {
  return (
    <div className="my-4 glass-card overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="px-5 py-4 border-b border-(--border-subtle) flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-(--text-primary)">
            📋 Bill of Materials
          </h3>
          {bom.project_summary && (
            <p className="text-xs text-(--text-muted) mt-1">
              {bom.project_summary}
            </p>
          )}
        </div>
        {bom.total_estimate && (
          <div className="text-right">
            <div className="text-xs text-(--text-muted)">
              Estimated Total
            </div>
            <div className="text-lg font-bold gradient-text">
              {formatPrice(bom.total_estimate.min)} –{" "}
              {formatPrice(bom.total_estimate.max)}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-(--text-muted) tracking-wider">
              <th className="px-5 py-3 bg-(--bg-input)">Component</th>
              <th className="px-3 py-3 bg-(--bg-input)">Qty</th>
              <th className="px-3 py-3 bg-(--bg-input)">Unit Price</th>
              <th className="px-3 py-3 bg-(--bg-input)">Subtotal</th>
              <th className="px-3 py-3 bg-(--bg-input)">Confidence</th>
              <th className="px-3 py-3 bg-(--bg-input)">Sources</th>
            </tr>
          </thead>
          <tbody>
            {bom.components.map((comp, i) => (
              <tr
                key={i}
                className="border-b border-(--border-subtle) hover:bg-(--bg-card-hover) transition-colors"
              >
                <td className="px-5 py-3">
                  <div className="font-medium text-(--text-primary)">
                    {comp.name}
                  </div>
                  {comp.specs && (
                    <div className="text-xs text-(--text-muted) mt-0.5">
                      {comp.specs}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3 text-(--text-secondary)">
                  {comp.quantity}
                </td>
                <td className="px-3 py-3">
                  {comp.pricing?.min != null ? (
                    <span className="text-(--text-primary)">
                      {formatPrice(comp.pricing.min, comp.pricing.currency)} –{" "}
                      {formatPrice(comp.pricing.max, comp.pricing.currency)}
                    </span>
                  ) : (
                    <span className="text-(--text-muted)">Pending</span>
                  )}
                </td>
                <td className="px-3 py-3 text-(--text-primary) font-medium">
                  {comp.total_min != null
                    ? `${formatPrice(comp.total_min)} – ${formatPrice(comp.total_max)}`
                    : "—"}
                </td>
                <td className="px-3 py-3">
                  {comp.pricing
                    ? confidenceBadge(comp.pricing.confidence)
                    : confidenceBadge("no_data")}
                </td>
                <td className="px-3 py-3">
                  {comp.pricing?.sources?.length ? (
                    <div className="flex gap-1 flex-wrap">
                      {comp.pricing.sources.map((src, j) => (
                        <a
                          key={j}
                          href={src.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-2 py-0.5 rounded-md text-xs bg-(--bg-input) text-(--accent-secondary) hover:bg-[rgba(108,92,231,0.15)] transition-colors border border-(--border-subtle)"
                        >
                          {src.source_site}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-(--text-muted)">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer notes */}
      {bom.additional_notes && (
        <div className="px-5 py-3 border-t border-(--border-subtle) text-xs text-(--text-muted)">
          💡 {bom.additional_notes}
        </div>
      )}
    </div>
  );
}
