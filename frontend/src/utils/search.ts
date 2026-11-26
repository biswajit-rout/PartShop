/**
 * Automotive domain synonym dictionary.
 * Maps common queries to alternative stems and abbreviations found in part catalogs.
 */
export const AUTOMOTIVE_SYNONYMS: Record<string, string[]> = {
  filter: ["filter", "filt"],
  filters: ["filter", "filt"],
  filt: ["filter", "filt"],
  brake: ["brake", "brk", "pad", "shoe"],
  brakes: ["brake", "brk", "pad", "shoe"],
  brk: ["brake", "brk", "pad", "shoe"],
  pad: ["pad", "brake", "brk"],
  pads: ["pad", "pads", "brake", "brk"],
  shoe: ["shoe", "shoes", "brake", "brk"],
  shoes: ["shoe", "shoes", "brake", "brk"],
  clutch: ["clutch", "clt"],
  clt: ["clutch", "clt"],
  shock: ["shock", "cushion", "cush", "absorber", "damper"],
  cushion: ["cushion", "cush", "shock", "absorber", "damper"],
  cush: ["cushion", "cush", "shock"],
  absorber: ["absorber", "shock", "cushion", "damper"],
  damper: ["damper", "shock", "cushion"],
  bearing: ["bearing", "brg"],
  brg: ["bearing", "brg"],
  cable: ["cable", "cbl"],
  cbl: ["cable", "cbl"],
  chain: ["chain", "chn"],
  chn: ["chain", "chn"],
  spark: ["spark", "spk", "plug"],
  plug: ["plug", "spark", "spk"],
  spk: ["spark", "spk", "plug"],
  gasket: ["gasket", "gskt"],
  gskt: ["gasket", "gskt"],
  switch: ["switch", "sw"],
  sw: ["switch", "sw"],
  cylinder: ["cylinder", "cyl"],
  cyl: ["cylinder", "cyl"],
  element: ["element", "elem", "elt"],
  elem: ["element", "elem", "elt"],
  elt: ["element", "elem", "elt"],
  assembly: ["assembly", "assy", "asy"],
  assy: ["assembly", "assy", "asy"],
  lever: ["lever", "lvr"],
  lvr: ["lever", "lvr"],
  indicator: ["indicator", "ind", "winker"],
  ind: ["indicator", "ind", "winker"],
  winker: ["winker", "indicator", "ind"],
  headlight: ["headlight", "headlamp", "hl"],
  headlamp: ["headlight", "headlamp", "hl"],
  mirror: ["mirror", "mrr", "rearview"],
  mrr: ["mirror", "mrr", "rearview"],
  oil: ["oil", "lubricant", "lub"],
};

/**
 * Checks whether a given target text contains matches for all tokens in a query.
 * Each token can match directly or via its automotive synonyms.
 *
 * @param targetText The concatenated fields to search (e.g. name, brand, bike models, part number)
 * @param query The user's input search query (e.g. "Bajaj pulsar Air filter")
 * @returns boolean
 */
export function matchSearchTokens(targetText: string, query: string): boolean {
  if (!query || !query.trim()) return true;
  if (!targetText) return false;

  const normalizedTarget = targetText.toLowerCase();
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  // Every token must match at least one of its synonym variants
  return tokens.every((token) => {
    // 1. Direct substring match
    if (normalizedTarget.includes(token)) return true;

    // 2. Automotive synonym / stem expansion match
    const synonyms = AUTOMOTIVE_SYNONYMS[token];
    if (synonyms && synonyms.length > 0) {
      return synonyms.some((syn) => normalizedTarget.includes(syn));
    }

    return false;
  });
}

/**
 * Robust matching for barcodes and 2D QR codes on spare parts packaging.
 * Handles:
 * 1. Direct exact matches (barcode, partNumber, id).
 * 2. Normalized alphanumeric matches (ignoring dashes, slashes, spaces like "01721-K0L-D00" vs "01721K0LD00").
 * 3. Delimited multi-attribute QR code strings (e.g. pipe, semicolon, newline, colon, comma).
 * 4. URLs containing part numbers or barcodes in query parameters or path segments.
 */
export function matchScannedCode(
  part: { id: string | number; barcode?: string | null; partNumber: string; name?: string },
  scannedCode: string
): boolean {
  if (!scannedCode || !scannedCode.trim()) return false;
  const raw = scannedCode.trim();
  const rawLower = raw.toLowerCase();

  const partId = String(part.id).toLowerCase();
  const barcode = (part.barcode || "").toLowerCase();
  const partNumber = (part.partNumber || "").toLowerCase();

  // 1. Direct exact match
  if (barcode && barcode === rawLower) return true;
  if (partNumber && partNumber === rawLower) return true;
  if (partId === rawLower) return true;

  // Helper: strip punctuation and whitespace to alphanumeric only
  const clean = (s: string) => s.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const cleanRaw = clean(raw);
  const cleanBarcode = clean(barcode);
  const cleanPartNum = clean(partNumber);

  // 2. Normalized alphanumeric match (e.g. "01721-K0L-D00" matches "01721K0LD00")
  if (cleanBarcode && cleanBarcode === cleanRaw) return true;
  if (cleanPartNum && cleanPartNum === cleanRaw) return true;

  // 3. Substring check: if part number or barcode is contained in a complex QR code payload
  if (cleanBarcode && cleanBarcode.length >= 6 && cleanRaw.includes(cleanBarcode)) return true;
  if (cleanPartNum && cleanPartNum.length >= 5 && cleanRaw.includes(cleanPartNum)) return true;

  // 4. Token/delimiters check (for structured QR codes like "P/N:01721K0LD00;QTY:1" or "890123|01721")
  const tokens = raw.split(/[\s,;|:\n\r\t/\\?&=]+/).map((t) => clean(t)).filter((t) => t.length >= 4);
  for (const t of tokens) {
    if (cleanBarcode && t === cleanBarcode) return true;
    if (cleanPartNum && t === cleanPartNum) return true;
  }

  return false;
}

