import { useState } from "react";

type Props = {
  label: string;
  /** The krathong is also shown to other visitors (its look only). */
  shared?: boolean;
  /** Name of the krathong in your hand, or null if you haven't picked one. */
  krathong: string | null;
  /** `share`: the person agreed to let others read this wish (anonymously). */
  onFloat: (wish: string, share: boolean) => void;
  onShop: () => void;
  /** Not floating today: just here for the sea air. */
  onLook: () => void;
};

/** At the end of the pier: write a wish (optional) and float your krathong. The wish stays on this device only. */
export function FloatForm({ label, shared, krathong, onFloat, onShop, onLook }: Props) {
  const [wish, setWish] = useState("");
  const [share, setShare] = useState(true);
  // only someone holding a krathong can float one: everyone else is asked, kindly, what they would like to do
  if (!krathong) {
    return (
      <div className="float-ask">
        <p className="float-ask-title">เอ๊ะ ยังไม่มีกระทงในมือเลยนะ 🌸</p>
        <p>อยากไปเลือกกระทงสวยๆ ที่ร้านก่อนไหม หรือวันนี้แค่อยากมายืนชมบรรยากาศริมทะเลเฉยๆ ก็ได้เหมือนกันนะ ไม่ต้องรีบเลย</p>
        <button type="button" className="panel-action" onClick={onShop}>🌸 ไปเลือกกระทงที่ร้าน</button>
        <button type="button" className="panel-action secondary" onClick={onLook}>🌊 แค่มาชมบรรยากาศ</button>
      </div>
    );
  }
  return (
    <form
      className="float-form"
      onSubmit={(e) => {
        e.preventDefault();
        onFloat(wish.trim(), !!shared && share);
        setWish("");
      }}
    >
      <p className="float-krathong">
        ในมือคุณ: <strong>{krathong}</strong>
      </p>
      <label htmlFor="wish-input">ตั้งจิตอธิษฐาน (ไม่ใส่ก็ได้)</label>
      <textarea id="wish-input" value={wish} maxLength={80} rows={2} placeholder="ขอให้…" onChange={(e) => setWish(e.target.value)} />
      {shared && (
        <label className="share-wish">
          <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
          <span>ให้คนอื่นในงานอ่านคำอธิษฐานนี้ได้ (ไม่ระบุตัวตน)</span>
        </label>
      )}
      <p className="privacy">
        {!shared
          ? "คำอธิษฐานของคุณเป็นความลับ อยู่แค่ในเครื่องนี้ ไม่ได้ส่งไปที่ไหน"
          : share
            ? "คำอธิษฐานนี้จะให้คนอื่นในงานอ่านได้ โดยไม่บอกว่าเป็นของใคร อย่าใส่ชื่อ เบอร์โทร หรือข้อมูลส่วนตัวนะ"
            : "คำอธิษฐานของคุณเป็นความลับ อยู่แค่ในเครื่องนี้ ส่วนกระทงของคุณจะไปลอยให้คนอื่นเห็นด้วย โดยไม่บอกว่าเป็นของใคร"}
      </p>
      <button type="submit" className="panel-action">{label}</button>
    </form>
  );
}
