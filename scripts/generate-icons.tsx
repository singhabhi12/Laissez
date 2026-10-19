/**
 * Generates every app icon from one geometric definition of the Laissez "L"
 * monogram. The full wordmark is illegible at favicon sizes, so icons use its
 * initial, drawn as shapes rather than type so no font is involved.
 *
 * Outputs are committed; run `npm run icons:build` after changing the design.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

const ROOT = path.resolve(import.meta.dirname, "..");

/** Mirrors --primary (light) in src/styles.css; white on it is 4.90:1. */
const BLUE = "#006de2";
const WHITE = "#ffffff";

/** The monogram on a 100-unit grid: a vertical and a horizontal bar. */
const L = { x: 34, y: 24, stem: 14, height: 52, foot: 34 };

type Variant = { rounded: boolean };

/** SVG favicon: scales to any size and stays sharp on high-density screens. */
function svg({ rounded }: Variant): string {
  const r = rounded ? 22 : 0;
  const { x, y, stem, height, foot } = L;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">`,
    `<rect width="100" height="100" rx="${r}" fill="${BLUE}"/>`,
    `<path d="M${x} ${y}h${stem}v${height - stem}h${foot - stem}v${stem}H${x}z" fill="${WHITE}"/>`,
    `</svg>`,
  ].join("");
}

async function png(size: number, { rounded }: Variant): Promise<Buffer> {
  const u = size / 100;
  const { x, y, stem, height, foot } = L;
  const response = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: BLUE,
          borderRadius: rounded ? 22 * u : 0,
        }}
      >
        <div style={{ position: "absolute", left: x * u, top: y * u, width: stem * u, height: height * u, background: WHITE }} />
        <div
          style={{
            position: "absolute",
            left: x * u,
            top: (y + height - stem) * u,
            width: foot * u,
            height: stem * u,
            background: WHITE,
          }}
        />
      </div>
    ),
    { width: size, height: size },
  );
  return Buffer.from(await response.arrayBuffer());
}

/** A .ico holding PNG-encoded images, which every browser since IE Vista reads. */
function ico(images: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
    e.writeUInt8(size >= 256 ? 0 : size, 1); // height
    e.writeUInt8(0, 2); // palette size
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

async function main() {
  const out = (rel: string, data: Buffer | string) => {
    const file = path.join(ROOT, rel);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, data);
    console.log(`  ${rel.padEnd(36)} ${Buffer.byteLength(data)} bytes`);
  };

  console.log("Generating icons");
  // Browser tab: SVG first, .ico for everything that asks for /favicon.ico.
  out("app/icon.svg", svg({ rounded: true }));
  out(
    "app/favicon.ico",
    ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(size, { rounded: true }) })))),
  );
  // iOS rounds the corners itself, so the tile is full-bleed.
  out("app/apple-icon.png", await png(180, { rounded: false }));
  // Web manifest. "maskable" is full-bleed; the L sits well inside the 80% safe zone.
  out("public/icons/icon-192.png", await png(192, { rounded: true }));
  out("public/icons/icon-512.png", await png(512, { rounded: true }));
  out("public/icons/icon-maskable-512.png", await png(512, { rounded: false }));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
