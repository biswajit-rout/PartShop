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
