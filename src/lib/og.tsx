import { ImageResponse } from "next/og";

/**
 * Shared Open Graph card. Colours mirror the light-mode design tokens in
 * src/styles.css; ImageResponse has no CSS variables, so the literal values are
 * repeated here and must be kept in step with that file.
 */
const TOKEN = {
  background: "#ffffff",
  foreground: "#1d1d1f",
  grouped: "#f5f5f7",
  muted: "#6e6e73",
  primary: "#0071e3",
  primaryForeground: "#ffffff",
  border: "rgba(0, 0, 0, 0.08)",
};

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export interface OgCard {
  flag: string;
  /** e.g. "India" */
  title: string;
  /** e.g. "Countries you can visit with a US visa" */
  subtitle: string;
  total: number;
  of: number;
  added: number;
}

export function renderOgCard({ flag, title, subtitle, total, of, added }: OgCard) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: TOKEN.background,
          color: TOKEN.foreground,
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 40 }}>{flag}</div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, letterSpacing: "-0.01em" }}>{title}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 34, color: TOKEN.muted, maxWidth: 980, lineHeight: 1.25 }}>
            {subtitle}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
            <div style={{ display: "flex", fontSize: 168, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.03em" }}>
              {total}
            </div>
            <div style={{ display: "flex", fontSize: 30, color: TOKEN.muted, paddingBottom: 22 }}>
              {`easy access of ${of}`}
            </div>
          </div>
          {added > 0 && (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                background: TOKEN.primary,
                color: TOKEN.primaryForeground,
                fontSize: 30,
                fontWeight: 500,
                padding: "14px 28px",
                borderRadius: 999,
              }}
            >
              {`+${added} with your visas`}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${TOKEN.border}`,
            paddingTop: 28,
          }}
        >
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, letterSpacing: "-0.01em" }}>Laissez</div>
          <div style={{ display: "flex", fontSize: 24, color: TOKEN.muted }}>Visa free, eTA and visa on arrival</div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      // Satori ships no emoji glyphs, so flags are rendered from Twemoji.
      emoji: "twemoji",
    },
  );
}
