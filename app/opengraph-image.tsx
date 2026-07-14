import { ImageResponse } from "next/og";

// Image metadata
export const alt = "Little Lists — remember what you love and what they love";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// Warm scrapbook palette, sampled from app/globals.css OKLCH tokens
// (converted to hex for Satori, which doesn't parse oklch()).
const CREAM = "#FFF8EF"; // --color-cream
const INK = "#2F2722"; // --color-ink
const INK_SOFT = "#50453F"; // --color-ink-soft
const BLUSH = "#F1C4C4"; // --color-blush
const SAGE = "#BCD6BC"; // --color-sage
const SKY = "#BBD4EE"; // --color-sky

// Fraunces is loaded from Google Fonts at build time (this route has no
// dynamic params, so it's statically generated once). If the fetch ever
// fails — offline build, blocked network — we fall back to the documented
// Georgia serif stack instead of failing the build.
async function loadFraunces(weight: number): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,${weight}&display=swap`;
    const css = await (await fetch(cssUrl)).text();
    const match = css.match(/src: url\(([^)]+)\) format\('(?:opentype|truetype)'\)/);
    if (!match) return null;
    const fontRes = await fetch(match[1]);
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch {
    return null;
  }
}

// A rotated pastel rounded-rect for the cover-stack motif. Plain divs only —
// no images, no icons.
function StackCard({
  color,
  rotate,
  top,
  left,
}: {
  color: string;
  rotate: number;
  top: number;
  left: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        width: 260,
        height: 340,
        borderRadius: 36,
        background: color,
        transform: `rotate(${rotate}deg)`,
        boxShadow: "0 24px 48px rgba(47, 39, 34, 0.16)",
        border: `1px solid rgba(47, 39, 34, 0.06)`,
      }}
    />
  );
}

export default async function Image() {
  const frauncesData = await loadFraunces(600);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: CREAM,
          padding: "0 80px",
        }}
      >
        {/* Left: wordmark + tagline */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingRight: 48,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 104,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: INK,
              fontFamily: frauncesData ? "Fraunces" : "Georgia, serif",
            }}
          >
            Little Lists
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 32,
              fontSize: 32,
              lineHeight: 1.45,
              color: INK_SOFT,
              maxWidth: 480,
            }}
          >
            remember what you love and what they love
          </div>
        </div>

        {/* Right: rotated 3-card cover-stack motif */}
        <div
          style={{
            width: 460,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <StackCard color={SKY} rotate={-11} top={70} left={30} />
          <StackCard color={SAGE} rotate={6} top={90} left={90} />
          <StackCard color={BLUSH} rotate={-3} top={110} left={150} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: frauncesData
        ? [
            {
              name: "Fraunces",
              data: frauncesData,
              weight: 600,
              style: "normal",
            },
          ]
        : undefined,
    }
  );
}
