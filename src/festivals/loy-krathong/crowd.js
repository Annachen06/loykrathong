import { OUTLINE } from "./world";
const SKIN = ["#f6d2b8", "#eec1a0", "#e0aa84", "#c98e68", "#b07a56"];
const BLACK = "#1c1418", BROWN = "#3a2420", CHESTNUT = "#5a3a2a", GREY = "#b8b4bc", WHITE = "#dedbe2";
const L = (look) => ({ outline: OUTLINE, ...look });
export const crowdLooks = [
    L({ figure: "man", outfit: "shirt-pants", hairStyle: "short", skin: SKIN[2], hair: BLACK, top: "#3fa7a0", bottom: "#c8b48a", accent: "#ffe08a", pattern: "floral", collar: true }),
    L({ figure: "woman", outfit: "pha-sin", hairStyle: "long", skin: SKIN[0], hair: BROWN, top: "#fff4e2", bottom: "#7a4ab0", accent: "#ffcf6e", sleeves: "long", flower: true }),
    L({ figure: "man", outfit: "shirt-pants", hairStyle: "crop", skin: SKIN[3], hair: BLACK, top: "#d8504a", bottom: "#3a5a8a", accent: "#fff4e2", height: 1.04 }),
    L({ figure: "woman", outfit: "dress", hairStyle: "bob", skin: SKIN[1], hair: BLACK, top: "#8fd8c8", bottom: "#8fd8c8", accent: "#fff4e2" }),
    L({ figure: "woman", age: "elder", outfit: "pha-sin", hairStyle: "bun", skin: SKIN[2], hair: GREY, top: "#c9b6ff", bottom: "#2f6a52", accent: "#e8c066", sleeves: "long" }),
    L({ figure: "man", age: "elder", outfit: "shirt-pants", hairStyle: "bald", skin: SKIN[3], hair: WHITE, top: "#f2efe6", bottom: "#4a4a5a", accent: "#c8c4b8", collar: true, glasses: true }),
    L({ figure: "man", age: "kid", outfit: "shirt-shorts", hairStyle: "short", skin: SKIN[1], hair: BLACK, top: "#ff9a4a", bottom: "#4a6ac8", accent: "#fff4e2" }),
    L({ figure: "woman", age: "kid", outfit: "dress", hairStyle: "ponytail", skin: SKIN[0], hair: BROWN, top: "#ff9ec0", bottom: "#ff9ec0", accent: "#ffffff" }),
    L({ figure: "woman", outfit: "blouse-pants", hairStyle: "ponytail", skin: SKIN[1], hair: CHESTNUT, top: "#ef8fb0", bottom: "#4a6aa0", accent: "#fff4e2", height: 0.97 }),
    L({ figure: "man", outfit: "shirt-shorts", hairStyle: "short", skin: SKIN[4], hair: BLACK, top: "#5a7ad0", bottom: "#d8c49a", accent: "#c8d8ff", pattern: "plaid", collar: true }),
    L({ figure: "woman", outfit: "blouse-skirt", hairStyle: "long", skin: SKIN[0], hair: BLACK, top: "#fbf6ee", bottom: "#5a7ab0", accent: "#2e3a6a", pattern: "stripes", height: 0.96 }),
    L({ figure: "man", outfit: "shirt-pants", hairStyle: "short", skin: SKIN[2], hair: BROWN, top: "#4fa070", bottom: "#2e2a38", accent: "#fff4e2", collar: true, height: 1.02 }),
    L({ figure: "woman", outfit: "pha-sin", hairStyle: "bun", skin: SKIN[1], hair: BLACK, top: "#f8e6c8", bottom: "#b8404e", accent: "#ffcf6e", flower: true }),
    L({ figure: "man", outfit: "shirt-pants", hairStyle: "crop", skin: SKIN[1], hair: BLACK, top: "#9aa8e0", bottom: "#2e3a6a", accent: "#fff4e2", sleeves: "long", collar: true, glasses: true, height: 1.05 }),
    L({ figure: "woman", outfit: "dress", hairStyle: "long", skin: SKIN[3], hair: BLACK, top: "#d04a5a", bottom: "#d04a5a", accent: "#ffd6a0", pattern: "floral" }),
    L({ figure: "man", age: "kid", outfit: "shirt-shorts", hairStyle: "crop", skin: SKIN[2], hair: BLACK, top: "#b8d84a", bottom: "#c84a4a", accent: "#fff4e2" }),
    L({ figure: "man", outfit: "shirt-shorts", hairStyle: "short", skin: SKIN[3], hair: CHESTNUT, top: "#f08a4a", bottom: "#c8b48a", accent: "#fff0a8", pattern: "floral", collar: true }),
    L({ figure: "woman", outfit: "blouse-pants", hairStyle: "bob", skin: SKIN[0], hair: BROWN, top: "#4ab0b0", bottom: "#efe8dc", accent: "#fff4e2", sleeves: "long" }),
    L({ figure: "woman", age: "elder", outfit: "pha-sin", hairStyle: "short", skin: SKIN[3], hair: WHITE, top: "#e88aa0", bottom: "#3a3a7a", accent: "#fff4e2", pattern: "floral" }),
    L({ figure: "man", outfit: "shirt-pants", hairStyle: "short", skin: SKIN[1], hair: BLACK, top: "#33303c", bottom: "#4a6aa0", accent: "#fff4e2", height: 0.98 }),
    L({ figure: "woman", age: "kid", outfit: "blouse-skirt", hairStyle: "bob", skin: SKIN[2], hair: BLACK, top: "#ffffff", bottom: "#d8504a", accent: "#fff4e2" }),
    L({ figure: "woman", outfit: "blouse-skirt", hairStyle: "ponytail", skin: SKIN[2], hair: BLACK, top: "#d8a84a", bottom: "#6a4a3a", accent: "#fff4e2" }),
    L({ figure: "man", outfit: "shirt-shorts", hairStyle: "crop", skin: SKIN[2], hair: BLACK, top: "#5ac0e0", bottom: "#6a6a78", accent: "#fff4e2", sleeves: "none", height: 1.03 }),
    L({ figure: "woman", outfit: "dress", hairStyle: "ponytail", skin: SKIN[1], hair: CHESTNUT, top: "#b89ae8", bottom: "#b89ae8", accent: "#fff4e2" }),
    L({ figure: "man", age: "kid", outfit: "shirt-pants", hairStyle: "short", skin: SKIN[0], hair: BROWN, top: "#ffe07a", bottom: "#3a4a6a", accent: "#ef6f8e", pattern: "stripes" }),
    L({ figure: "woman", outfit: "pha-sin", hairStyle: "long", skin: SKIN[2], hair: BLACK, top: "#ffd0dc", bottom: "#1f6a6a", accent: "#ffcf6e", sleeves: "long", flower: true }),
    L({ figure: "man", age: "elder", outfit: "shirt-pants", hairStyle: "short", skin: SKIN[2], hair: GREY, top: "#8a6a4a", bottom: "#3a3240", accent: "#d8c49a", pattern: "plaid", collar: true }),
    L({ figure: "woman", outfit: "blouse-pants", hairStyle: "long", skin: SKIN[3], hair: BROWN, top: "#ffffff", bottom: "#2e2a38", accent: "#ef6f8e", pattern: "stripes" }),
];
