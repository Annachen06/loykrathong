// The souvenir card: a 1080 × 1920 picture (9:16, made for an Instagram Story) of the real fair with the visitor in it,
// plus a few short lines of text. The scene itself is painted by the renderer; this only adds the soft shading and the words.
export const CARD_W = 1080;
export const CARD_H = 1920;

type Options = {
  /** Paints the fair (and the visitor) onto the card's canvas. */
  paintScene: (canvas: HTMLCanvasElement) => void;
  title: string;
  /** Small line at the bottom: where this card came from. */
  site: string;
  date?: Date;
};

const FONT = "Mitr, 'Noto Sans Thai', sans-serif";

/** Makes the card and returns it as a PNG file. */
export async function makeMemoryCard({ paintScene, title, site, date = new Date() }: Options): Promise<Blob> {
  // the card uses the site's own lettering: wait for it so the words never come out in a plain font
  try {
    await Promise.all([document.fonts.load(`500 80px Mitr`, title), document.fonts.load(`400 40px Mitr`, "เก็บค่ำคืนนี้ไว้ในความทรงจำ ♡ 0123456789")]);
  } catch { /* fall back to the next font */ }

  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  paintScene(canvas);

  const ctx = canvas.getContext("2d")!;
  // shade only behind the words, so the scene stays bright everywhere else
  const top = ctx.createLinearGradient(0, 0, 0, 640);
  top.addColorStop(0, "rgba(8,12,40,0.62)");
  top.addColorStop(1, "rgba(8,12,40,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, CARD_W, 640);
  const bottom = ctx.createLinearGradient(0, 1240, 0, CARD_H);
  bottom.addColorStop(0, "rgba(8,12,40,0)");
  bottom.addColorStop(0.55, "rgba(8,12,40,0.6)");
  bottom.addColorStop(1, "rgba(8,12,40,0.82)");
  ctx.fillStyle = bottom;
  ctx.fillRect(0, 1240, CARD_W, CARD_H - 1240);

  // Story apps cover the top and bottom edges with their own buttons, so the words stay inside the middle
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(8,12,40,0.55)";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#ffd98a";
  let size = 104;
  ctx.font = `500 ${size}px ${FONT}`;
  while (ctx.measureText(title).width > CARD_W - 140 && size > 50) {
    size -= 4;
    ctx.font = `500 ${size}px ${FONT}`;
  }
  ctx.fillText(title, CARD_W / 2, 340);
  ctx.fillStyle = "#fff4e2";
  ctx.font = `400 44px ${FONT}`;
  ctx.fillText(date.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }), CARD_W / 2, 412);

  ctx.fillStyle = "#fff4e2";
  ctx.font = `400 56px ${FONT}`;
  ctx.fillText("เก็บค่ำคืนนี้ไว้ในความทรงจำ ♡", CARD_W / 2, 1560);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,244,226,0.78)";
  ctx.font = `400 32px ${FONT}`;
  ctx.fillText(site, CARD_W / 2, 1632);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no picture"))), "image/png"));
}
