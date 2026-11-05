import { useState } from "react";

type Props = {
  label: string;
  /** Name of the krathong in your hand, or null if you haven't picked one. */
  krathong: string | null;
  onFloat: (wish: string) => void;
  onShop: () => void;
};

/** At the end of the pier: write a wish (optional) and float your krathong. The wish stays on this device only. */
export function FloatForm({ label, krathong, onFloat, onShop }: Props) {
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
      <p className="float-krathong">
        {krathong ? <>ในมือคุณ: <strong>{krathong}</strong></> : <>ยังไม่ได้เลือกกระทง จะได้กระทงใบตองจากท่าน้ำไปก่อน</>}
        {!krathong && <button type="button" className="link" onClick={onShop}>ไปเลือกที่ร้านกระทง</button>}
      </p>
      <label htmlFor="wish-input">ตั้งจิตอธิษฐาน (ไม่ใส่ก็ได้)</label>
      <textarea id="wish-input" value={wish} maxLength={80} rows={2} placeholder="ขอให้…" onChange={(e) => setWish(e.target.value)} />
      <p className="privacy">คำอธิษฐานของคุณเป็นความลับ อยู่แค่ในเครื่องนี้ ไม่ได้ส่งไปที่ไหน</p>
      <button type="submit" className="panel-action">{label}</button>
    </form>
  );
}
