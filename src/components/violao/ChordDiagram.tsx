import { memo } from "react";
import type { Voicing } from "@/lib/chords";
import { cn } from "@/lib/utils";

const ROWS = 5;

/** SVG chord chart: strings vertical (6th/low E at left), frets horizontal. */
export const ChordDiagram = memo(function ChordDiagram({
  voicing,
  size = "md",
  showName = true,
  className,
}: {
  voicing: Voicing;
  size?: "sm" | "md" | "lg" | "fluid";
  showName?: boolean;
  className?: string;
}) {
  const width = size === "sm" ? 76 : size === "md" ? 104 : size === "fluid" ? "100%" : 200;
  const { frets, fingers, baseFret, barre } = voicing;
  const left = 18, top = 22, gap = 14, fretH = 17;
  const w = gap * 5, h = fretH * ROWS;
  const sx = (i: number) => left + i * gap;
  const fy = (f: number) => top + (f - baseFret) * fretH + fretH / 2;

  return (
    <figure className={cn("flex flex-col items-center", className)} style={{ width }}>
      {showName && (
        <figcaption className={cn("font-semibold leading-tight", size === "lg" || size === "fluid" ? "text-lg" : "text-sm")}>
          {voicing.name}
        </figcaption>
      )}
      <svg
        viewBox={`0 0 ${left + w + 12} ${top + h + 6}`}
        width="100%"
        role="img"
        aria-label={`Acorde ${voicing.name}: ${frets.map((f) => (f == null ? "x" : f)).join(" ")}`}
        className="text-foreground"
      >
        {/* nut or start fret */}
        {baseFret === 1 ? (
          <rect x={left} y={top - 3} width={w} height={3} className="fill-current" />
        ) : (
          <text x={left - 5} y={top + fretH / 2 + 3} textAnchor="end" fontSize="8" className="fill-muted-foreground">
            {baseFret}ª
          </text>
        )}
        {Array.from({ length: ROWS + 1 }).map((_, r) => (
          <line key={r} x1={left} x2={left + w} y1={top + r * fretH} y2={top + r * fretH} className="stroke-muted-foreground/60" strokeWidth={0.8} />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <line key={i} x1={sx(i)} x2={sx(i)} y1={top} y2={top + h} className="stroke-muted-foreground" strokeWidth={0.6 + (5 - i) * 0.12} />
        ))}
        {/* open / muted markers */}
        {frets.map((f, i) =>
          f == null ? (
            <g key={i} className="stroke-muted-foreground" strokeWidth={1.1}>
              <line x1={sx(i) - 3} x2={sx(i) + 3} y1={top - 12} y2={top - 6} />
              <line x1={sx(i) + 3} x2={sx(i) - 3} y1={top - 12} y2={top - 6} />
            </g>
          ) : f === 0 ? (
            <circle key={i} cx={sx(i)} cy={top - 9} r={3} fill="none" className="stroke-foreground" strokeWidth={1.1} />
          ) : null,
        )}
        {barre && barre.fret >= baseFret && (
          <rect
            x={sx(barre.from) - 5.5}
            y={fy(barre.fret) - 5.5}
            width={sx(barre.to) - sx(barre.from) + 11}
            height={11}
            rx={5.5}
            className="fill-primary"
          />
        )}
        {frets.map((f, i) =>
          f != null && f > 0 ? (
            <g key={i}>
              {!(barre && barre.fret === f && fingers[i] === 1) && (
                <circle cx={sx(i)} cy={fy(f)} r={5.5} className="fill-primary" />
              )}
              {fingers[i] && (
                <text x={sx(i)} y={fy(f) + 2.8} textAnchor="middle" fontSize="7.5" fontWeight="700" className="fill-primary-foreground">
                  {fingers[i]}
                </text>
              )}
            </g>
          ) : null,
        )}
      </svg>
    </figure>
  );
});
