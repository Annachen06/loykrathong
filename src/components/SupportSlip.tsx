import { useState } from "react";

import { sendToInbox, shrinkPicture } from "../engine/inbox";
import type { SharedConfig } from "../engine/sharedSea";

const MAX_BYTES = 10 * 1024 * 1024;

type State = "idle" | "sending" | "sent" | "failed";

/** After tipping: attach the transfer slip, so the owner can see whose gift it was and say thank you. Sent to the owner only. */
export function SupportSlip({ inbox }: { inbox?: SharedConfig }) {
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
    if (slip.size > MAX_BYTES) return setProblem("รูปใหญ่เกินไป (ไม่เกิน 10 MB) ลองใช้ภาพหน้าจอแทนนะคะ");
    setProblem("");
    setState("sending");
    if (String(data.get("bot-field") ?? "")) return setState("sent"); // a robot filled the hidden field: pretend all is well
    try {
      const picture = await shrinkPicture(slip);
      await sendToInbox(inbox, "slips", { m: String(data.get("message") ?? "").trim(), i: picture });
      setState("sent");
      form.reset();
    } catch {
      setState("failed");
    }
  };

  if (state === "sent") return <p className="slip-thanks" role="status">ขอบคุณสำหรับกำลังใจนะคะ เราจะนำไปพัฒนาเว็บแอปนี้ให้ดียิ่งขึ้นและพัฒนาเว็บแอปใหม่ๆขึ้นมาให้ทุกคนได้ร่วมสนุกกันค่ะ ♡</p>;

  return (
    <div className="slip">
      {!open ? (
        <button type="button" className="panel-action secondary" onClick={() => setOpen(true)}>ส่งสลิปโกโก้ได้ที่นี่ ☕</button>
      ) : (
        <form className="slip-form" name="support-slip" onSubmit={submit}>
          <p className="slip-lead">แนบสลิปได้เลยค่ะ ผู้สร้างจะได้รับและขอบคุณถึงคุณ</p>
          {/* a field only robots fill in; real visitors never see it */}
          <p className="slip-bot" aria-hidden="true"><label>อย่ากรอกช่องนี้ <input name="bot-field" tabIndex={-1} autoComplete="off" /></label></p>
          <label>ข้อความถึงผู้สร้าง (ไม่จำเป็น)<textarea name="message" rows={2} maxLength={200} /></label>
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
