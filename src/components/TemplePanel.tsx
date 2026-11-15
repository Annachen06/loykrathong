import type { FairItem } from "../festivals/types";

type Props = {
  offering: FairItem | null;
  fortune: string | null;
  onPray: () => void;
  onFortune: () => void;
};

/** At the temple: kneel and pray (offering flowers if you brought some), or shake the siamsi fortune sticks. */
export function TemplePanel({ offering, fortune, onPray, onFortune }: Props) {
  return (
    <div className="temple">
      <button type="button" className="panel-action" data-act="pray" onClick={onPray}>
        {offering ? `จุดธูปไหว้พระ และถวาย${offering.name}` : "จุดธูปไหว้พระ"}
      </button>
      {!offering && <p className="panel-tip">มีพวงมาลัยและดอกบัวที่ร้านดอกไม้ ถือมาถวายพระได้นะ</p>}
      <button type="button" className="panel-action secondary" data-act="fortune" onClick={onFortune}>
        เขย่าเซียมซี
      </button>
      {fortune && <p className="panel-tip">เซียมซีที่ได้คืนนี้: {fortune}</p>}
    </div>
  );
}
