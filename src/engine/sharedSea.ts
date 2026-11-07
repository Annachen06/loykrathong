// The shared sea: everyone who visits sees the krathongs other visitors floated, without knowing whose they are.
// Only the krathong's look (its kind and colour) is shared, never a wish, a name or anything that says who sent it.
//
// It talks to a Firebase Firestore database through its plain web API (no extra library), and it stays completely
// switched off until the owner fills in `shared` in the festival config.

export type SharedConfig = { projectId?: string; apiKey?: string; collection?: string; pollMs?: number };
export type SharedKrathong = { s: string; l: string; t: number; c: string };

const HEX = /^#[0-9a-fA-F]{6}$/;

type Field = { stringValue?: string; integerValue?: string };
type Row = { document?: { fields?: Record<string, Field> } };

function parse(rows: unknown, kinds: Set<string>): SharedKrathong[] {
  if (!Array.isArray(rows)) return [];
  const out: SharedKrathong[] = [];
  for (const r of rows as Row[]) {
    const f = r?.document?.fields;
    if (!f) continue;
    const s = f.s?.stringValue, l = f.l?.stringValue, c = f.c?.stringValue ?? "", t = Number(f.t?.integerValue);
    // trust nothing that comes from outside: only known kinds, plain hex colours, real numbers
    if (!s || !kinds.has(s) || !l || !HEX.test(l) || !Number.isFinite(t)) continue;
    out.push({ s, l, t, c: c.slice(0, 24) });
  }
  return out;
}

export function sharedEnabled(cfg: SharedConfig | undefined): cfg is Required<Pick<SharedConfig, "projectId" | "apiKey">> & SharedConfig {
  return !!cfg?.projectId && !!cfg?.apiKey;
}

/** `kinds`: the krathong kinds that exist (anything else is ignored). */
export function createSharedSea(cfg: Required<Pick<SharedConfig, "projectId" | "apiKey">> & SharedConfig, kinds: string[]) {
  const set = new Set(kinds);
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
      return parse(rows, set).sort((a, b) => a.t - b.t);
    },
    /** Krathongs floated after a moment in time (asks for few rows, so it costs almost nothing to repeat). */
    async since(t: number, limit = 20): Promise<SharedKrathong[]> {
      const rows = await query({
        where: { fieldFilter: { field: { fieldPath: "t" }, op: "GREATER_THAN", value: { integerValue: String(t) } } },
        orderBy: [{ field: { fieldPath: "t" }, direction: "ASCENDING" }],
        limit,
      });
      return parse(rows, set);
    },
    /** Float yours for everyone. Nothing but its look goes out. */
    async publish(k: SharedKrathong): Promise<void> {
      await post(`${base}/${col}?${key}`, {
        fields: { s: { stringValue: k.s }, l: { stringValue: k.l }, t: { integerValue: String(k.t) }, c: { stringValue: k.c } },
      });
    },
  };
}
