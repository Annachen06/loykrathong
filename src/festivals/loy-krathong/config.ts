// Everything specific to the Loy Krathong edition lives in this folder.
// Text, places, layout and colours are plain data so they're easy to edit.
import type { FestivalConfig } from "../types";

export const loyKrathongConfig: FestivalConfig = {
  id: "loy-krathong",
  brand: "MOONKRADE",
  tagline: "A Little Festival by the Sea",
  edition: "Loy Krathong by the Moonlit Sea",
  intro: {
    eyebrow: "คืนวันเพ็ญ เดือนสิบสอง",
    enterLabel: "เข้างาน · Enter the festival",
    help: "Tap the sand to walk. Tap a glowing place to visit it.",
  },
  welcomeHint: "Tap the sand to walk, or a glowing light to visit.",

  places: [
    {
      id: "entrance",
      nameTh: "ซุ้มทางเข้างาน",
      nameEn: "Festival Entrance",
      marker: { x: 430, y: 628 },
      anchor: { x: 430, y: 846 },
      hitArea: { x0: 350, y0: 630, x1: 510, y1: 815 },
      description:
        "Welcome to Moonkrade, a little festival on a moonlit island. Wander the beach, visit the stalls, and float a krathong under the full moon.",
      action: { id: "tour", label: "พาเดินชมงาน · Take me to the shore", doneHint: "Heading down to the Moonlit Shore.", goTo: "shore" },
    },
    {
      id: "flowers",
      nameTh: "ร้านดอกไม้และของตกแต่ง",
      nameEn: "Flower & Decoration Stall",
      marker: { x: 855, y: 676 },
      anchor: { x: 855, y: 840 },
      hitArea: { x0: 640, y0: 690, x1: 1070, y1: 812 },
      description: "Marigold garlands, jasmine strings and lotus buds, all picked for tonight's krathongs.",
      note: "Choosing flowers and decorations for your krathong opens in the next update.",
      action: { id: "jasmine", label: "ดมกลิ่นมะลิ · Breathe in the jasmine", doneHint: "Petals drift up from the flower stall." },
    },
    {
      id: "boutique",
      nameTh: "ร้านกระทง",
      nameEn: "Krathong Boutique",
      marker: { x: 1280, y: 656 },
      anchor: { x: 1280, y: 842 },
      hitArea: { x0: 1180, y0: 670, x1: 1380, y1: 815 },
      description: "Banana-leaf krathongs folded by hand, from simple and traditional to moon-and-star designs.",
      note: "The boutique is still being set up. Browsing and choosing a krathong opens in the next update.",
    },
    {
      id: "shore",
      nameTh: "ท่าน้ำแสงจันทร์",
      nameEn: "Moonlit Shore",
      marker: { x: 1640, y: 556 },
      anchor: { x: 1640, y: 646 },
      hitArea: { x0: 1585, y0: 560, x1: 1695, y1: 812 },
      description: "The pier reaches out under the full moon. This is where krathongs are set on the water.",
      note: "For now you can float a simple leaf krathong. Choosing, decorating and adding a private wish come next.",
      action: { id: "float", label: "ลอยกระทง · Float a krathong", doneHint: "Your krathong drifts out toward the moon." },
    },
    {
      id: "memory",
      nameTh: "มุมความทรงจำ",
      nameEn: "Memory Corner",
      marker: { x: 2160, y: 676 },
      anchor: { x: 2160, y: 852 },
      hitArea: { x0: 2040, y0: 690, x1: 2290, y1: 818 },
      description: "A quiet nook under the lanterns, with a shell-framed board for keeping tonight's memories.",
      note: "Souvenir cards of your krathong arrive in the next update. Nothing here is saved or shared yet.",
      stat: { key: "krathongsFloated", label: "Krathongs you've floated on this visit" },
    },
  ],

  curios: [
    { id: "shell", label: "A sleepy shell", at: { x: 1490, y: 905 }, radius: 34 },
    { id: "starfish", label: "A little starfish", at: { x: 1010, y: 940 }, radius: 34 },
  ],

  layout: {
    width: 2400,
    height: 1000,
    focusY: 600,
    portraitHeight: 680,
    walkAreas: [
      { id: "beach", rect: { x0: 70, y0: 805, x1: 2330, y1: 975 } },
      { id: "pier", rect: { x0: 1616, y0: 628, x1: 1664, y1: 812 } },
    ],
    junctions: [{ a: "beach", b: "pier", via: { x: 1640, y: 824 } }],
    spawn: { x: 430, y: 890 },
    depth: { yBack: 630, yFront: 975, scaleBack: 0.78, scaleFront: 1.22 },
  },

  visitor: {
    skin: "#ffd9c0",
    hair: "#3a2240",
    top: "#ffd27a",
    bottom: "#ef6f8e",
    accent: "#ffe7a3",
    outline: "#2a1d4a",
  },

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
