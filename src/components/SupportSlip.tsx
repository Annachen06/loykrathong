import { useState } from "react";

/** Must match the hidden form in index.html, which is how Netlify finds the form when the site is uploaded. */
export const SLIP_FORM = "support-slip";
const MAX_BYTES = 5 * 1024 * 1024;

type State = "idle" | "sending" | "sent" | "failed";

/** After tipping: attach the transfer slip, so the owner can see whose gift it was and say thank you. Sent to the owner only. */
export function SupportSlip() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [problem, setProblem] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const slip = data.get("slip");
    if (!(slip instanceof File) || !slip.size) return setProblem("กรุณาแนบรูปสลิปด้วยนะคะ");
    if (!slip.type.startsWith("image/")) return setProblem("แนบได้เฉพาะไฟล์รูปภาพ (ภาพสลิปหรือภาพหน้าจอ)");
    if (slip.size > MAX_BYTES) return setProblem("รูปใหญ่เกินไป (ไม่เกิน 5 MB) ลองใช้ภาพหน้าจอแทนนะคะ");
    setProblem("");
    setState("sending");
    data.set("form-name", SLIP_FORM);
    try {
      const res = await fetch("/", { method: "POST", body: data });
      if (!res.ok) throw new Error(String(res.status));
      setState("sent");
      form.reset();
    } catch {
      setState("failed");
    }
  };

  if (state === "sent") return <p className="slip-thanks" role="status">ขอบคุณมากค่ะ ได้รับหลักฐานการโอนแล้ว ♡</p>;

  return (
    <div className="slip">
      {!open ? (
        <button type="button" className="panel-action secondary" onClick={() => setOpen(true)}>โอนแล้ว? แนบหลักฐานการโอน</button>
      ) : (
        <form className="slip-form" name={SLIP_FORM} onSubmit={submit} encType="multipart/form-data">
          <p className="slip-lead">แนบสลิปเพื่อให้ผู้สร้างรู้ว่าเป็นกำลังใจจากใคร และได้ขอบคุณถึงคุณค่ะ (ไม่บังคับให้กรอกชื่อ)</p>
          {/* a field only robots fill in; real visitors never see it */}
          <p className="slip-bot" aria-hidden="true"><label>อย่ากรอกช่องนี้ <input name="bot-field" tabIndex={-1} autoComplete="off" /></label></p>
          <label>ชื่อหรือชื่อเล่น<input name="name" maxLength={60} autoComplete="nickname" /></label>
          <label>ช่องทางติดต่อ (LINE / IG / อีเมล)<input name="contact" maxLength={80} /></label>
          <label>จำนวนเงินที่โอน (บาท)<input name="amount" inputMode="decimal" maxLength={12} /></label>
          <label>ข้อความถึงผู้สร้าง<textarea name="message" rows={2} maxLength={200} /></label>
          <label>แนบสลิป<input name="slip" type="file" accept="image/*" required /></label>
          <p className="privacy">รูปสลิปมีข้อมูลบัญชีของคุณ จะถูกส่งถึงผู้สร้างคนเดียว ไม่แสดงให้ใครเห็นในงาน คุณสามารถปิดบังเลขบัญชีบนรูปก่อนส่งได้</p>
          {problem && <p className="slip-problem" role="alert">{problem}</p>}
          {state === "failed" && <p className="slip-problem" role="alert">ส่งไม่สำเร็จ ลองใหม่อีกครั้งนะคะ</p>}
          <button type="submit" className="panel-action" disabled={state === "sending"}>{state === "sending" ? "กำลังส่ง…" : "ส่งหลักฐานการโอน"}</button>
        </form>
      )}
    </div>
  );
}
