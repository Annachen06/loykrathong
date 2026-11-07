import { useState } from "react";
import { sendToInbox } from "../engine/inbox";
import type { SharedConfig } from "../engine/sharedSea";

type State = "idle" | "sending" | "sent" | "failed";

/** A few kind words for the creator, for people who don't want to send money. Sent to the owner only; no name is asked for. */
export function CreatorNote({ inbox }: { inbox?: SharedConfig }) {
  const [state, setState] = useState<State>("idle");
  const [problem, setProblem] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (String(data.get("bot-field") ?? "")) return setState("sent"); // a robot filled the hidden field: pretend all is well
    const message = String(data.get("message") ?? "").trim();
    if (!message) return setProblem("พิมพ์ข้อความก่อนนะคะ");
    setProblem("");
    setState("sending");
    try {
      await sendToInbox(inbox, "notes", { m: message });
      setState("sent");
      form.reset();
    } catch {
      setState("failed");
    }
  };

  if (state === "sent") return <p className="slip-thanks" role="status">ขอบคุณสำหรับข้อความค่ะ อ่านแล้วดีใจมากเลย ♡</p>;

  return (
    <form className="slip-form note-form" name="creator-note" onSubmit={submit}>
      {/* a field only robots fill in; real visitors never see it */}
      <p className="slip-bot" aria-hidden="true"><label>อย่ากรอกช่องนี้ <input name="bot-field" tabIndex={-1} autoComplete="off" /></label></p>
      <label>ฝากข้อความให้กำลังใจผู้สร้าง<textarea name="message" rows={3} maxLength={500} placeholder="พิมพ์ข้อความตรงนี้ได้เลย" /></label>
      {problem && <p className="slip-problem" role="alert">{problem}</p>}
      {state === "failed" && <p className="slip-problem" role="alert">ส่งไม่สำเร็จ ลองใหม่อีกครั้งนะคะ</p>}
      <button type="submit" className="panel-action secondary" disabled={state === "sending"}>{state === "sending" ? "กำลังส่ง…" : "ส่งข้อความ"}</button>
    </form>
  );
}
