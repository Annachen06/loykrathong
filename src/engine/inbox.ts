// Messages and transfer slips for the creator. They are written to the creator's own Firebase database
// (collections "notes" and "slips"). The rules let visitors only add; nobody but the creator can read them back.
import type { SharedConfig } from "./sharedSea";
import { sharedEnabled } from "./sharedSea";

export type Inbox = "notes" | "slips";

const MAX_CHARS = 700_000; // a Firestore document must stay under 1 MiB

/** Writes one document to the creator's inbox. `fields.i` (a slip picture) is a data URL. */
export async function sendToInbox(cfg: SharedConfig | undefined, inbox: Inbox, fields: { m: string; i?: string }): Promise<void> {
  if (!sharedEnabled(cfg)) throw new Error("not set up");
  const doc: Record<string, { stringValue?: string; integerValue?: string }> = {
    m: { stringValue: fields.m.slice(0, 500) },
    t: { integerValue: String(Date.now()) },
  };
  if (fields.i) doc.i = { stringValue: fields.i };
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/(default)/documents/${inbox}?key=${encodeURIComponent(cfg.apiKey)}`;
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields: doc }) });
  if (!res.ok) throw new Error(String(res.status));
}

/** Shrinks a slip picture to a JPEG that fits in one database record (about 1280 px wide, as small as it needs to be). */
export async function shrinkPicture(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * k));
  c.height = Math.max(1, Math.round(bmp.height * k));
  const g = c.getContext("2d");
  if (!g) throw new Error("no canvas");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  for (const q of [0.8, 0.65, 0.5, 0.35]) {
    const url = c.toDataURL("image/jpeg", q);
    if (url.length <= MAX_CHARS) return url;
  }
  throw new Error("too big");
}
