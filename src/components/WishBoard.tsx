/** Memory Corner: your wishes from this visit, plus clearly-labelled example wishes. */
export function WishBoard({ mine, samples, sampleTag }: { mine: string[]; samples: string[]; sampleTag: string }) {
  return (
    <div className="wish-board">
      <h3>คำอธิษฐานของคุณคืนนี้</h3>
      {mine.length ? (
        <ul className="wish-list mine">
          {mine.map((w, i) => <li key={i}>{w || "ลอยกระทงโดยไม่เขียนคำอธิษฐาน"}</li>)}
        </ul>
      ) : (
        <p className="wish-empty">ยังไม่ได้ลอยกระทง ไปที่ท่าลอยกระทงได้เลย</p>
      )}
      <h3>
        คำอธิษฐานบนกระทงลำอื่น <span className="wish-tag">{sampleTag}</span>
      </h3>
      <ul className="wish-list">
        {samples.slice(0, 4).map((w) => <li key={w}>{w}</li>)}
      </ul>
      <p className="wish-fine">ตอนนี้ยังไม่มีระบบแชร์คำอธิษฐานออนไลน์ คำอธิษฐานบนกระทงลำอื่นเป็นข้อความตัวอย่าง</p>
    </div>
  );
}
