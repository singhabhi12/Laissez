"use client";

import { memo, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { statusFill, statusLabel } from "@/lib/status";
import type { DestinationResult } from "@/lib/unlock";
import type { IsoNumericFile } from "@/lib/data/types";

/**
 * world-110m, vendored into public/ rather than loaded from a CDN: it was the
 * largest-contentful-paint element on /results, and a third-party round trip
 * (DNS + TLS + download) was sitting in front of it.
 * Source: world-atlas@2 (Natural Earth, public domain).
 */
const GEO_URL = "/world-110m.json";

interface Props {
  byIso: Map<string, DestinationResult>;
  passport: string;
  isoNumeric: IsoNumericFile;
  names: Record<string, string>;
  onSelect: (iso3: string) => void;
}

function WorldMapInner({ byIso, passport, isoNumeric, names, onSelect }: Props) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);

  // A few world-110m features carry no id (Kosovo among them), so fall back to
  // matching on the feature name.
  const toIso3 = (geo: { id?: string | number; properties?: { name?: string } }): string | undefined => {
    if (geo.id !== undefined && geo.id !== null) {
      const hit = isoNumeric.byNumeric[String(Number(geo.id))];
      if (hit) return hit;
    }
    const name = geo.properties?.name;
    return name ? isoNumeric.byName[name] : undefined;
  };

  return (
    <div className="relative" onMouseLeave={() => setTip(null)}>
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 160 }}
        width={800}
        height={400}
        className="h-auto w-full"
        role="img"
        aria-label="World map coloured by entry requirement. Use the list view for a full text alternative."
      >
        <ZoomableGroup center={[10, 10]} zoom={1} minZoom={1} maxZoom={6}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const iso3 = toIso3(geo);
                const r = iso3 ? byIso.get(iso3) : undefined;
                const isHome = iso3 === passport;
                const unlocked = !!r?.unlocked;
                const fill = isHome
                  ? "var(--foreground)"
                  : r
                    ? unlocked
                      ? "var(--accent)"
                      : statusFill[r.withDocs]
                    : "var(--status-nodata)";
                const name = (iso3 && names[iso3]) ?? (geo.properties?.name as string) ?? "";
                const label = iso3
                  ? isHome
                    ? `${name}: your passport`
                    : r
                      ? `${name}: ${statusLabel[r.withDocs]}${unlocked ? " (unlocked)" : ""}`
                      : name
                  : name;
                const interactive = !!r || isHome;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    // aria-label is only valid on a path with a role, and
                    // non-interactive countries are decorative here: the list
                    // view is the text alternative for the whole map.
                    {...(interactive
                      ? { role: "button", tabIndex: 0, "aria-label": label }
                      : { tabIndex: -1, "aria-hidden": true })}
                    onMouseMove={(e) => {
                      const rect = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement).getBoundingClientRect();
                      setTip({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        text: iso3 ? label : `${label}: no data yet`,
                      });
                    }}
                    onMouseLeave={() => setTip(null)}
                    onClick={() => interactive && iso3 && onSelect(iso3)}
                    onKeyDown={(e) => {
                      if (interactive && iso3 && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        onSelect(iso3);
                      }
                    }}
                    style={{
                      default: { fill, stroke: unlocked ? "var(--accent)" : "var(--background)", strokeWidth: unlocked ? 1 : 0.4, outline: "none", transition: "fill 400ms ease" },
                      hover: { fill, opacity: interactive ? 0.8 : 1, stroke: "var(--foreground)", strokeWidth: 0.6, outline: "none", cursor: interactive ? "pointer" : "default" },
                      pressed: { fill, outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
      {tip && (
        <div
          className="glass pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-border px-3 py-1.5 text-caption shadow-float"
          style={{ left: tip.x, top: tip.y - 12 }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}

export default memo(WorldMapInner);
