import { ImageResponse } from "next/og";
import {
  MB_OG_CREST_SVG,
  MB_OG_INK,
  fetchSummaryMeta,
  summaryCardLines,
} from "./summaryMeta";

/* The 1200x630 share card, drawn server-side by `next/og` from the same
   `fetchSummaryMeta` the metadata uses, so picture and description cannot
   name two different champions.

   Satori limits: `next/og` bundles one REGULAR-weight font only (a bold
   `fontWeight` renders as 400, and `next/font`'s .woff2 files cannot be fed
   to it — dropping an `Oswald-Bold.ttf` into public assets and passing it in
   `fonts` is the whole fix). The design therefore leans on scale, case,
   tracking and rules rather than weight. No CSS custom properties either:
   Satori has no cascade, so the palette is the literal `MB_OG_INK` map, which
   `summaryMeta.test.ts` locks against the `--mb-*` tokens. */

export const runtime = "nodejs";
export const alt = "Match report — Tournament Tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const crest = `data:image/svg+xml;base64,${Buffer.from(MB_OG_CREST_SVG).toString("base64")}`;

/** display/kicker, scaled for a card read at ~500px wide. */
const kicker = (color: string) => ({
  fontSize: 22,
  letterSpacing: "0.18em", // --mb-track-code (Satori takes no CSS custom properties)
  textTransform: "uppercase" as const,
  color,
});

const OgImage = async ({ params }: { params: Promise<{ shareCode: string }> }) => {
  const { shareCode } = await params;
  const meta = await fetchSummaryMeta(shareCode);
  const lines = meta ? summaryCardLines(meta) : null;

  /* The fallback says the true general thing rather than a false specific one,
     and says it in the card's own three slots so the geometry never changes:
     an unread report and a read one are the same picture with different words. */
  const eventLine = meta?.name ?? "A finished event";
  const result = lines ?? { kicker: "Full time", headline: "The complete record" };
  const facts = meta
    ? [
        `${meta.teamCount} ${meta.teamCount === 1 ? "team" : "teams"}`,
        `${meta.matchCount} ${meta.matchCount === 1 ? "match" : "matches"}`,
        meta.formatLabel,
        ...(meta.endedShort ? [meta.endedShort] : []),
      ]
    : ["Final table", "Every result", "The closest match"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: MB_OG_INK.paper,
          color: MB_OG_INK.navy,
          fontFamily: "sans-serif",
        }}
      >
        {/* The navy/coral spine, full height. */}
        <div style={{ display: "flex", width: 28, height: "100%" }}>
          <div style={{ width: 18, height: "100%", background: MB_OG_INK.navy }} />
          <div style={{ width: 10, height: "100%", background: MB_OG_INK.coral }} />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "56px 64px 48px 56px",
          }}
        >
          {/* ------------------------------------------------------- head */}
          <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
            <div style={{ ...kicker(MB_OG_INK.inkMuted), flex: 1 }}>
              Match Report
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={crest} width={58} height={68} alt="" />
          </div>

          <div
            style={{
              width: "100%",
              height: 3,
              background: MB_OG_INK.navy,
              marginTop: 18,
            }}
          />

          {/* --------------------------------------------------- the event */}
          <div
            style={{
              display: "flex",
              fontSize: eventLine.length > 26 ? 58 : 72,
              lineHeight: 1.05,
              marginTop: 26,
              maxHeight: 160,
              overflow: "hidden",
            }}
          >
            {eventLine}
          </div>

          {/* ------------------------------------------------- the result */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: "auto",
            }}
          >
            <div style={kicker(MB_OG_INK.coralDeep)}>{result.kicker}</div>
            <div
              style={{
                display: "flex",
                fontSize: result.headline.length > 28 ? 46 : 56,
                lineHeight: 1.1,
                marginTop: 12,
                maxHeight: 128,
                overflow: "hidden",
              }}
            >
              {result.headline}
            </div>
            <div
              style={{ width: 132, height: 8, background: MB_OG_INK.coral, marginTop: 18 }}
            />
          </div>

          {/* -------------------------------------------------- the record */}
          <div
            style={{
              width: "100%",
              height: 1,
              background: MB_OG_INK.rule,
              marginTop: 40,
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 22,
              width: "100%",
            }}
          >
            <div
              style={{
                ...kicker(MB_OG_INK.navy),
                flex: 1,
                fontSize: 20,
                letterSpacing: "0.12em", // --mb-track-head (Satori takes no CSS custom properties)
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              {facts.join("  ·  ")}
            </div>
            <div
              style={{
                ...kicker(MB_OG_INK.inkMuted),
                fontSize: 20,
                letterSpacing: "0.12em", // --mb-track-head (Satori takes no CSS custom properties)
                whiteSpace: "nowrap",
                marginLeft: 28,
              }}
            >
              Tournament Tracker
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
};

export default OgImage;
