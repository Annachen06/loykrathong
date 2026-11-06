// Everything specific to the Loy Krathong edition lives in this folder.
// The name of the fair (brand) also appears on the arch over the way onto the pier.
// Text, places, layout and colours are plain data so they're easy to edit.
import type { FestivalConfig } from "../types";

export const loyKrathongConfig: FestivalConfig = {
  id: "loy-krathong",
  brand: "ลอยกระทงริมเล",
  tagline: "งานวัดเล็กๆ ริมทะเล",
  edition: "ไหว้พระ เล่นเกม รำวง แล้วไปลอยกระทงกัน",
  intro: {
    eyebrow: "คืนวันเพ็ญ เดือนสิบสอง",
    enterLabel: "เข้างาน",
    pickLabel: "แต่งตัวละครในแบบของคุณ แล้วเข้างานได้เลย",
    help: "แตะพื้นทรายเพื่อเดิน แตะดวงไฟเพื่อไปเที่ยวซุ้มต่างๆ",
  },
  welcomeHint: "แตะพื้นทรายเพื่อเดิน หรือแตะดวงไฟเพื่อไปเที่ยว",
  ui: {
    walkTo: "เดินไป",
    close: "ปิด",
    mapLabel: "แผนที่งาน",
    placesLabel: "สถานที่ในงาน",
    wishTitle: "คำอธิษฐาน",
    sampleTag: "ตัวอย่าง",
    yourWishTag: "ของคุณ · เห็นแค่คุณ",
  },
  // Example wishes for the other krathongs on the water. Always shown with a "ตัวอย่าง" tag:
  // there is no shared online wall yet, so these are not real visitors.
  sampleWishes: [
    "ขอให้คุณแม่หายป่วยไวๆ",
    "ขอให้สอบติดคณะที่ฝันไว้",
    "ขอให้ครอบครัวมีความสุข สุขภาพแข็งแรง",
    "ปีหน้าขอให้ได้มาลอยกระทงด้วยกันอีกนะ",
    "ขอให้งานใหม่ราบรื่น",
    "ขอขมาพระแม่คงคา ขอบคุณสำหรับน้ำตลอดปี",
    "ขอให้เจอคนที่ใช่สักที",
    "ขอให้น้องหมาที่บ้านแข็งแรงอยู่กันไปนานๆ",
    "ขอให้ร้านขายดี ลูกค้าเยอะๆ",
    "ขอให้ความทุกข์ลอยไปกับกระทง",
    "ขอให้หนี้หมดภายในปีนี้",
    "ขอให้คุณยายอายุยืน",
  ],

  // Fortune slips for the siamsi sticks at the temple. Written for fun, all gentle.
  fortunes: [
    "ใบที่ ๑ · ดวงดีมาก สิ่งที่ตั้งใจไว้ค่อยๆ เป็นจริง อดทนอีกนิดนะ",
    "ใบที่ ๗ · การงานรุ่งเรือง จะมีผู้ใหญ่ใจดีคอยช่วยเหลือ",
    "ใบที่ ๑๒ · ความรักสดใส คนที่อยู่ข้างๆ คือคนที่ห่วงใยคุณจริง",
    "ใบที่ ๑๘ · การเงินคล่องตัว ใช้จ่ายพอดีแล้วจะมีเก็บ",
    "ใบที่ ๒๑ · สุขภาพแข็งแรง พักผ่อนให้พอแล้วทุกอย่างจะดีขึ้น",
    "ใบที่ ๒๕ · การเดินทางราบรื่น จะได้เจอเพื่อนใหม่ที่ดี",
    "ใบที่ ๒๘ · ครอบครัวอบอุ่น จะมีข่าวดีจากคนไกลบ้าน",
    "ใบที่ ๓๐ · เรื่องที่กังวลอยู่จะคลี่คลายในเร็ววัน",
    "ใบที่ ๓๓ · การเรียนก้าวหน้า ตั้งใจอีกนิดจะได้ผลเกินคาด",
  ],

  // Krathong designs at the krathong shop. Free to pick: nothing is sold in the game.
  krathongs: [
    { id: "banana", name: "กระทงใบตอง", text: "แบบดั้งเดิม พับใบตองเป็นกลีบ ปักดอกดาวเรือง", hold: "krathong", color: "#ffcf4a", color2: "#3f9a68" },
    { id: "lotus", name: "กระทงดอกบัว", text: "กลีบบัวสีชมพูซ้อนกัน สวยหวาน", hold: "krathong", color: "#ff9ec0", color2: "#ffc2d6" },
    { id: "bread", name: "กระทงขนมปัง", text: "ปลากินได้ ไม่เป็นขยะในทะเล", hold: "krathong", color: "#ff8fb0", color2: "#d9a25a" },
    { id: "coconut", name: "กระทงกาบมะพร้าว", text: "แข็งแรง ลอยได้ไกล ตกแต่งด้วยดอกมะลิ", hold: "krathong", color: "#fffaf0", color2: "#8a5a3a" },
    // special editions: free during the trial run
    { id: "gold", name: "กระทงทองคำเปลว", text: "ปิดทองทั้งใบ ลอยไปมีประกายวิบวับตามน้ำ", hold: "krathong", color: "#fff1b0", color2: "#e0a830", premium: true },
    { id: "moon", name: "กระทงบัวแสงจันทร์", text: "กลีบบัวสีเงินเรืองแสงนวลเหมือนพระจันทร์", hold: "krathong", color: "#e8e0ff", color2: "#9a8ad8", premium: true },
    { id: "swan", name: "กระทงหงส์ขาว", text: "หงส์ขาวคอยาว ประดับดอกไม้บนหลัง", hold: "krathong", color: "#ffb3d4", color2: "#fffaf0", premium: true },
  ],

  places: [
    {
      id: "temple",
      name: "วัดริมทะเล",
      shortName: "วัด",
      marker: { x: 300, y: 420 },
      anchor: { x: 300, y: 846 },
      hitArea: { x0: 60, y0: 450, x1: 462, y1: 812 },
      description: "วัดเจ้าภาพงานคืนนี้ นั่งลงหน้าโต๊ะหมู่บูชา จุดธูปไหว้พระ ถวายดอกไม้ หรือเขย่าเซียมซีดูดวง",
      panel: "temple",
    },
    {
      id: "wheel",
      name: "ชิงช้าสวรรค์",
      shortName: "ชิงช้าสวรรค์",
      marker: { x: 860, y: 404 },
      anchor: { x: 860, y: 842 },
      hitArea: { x0: 712, y0: 420, x1: 1030, y1: 812 },
      description: "นั่งกระเช้าขึ้นไปชมวิว หมุนครบหนึ่งรอบ มองเห็นทะเล พระจันทร์ กระทงเต็มน้ำ และงานวัดข้างล่าง",
      action: { id: "ride", label: "ขึ้นชิงช้าสวรรค์", doneHint: "นั่งในกระเช้าแล้ว หมุนครบรอบจะพากลับลงมา" },
    },
    {
      id: "stage",
      name: "เวทีรำวง",
      shortName: "รำวง",
      marker: { x: 1145, y: 556 },
      anchor: { x: 1145, y: 842 },
      hitArea: { x0: 1030, y0: 600, x1: 1260, y1: 812 },
      description: "วงดนตรีลูกทุ่งเล่นเพลงรำวง คนบนเวทีรำวนเป็นวงกลม ขึ้นไปรำด้วยกันได้เลย",
      action: { id: "dance", label: "ขึ้นเวทีไปรำวง", doneHint: "ขึ้นเวทีแล้ว รำตามวงไปเลย!" },
    },
    {
      id: "games",
      name: "ซุ้มเกม",
      shortName: "ซุ้มเกม",
      marker: { x: 1445, y: 628 },
      anchor: { x: 1445, y: 842 },
      hitArea: { x0: 1290, y0: 640, x1: 1600, y1: 812 },
      description: "ปาเป้าลูกโป่งกับโยนห่วง ชนะแล้วได้ของรางวัลถือกลับไปเลย",
      panel: "games",
    },
    {
      id: "boutique",
      name: "ร้านกระทง",
      shortName: "ร้านกระทง",
      marker: { x: 1740, y: 630 },
      anchor: { x: 1740, y: 842 },
      hitArea: { x0: 1650, y0: 650, x1: 1840, y1: 815 },
      description: "กระทงทำมือหลายแบบ เลือกใบที่ชอบแล้วถือไปลอยที่ปลายสะพานได้เลย",
      panel: "krathongShop",
    },
    {
      id: "shore",
      name: "ท่าลอยกระทง",
      shortName: "ลอยกระทง",
      marker: { x: 1900, y: 556 },
      anchor: { x: 1900, y: 646 },
      hitArea: { x0: 1845, y0: 560, x1: 1955, y1: 812 },
      description: "เดินออกไปปลายสะพาน ระหว่างทางจะเห็นคำอธิษฐานบนกระทงที่ลอยอยู่ แล้วนั่งลงปล่อยกระทงของคุณ",
      panel: "float",
      action: { id: "float", label: "ลอยกระทง", doneHint: "กระทงของคุณลอยออกไปหาพระจันทร์แล้ว" },
    },
    {
      id: "candy",
      name: "ร้านสายไหม",
      shortName: "สายไหม",
      marker: { x: 2095, y: 650 },
      anchor: { x: 2095, y: 842 },
      hitArea: { x0: 2040, y0: 690, x1: 2150, y1: 812 },
      description: "สายไหมปั่นสดๆ ฟูๆ หวานละลายในปาก",
      panel: "food",
      items: [
        { id: "candy-pink", name: "สายไหมสีชมพู", text: "รสนม หอมหวาน", hold: "cottonCandy", color: "#ffb3d4" },
        { id: "candy-blue", name: "สายไหมสีฟ้า", text: "รสโซดา ซ่าๆ", hold: "cottonCandy", color: "#a8d8ff" },
      ],
    },
    {
      id: "memory",
      name: "มุมความทรงจำ",
      shortName: "ความทรงจำ",
      marker: { x: 2406, y: 648 },
      anchor: { x: 2406, y: 852 },
      hitArea: { x0: 2286, y0: 690, x1: 2536, y1: 818 },
      description: "รวมทุกอย่างที่คุณทำคืนนี้ไว้ในการ์ดที่ระลึก คำอธิษฐาน เซียมซี ของรางวัล และสมบัติที่เจอบนหาด แล้วบันทึกเป็นรูปเก็บไว้ได้",
      panel: "memory",
    },
    {
      id: "flowers",
      name: "ร้านดอกไม้",
      shortName: "ร้านดอกไม้",
      marker: { x: 522, y: 664 },
      anchor: { x: 500, y: 890 },
      hitArea: { x0: 462, y0: 680, x1: 580, y1: 862 },
      description: "ดอกไม้สดสำหรับไหว้พระ และดอกลีลาวดีไว้ทัดหู",
      panel: "flowers",
      items: [
        { id: "garland", name: "พวงมาลัยมะลิ", text: "เอาไปถวายพระที่วัด", hold: "garland", offering: true },
        { id: "lotus", name: "ดอกบัว", text: "ถือไปไหว้พระที่วัด", hold: "lotus", offering: true },
        { id: "plumeria", name: "ดอกลีลาวดีทัดหู", text: "ทัดหูให้สวยรับลมทะเล", wear: "flower" },
      ],
    },
    {
      id: "lanterns",
      name: "ลานปล่อยโคม",
      shortName: "ปล่อยโคม",
      marker: { x: 656, y: 700 },
      anchor: { x: 602, y: 902 },
      hitArea: { x0: 600, y0: 712, x1: 710, y1: 866 },
      description: "เลือกโคมลอยสักใบ ตั้งจิตอธิษฐาน แล้วปล่อยให้ลอยขึ้นไปหาพระจันทร์ เหมือนปล่อยเรื่องร้ายๆ ให้ลอยไป",
      panel: "lantern",
      stat: { key: "lanternsReleased", label: "โคมที่คุณปล่อย" },
      items: [
        { id: "lantern-orange", name: "โคมสีส้ม", text: "สีดั้งเดิม อบอุ่นเหมือนแสงเทียน", hold: "lantern", color: "#ffb35c" },
        { id: "lantern-pink", name: "โคมสีชมพู", text: "ขอเรื่องความรักให้สดใส", hold: "lantern", color: "#ff9ec0" },
        { id: "lantern-white", name: "โคมสีขาว", text: "ใจสงบ เริ่มต้นใหม่", hold: "lantern", color: "#fff4e2" },
        { id: "lantern-gold", name: "โคมสีทอง", text: "ขอให้โชคดี มีเงินมีทอง", hold: "lantern", color: "#ffd95a" },
        // special editions: free during the trial run
        { id: "lantern-heart", name: "โคมหัวใจ", text: "โคมรูปหัวใจ ส่งความรักขึ้นฟ้า", hold: "lantern", color: "#ff7fa8", style: "heart", premium: true },
        { id: "lantern-sparkle", name: "โคมทองประกาย", text: "โปรยประกายทองเป็นทางยาวตอนลอยขึ้น", hold: "lantern", color: "#ffd24a", style: "gold", premium: true },
        { id: "lantern-lanna", name: "โคมลายล้านนา", text: "กระดาษสาลายดอก มีพู่ห้อยสองข้าง", hold: "lantern", color: "#fff4e2", color2: "#d0453a", style: "lanna", premium: true },
      ],
    },
    {
      id: "ice",
      name: "ร้านน้ำแข็งไส",
      shortName: "น้ำแข็งไส",
      marker: { x: 2200, y: 650 },
      anchor: { x: 2200, y: 846 },
      hitArea: { x0: 2158, y0: 660, x1: 2242, y1: 812 },
      description: "น้ำแข็งไสเย็นชื่นใจ ราดน้ำหวานได้ตามชอบ",
      panel: "food",
      items: [
        { id: "ice-red", name: "น้ำแข็งไสน้ำแดง", text: "หวานหอมกลิ่นสละ", hold: "shavedIce", color: "#e8454f" },
        { id: "ice-green", name: "น้ำแข็งไสครีมโซดา", text: "เขียวใส ซ่าเย็น", hold: "shavedIce", color: "#6fd08a" },
        { id: "ice-pink", name: "น้ำแข็งไสนมชมพู", text: "นมเย็นหวานมัน", hold: "shavedIce", color: "#ffb0c8" },
      ],
    },
  ],

  // Beach treasures: tap them to find something. Found ones are kept on your souvenir card.
  curios: [
    { id: "shell", label: "หอยขี้เซา", at: { x: 2120, y: 912 }, radius: 34, found: "หอยตื่นมาอ้าปาก ข้างในมีไข่มุกเม็ดเล็กๆ" },
    { id: "starfish", label: "ปลาดาวน้อย", at: { x: 1330, y: 945 }, radius: 34, found: "ปลาดาวน้อยกระโดดทักทาย ได้เพื่อนใหม่หนึ่งตัว" },
    { id: "conch", label: "หอยสังข์", at: { x: 520, y: 962 }, radius: 30, found: "ยกหอยสังข์ขึ้นแนบหู ได้ยินเสียงคลื่นอยู่ข้างใน" },
    { id: "bottle", label: "ขวดข้อความ", at: { x: 2470, y: 958 }, radius: 30, found: "ในขวดมีโน้ตเขียนว่า “ใครเจอขวดนี้ ขอให้มีความสุขมากๆ นะ”" },
  ],

  layout: {
    width: 2600,
    height: 1000,
    focusY: 600,
    viewHeight: 780,
    portraitHeight: 660,
    skyTop: "#081046",
    walkAreas: [
      { id: "beach", rect: { x0: 60, y0: 805, x1: 2550, y1: 975 } },
      { id: "pier", rect: { x0: 1876, y0: 628, x1: 1924, y1: 812 } },
    ],
    junctions: [{ a: "beach", b: "pier", via: { x: 1900, y: 824 } }],
    spawn: { x: 1760, y: 890 },
    depth: { yBack: 630, yFront: 975, scaleBack: 0.8, scaleFront: 1.25 },
  },

  // Who you are at the fair. The first one is picked unless the player chooses another on the welcome screen.
  visitors: [
    {
      id: "woman",
      label: "ผู้หญิง",
      look: {
        figure: "woman", outfit: "pha-sin", hairStyle: "bun", flower: true, sleeves: "short",
        skin: "#f6d2b8", hair: "#2a1a24", top: "#ffd27a", bottom: "#ef6f8e", accent: "#fff0b8", outline: "#2a1d4a",
      },
    },
    {
      id: "man",
      label: "ผู้ชาย",
      look: {
        figure: "man", outfit: "shirt-pants", hairStyle: "short", collar: true, pattern: "floral",
        skin: "#eec1a0", hair: "#1c1418", top: "#ffd27a", bottom: "#34406e", accent: "#ef6f8e", outline: "#2a1d4a", height: 1.03,
      },
    },
  ],

  theme: {
    "--night": "#0d1440",
    "--ink": "#2a1d4a",
    "--paper": "#fff4e2",
    "--paper-edge": "#f3c77a",
    "--gold": "#ffcf6e",
    "--rose": "#ef6f8e",
    "--moonlight": "#fff7e6",
  },
};
