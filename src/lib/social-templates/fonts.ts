/**
 * Centralized font loader for the template renderer.
 *
 * Both the deck-builder render endpoint AND (eventually) the legacy
 * slide route should pull from here so we have a single place that
 * understands Google Fonts' content negotiation quirks (returns
 * WOFF for modern User-Agents which Satori can't decode, returns
 * TTF for unidentified UAs).
 *
 * Memoised per-process — same Vercel function instance serves many
 * render requests, no point re-downloading.
 */

const fontCache = new Map<string, Promise<ArrayBuffer>>();

/** Load a Google Font weight+style as TTF bytes. We rely on Node's
 *  default fetch UA being unidentified by Google's classifier to
 *  receive the TTF variant Satori can decode. */
export function loadGoogleFont(
  family: string,
  weight: number,
  italic = false
): Promise<ArrayBuffer> {
  const key = `${family}:${weight}:${italic ? "italic" : "normal"}`;
  const cached = fontCache.get(key);
  if (cached) return cached;
  const cssUrl = italic
    ? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
        family
      )}:ital,wght@1,${weight}`
    : `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
        family
      )}:wght@${weight}`;
  const promise = (async () => {
    const css = await fetch(cssUrl).then((r) => r.text());
    const match = css.match(
      /src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/
    );
    if (!match || !match[1]) {
      throw new Error(
        `[fonts] Could not extract TTF url for ${family} ${weight}${
          italic ? " italic" : ""
        }. Preview: ${css.slice(0, 200)}`
      );
    }
    const fontRes = await fetch(match[1]);
    if (!fontRes.ok) {
      throw new Error(
        `[fonts] fetch failed (${family} ${weight}): ${fontRes.status}`
      );
    }
    return fontRes.arrayBuffer();
  })();
  fontCache.set(key, promise);
  return promise;
}

/** Standard font set every template can rely on. Returns the array
 *  shape ImageResponse expects (with `name`, `data`, `weight`,
 *  `style` fields). Templates don't need to know which fonts they
 *  use; we always include the core four. */
export async function loadTemplateFonts(): Promise<
  Array<{
    name: string;
    data: ArrayBuffer;
    weight: 400 | 500 | 700;
    style: "normal" | "italic";
  }>
> {
  // Parallel load; Lora italic is optional (font sometimes 404s on
  // certain Google CDN edges — we degrade to Bowlby silently).
  const [bowlby, dmReg, dmMed, dmBold, caveat, loraItalic] =
    await Promise.allSettled([
      loadGoogleFont("Bowlby One SC", 400),
      loadGoogleFont("DM Sans", 400),
      loadGoogleFont("DM Sans", 500),
      loadGoogleFont("DM Sans", 700),
      loadGoogleFont("Caveat", 600),
      loadGoogleFont("Lora", 600, true),
    ]);

  const fonts: Array<{
    name: string;
    data: ArrayBuffer;
    weight: 400 | 500 | 700;
    style: "normal" | "italic";
  }> = [];

  if (bowlby.status === "fulfilled") {
    fonts.push({
      name: "Bowlby One SC",
      data: bowlby.value,
      weight: 400,
      style: "normal",
    });
  }
  if (dmReg.status === "fulfilled") {
    fonts.push({
      name: "DM Sans",
      data: dmReg.value,
      weight: 400,
      style: "normal",
    });
  }
  if (dmMed.status === "fulfilled") {
    fonts.push({
      name: "DM Sans",
      data: dmMed.value,
      weight: 500,
      style: "normal",
    });
  }
  if (dmBold.status === "fulfilled") {
    fonts.push({
      name: "DM Sans",
      data: dmBold.value,
      weight: 700,
      style: "normal",
    });
  }
  if (caveat.status === "fulfilled") {
    fonts.push({
      name: "Caveat",
      data: caveat.value,
      weight: 700,
      style: "normal",
    });
  }
  if (loraItalic.status === "fulfilled") {
    fonts.push({
      name: "Lora",
      data: loraItalic.value,
      weight: 700,
      style: "italic",
    });
  }

  return fonts;
}
