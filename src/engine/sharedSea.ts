// The shared sea: everyone who visits sees the krathongs other visitors floated, without knowing whose they are.
// Only the krathong's look (its kind and colour) is shared, plus its wish when the person chose to share it. Never a name
// or anything that says who sent it.
//
// It talks to a Firebase Firestore database through its plain web API (no extra library), and it stays completely
// switched off until the owner fills in `shared` in the festival config.

export type SharedConfig = { projectId?: string; apiKey?: string; collection?: string; pollMs?: number; /** least time between two krathongs sent from one visit (milliseconds) */ minGapMs?: number; /** words that keep a wish from being shared or shown */ blocked?: string[]; /** Realtime Database address, for walking together with friends */ databaseUrl?: string; friendPollMs?: number; friendSendMs?: number; friendStaleMs?: number };
/** `w` is the wish, only when its owner chose to share it. */
/** How many krathongs and lanterns have been floated, by everyone, ever. */
export type FairTotals = { k: number; l: number };
export type SharedKrathong = { s: string; l: string; t: number; c: string; w?: string };

const MAX_WISH = 80;

/**
 * A wish from a stranger is only shown if it is plain kind words: not too long, and with nothing that looks like a way to
 * reach someone (a link, an e-mail, a phone number, a handle) or a word the owner has blocked. Returns "" if it should not be shared.
 */
export function cleanWish(text: string, blocked: string[] = []): string {
  const w = text.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim();
  if (!w || w.length > MAX_WISH) return "";
  const flat = w.toLowerCase().replace(/[\s.\-_()]/g, "");
  if (/https?:|www\.|\.(com|net|org|co|th|me|io)\b|@|line:|lineid|ไอจี|instagram|facebook|\d{7,}/i.test(w) || /\d{7,}/.test(flat)) return "";
  if (blocked.some((b) => b && flat.includes(b.toLowerCase().replace(/\s/g, "")))) return "";
  return w;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

type Field = { stringValue?: string; integerValue?: string };
type Row = { document?: { fields?: Record<string, Field> } };

function parse(rows: unknown, kinds: Set<string>, blocked: string[]): SharedKrathong[] {
  if (!Array.isArray(rows)) return [];
  const out: SharedKrathong[] = [];
  for (const r of rows as Row[]) {
    const f = r?.document?.fields;
    if (!f) continue;
    const s = f.s?.stringValue, l = f.l?.stringValue, c = f.c?.stringValue ?? "", t = Number(f.t?.integerValue);
    // trust nothing that comes from outside: only known kinds, plain hex colours, real numbers
    if (!s || !kinds.has(s) || !l || !HEX.test(l) || !Number.isFinite(t)) continue;
    const w = f.w?.stringValue ? cleanWish(f.w.stringValue, blocked) : "";
    out.push({ s, l, t, c: c.slice(0, 24), ...(w ? { w } : {}) });
  }
  return out;
}

export function sharedEnabled(cfg: SharedConfig | undefined): cfg is Required<Pick<SharedConfig, "projectId" | "apiKey">> & SharedConfig {
  return !!cfg?.projectId && !!cfg?.apiKey;
}

/** `kinds`: the krathong kinds that exist (anything else is ignored). */
export function createSharedSea(cfg: Required<Pick<SharedConfig, "projectId" | "apiKey">> & SharedConfig, kinds: string[]) {
  const set = new Set(kinds);
  const blocked = cfg.blocked ?? [];
  const col = cfg.collection ?? "krathongs";
  const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/(default)/documents`;
  const key = `key=${encodeURIComponent(cfg.apiKey)}`;
  const post = async (url: string, body: unknown) => {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  };
  const query = (extra: object) => post(`${base}:runQuery?${key}`, { structuredQuery: { from: [{ collectionId: col }], ...extra } });

  return {
    /** The newest krathongs, to fill the sea when someone arrives. */
    async latest(limit = 40): Promise<SharedKrathong[]> {
      const rows = await query({ orderBy: [{ field: { fieldPath: "t" }, direction: "DESCENDING" }], limit });
      return parse(rows, set, blocked).sort((a, b) => a.t - b.t);
    },
    /** Krathongs floated after a moment in time (asks for few rows, so it costs almost nothing to repeat). */
    async since(t: number, limit = 20): Promise<SharedKrathong[]> {
      const rows = await query({
        where: { fieldFilter: { field: { fieldPath: "t" }, op: "GREATER_THAN", value: { integerValue: String(t) } } },
        orderBy: [{ field: { fieldPath: "t" }, direction: "ASCENDING" }],
        limit,
      });
      return parse(rows, set, blocked);
    },
    /** Totals so far (zero until the first one is counted). */
    async totals(): Promise<FairTotals> {
      // batchGet answers "not there yet" with a normal reply, so a brand-new database does not log an error
      const rows = (await post(`${base}:batchGet?${key}`, { documents: [`projects/${cfg.projectId}/databases/(default)/documents/stats/total`] })) as { found?: { fields?: Record<string, Field> } }[];
      const f = (Array.isArray(rows) ? rows[0]?.found?.fields : undefined) ?? {};
      const n = (x?: Field) => Math.max(0, Math.floor(Number(x?.integerValue ?? 0)) || 0);
      return { k: n(f.k), l: n(f.l) };
    },
    /** Add one to the krathong count (k) or the lantern count (l). Failing quietly is fine: it is only a number. */
    async count(which: "k" | "l"): Promise<void> {
      await post(`${base}:commit?${key}`, {
        writes: [{ transform: { document: `projects/${cfg.projectId}/databases/(default)/documents/stats/total`, fieldTransforms: [{ fieldPath: which, increment: { integerValue: "1" } }] } }],
      });
    },
    /** Float yours for everyone. Only its look goes out, plus the wish if (and only if) its owner chose to share it. */
    async publish(k: SharedKrathong): Promise<void> {
      const fields: Record<string, Field> = { s: { stringValue: k.s }, l: { stringValue: k.l }, t: { integerValue: String(k.t) }, c: { stringValue: k.c } };
      const w = k.w ? cleanWish(k.w, blocked) : "";
      if (w) fields.w = { stringValue: w };
      await post(`${base}/${col}?${key}`, { fields });
    },
  };
}
