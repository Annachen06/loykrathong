import { useState } from "react";

/** Write a wish (optional) and float your krathong. The wish stays on this device only. */
export function FloatForm({ label, onFloat }: { label: string; onFloat: (wish: string) => void }) {
  const [wish, setWish] = useState("");
  return (
    <form
      className="float-form"
      onSubmit={(e) => {
        e.preventDefault();
        onFloat(wish.trim());
        setWish("");
      }}
    >
      <label htmlFor="wish-input">ตั้งจิตอธิษฐาน (ไม่ใส่ก็ได้)</label>
      <textarea id="wish-input" value={wish} maxLength={80} rows={2} placeholder="ขอให้…" onChange={(e) => setWish(e.target.value)} />
      <p className="privacy">คำอธิษฐานของคุณเป็นความลับ อยู่แค่ในเครื่องนี้ ไม่ได้ส่งไปที่ไหน แตะกระทงของคุณบนน้ำเพื่ออ่านอีกครั้ง</p>
      <button type="submit" className="panel-action">{label}</button>
    </form>
  );
}
