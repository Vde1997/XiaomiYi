// Conceptschets pocket-kabellabelprinter. Bouwt ontwerp/pocketprinter-concept.html.
// Gebruikt de anatomy-tekenkit (MIT): git clone https://github.com/wheresryan22/anatomy
// Start met: KIT=/pad/naar/anatomy node ontwerp/build.mjs
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const KIT = process.env.KIT || "/home/user/wheresryan22/anatomy";
const k = await import(pathToFileURL(join(KIT, "kit/iso-kit.mjs")).href);
const G = await import(pathToFileURL(join(KIT, "kit/lathe.mjs")).href);
const HERE = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- model (mm)
const L = 125, W = 38, T = 30;            // buitenmaten
const BASE = 3;                            // dikte bodemplaat
const BODY = { x: 0, y: 0, w: L, d: W, r: 6 };
const KERF = [11.4, 12.6];                 // labelgleuf, dwars door de neus
const LABEL = { len: 60, h: 10, t: 0.6, z: 11, x: 11.7 };
const HEAD_Y = 19;                         // printlijn, midden in de breedte
const SPEED = 15;                          // mm/s
const TRAVEL = [-56, 44];                  // verschuiving van het label, start tot los
const RIBBON = { z: 9.6, h: 12.8 };
const PLATEN = [7, 19];
const TAKEUP = [36, 14.5], SUPPLY = [56, 14.5];
const MOTOR = { y: 33, z: 8, r: 4.9 };
const GEAR_Z = 7.2, GEAR_H = 1.6;
const GEARS = [
  { at: [31, 27.7], r: 3.4 },
  { at: [24.5, 29.5], r: 3.34 },
  { at: [17.8, 30.8], r: 3.48 },
  { at: [12.5, 28.5], r: 2.3 },
  { at: [9.5, 24.6], r: 2.62 },
];
const BATTERY = { x0: 72.5, len: 50, r: 7, y: 11, z: 10.6 };
const PCB = { x: 72, y: 20.5, w: 50, d: 15.5, r: 1 };
const PCB_Z = 7.2;
const OLED = { x: 64, y: 7.5, w: 36, d: 13, r: 1.2 };
const BUTTON = [111, 25];
const LOOSE = { x: 48, y: 54, w: 60, d: 10, r: 0.8 };
const TOTAL = 48;
const FIRST = 14;
const codeOf = (n) => "W1-L2-" + String(n).padStart(3, "0");

const WIDTH = 760, HEIGHT = 470;
const P = k.fitProjection(
  [
    ...k.boxCorners(BODY, -1, T + 2),
    [LABEL.x, TRAVEL[0], LABEL.z + LABEL.h], [LABEL.x, TRAVEL[1] + LABEL.len, LABEL.z],
    [LOOSE.x + LOOSE.w, LOOSE.y + LOOSE.d, 0],
  ],
  WIDTH, HEIGHT, { pad: 26, azimuth: 38, elevation: 36 },
);

// ---------------------------------------------------------------- helpers
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const box = (x, y, w, d, z, h, o = {}) =>
  S(k.slabOf({ x, y, w, d, r: o.r ?? 0.4 }, z, h, P, o.steps ?? 3, o.bevel ?? 0), { tone: o.tone ?? "mid", crease: o.crease, lit: o.lit, className: o.cls, inner: o.inner });
const cyl = (cx, cy, r, z, h, o = {}) =>
  S(k.cylinder(cx, cy, r, z, h, P, o.steps ?? 28, o.bevel ?? 0), { tone: o.tone ?? "mid", crease: o.crease, lit: o.lit, className: o.cls, inner: o.inner });
const items = [];
const put = (xy, svg, bias = 0) => items.push({ key: k.depthOf([xy[0], xy[1], 0], P) + bias, x: xy[0], svg });
const pin = (n, p) => {
  const [x, y] = at(p);
  return `<g class="pp-pin" data-pin="${n}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="7.2"/><text y="2.9" text-anchor="middle">${n}</text></g>`;
};
// houd een veelhoek aan één kant van een verticale snede
const clipX = (ring, limit, keepBelow) => {
  const inside = ([x]) => (keepBelow ? x <= limit : x >= limit);
  const out = [];
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length];
    if (inside(a)) out.push(a);
    if (inside(a) !== inside(b)) {
      const t = (limit - a[0]) / (b[0] - a[0]);
      out.push([limit, a[1] + (b[1] - a[1]) * t]);
    }
  });
  return out;
};
const rectOn = (plane, a0, a1, z0, z1, axis) => {
  // gesloten rechthoek op een verticaal vlak: axis "x" = vlak x=plane (a langs y), "y" = vlak y=plane (a langs x)
  const pt = (a, z) => (axis === "x" ? [plane, a, z] : [a, plane, z]);
  const r = Math.min(1, (z1 - z0) / 2, (a1 - a0) / 2);
  const pts = [];
  const arc = (ca, cz, from) => { for (let i = 0; i <= 4; i++) { const t = from + (i / 4) * Math.PI / 2; pts.push(pt(ca + Math.cos(t) * r, cz + Math.sin(t) * r)); } };
  arc(a1 - r, z1 - r, 0); arc(a0 + r, z1 - r, Math.PI / 2); arc(a0 + r, z0 + r, Math.PI); arc(a1 - r, z0 + r, 1.5 * Math.PI);
  return k.pathOf(pts.map(at), true);
};

// ---------------------------------------------------------------- bodemplaat
function chassis() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BODY, 0, 1, P)}"/>`];
  for (const [x, y] of k.corners(BODY, 9)) out.push(cyl(x, y, 2.6, -0.9, 0.9, { tone: "lo", steps: 20 }));
  out.push(S(k.slabOf(BODY, 0, BASE, P, 8, 0.4), { tone: "mid" }));
  out.push(Ln(k.planOutline(k.insetPlan(BODY, 1.7), BASE, P), { tone: "lo" }));
  const screws = k.corners(BODY, 4.6);
  out.push(Ln(screws.map(([x, y]) => k.ring(x, y, 1.3, BASE, P, 14)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, BASE])), { size: 0.55 }));
  // flexkabel van printkop naar printplaat, plat op de bodem langs de achterwand
  out.push(k.wireSvg(at([24.8, 12.4, BASE]), at([72.6, 19.4, BASE]), { via: [at([24.8, 2.2, BASE]), at([67.6, 2.2, BASE]), at([67.6, 19.4, BASE])], tone: "lo" }));
  return out.join("");
}

// ---------------------------------------------------------------- losse labels op de werkbank
function strip() {
  const out = [`<path class="iso-halo" d="${k.haloOf(LOOSE, 0, 0.2, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(LOOSE, 0, LABEL.t, P, 3), { tone: "hi", className: "pp-label" }));
  const slots = [{ x: LOOSE.x + 3, y: LOOSE.y + 3.5, w: 5, d: 3, r: 1 }, { x: LOOSE.x + 52, y: LOOSE.y + 3.5, w: 5, d: 3, r: 1 }];
  out.push(Ln(slots.map((slot) => k.planOutline(slot, LABEL.t, P, 4)).join(""), { tone: "hi", className: "pp-label-line" }));
  return out.join("");
}

// ---------------------------------------------------------------- neus: aandrukrol en klep-onderdeel
function nose() {
  put([6, 19], box(1.6, 4, 9.2, 30, BASE, 3.8, { r: 1.4, bevel: 0.3 }), -30);
  put([3, 5.6], cyl(3, 5.6, 1.2, BASE + 3.8, 18.2, { steps: 16, crease: "none" }), -2);
  put([3, 32.4], cyl(3, 32.4, 1.2, BASE + 3.8, 18.2, { steps: 16, crease: "none" }), -2);
  // tandwiel onder de rol
  const [px, py] = PLATEN;
  const g = [cyl(px, py, 3.5, GEAR_Z, GEAR_H, { steps: 30 }), Ln(k.knurl(px, py, 3.5, GEAR_Z, GEAR_Z + GEAR_H, 30, P, 0.1), { tone: "lo" })];
  // siliconen aandrukrol
  g.push(cyl(px, py, 4, 9.6, 12.9, { steps: 40, tone: "hi", cls: "pp-rubber", inner: Ln(k.sideArc(px, py, 4, 10.6, P, 20) + k.sideArc(px, py, 4, 21.5, P, 20), { tone: "faint" }) }));
  g.push(cyl(px, py, 1.1, 22.5, 2.5, { steps: 14, crease: "none" }));
  put(PLATEN, g.join(""));
  // labelgeleiders aan de neuskant
  put([10.3, 4.5], box(9.4, 2, 1.9, 5, 10, 12, { r: 0.5 }));
  put([10.3, 33.5], box(9.4, 31, 1.9, 5, 10, 12, { r: 0.5 }), 3);
  // lagerbrug boven de rol
  const bridge = { x: 1.8, y: 4, w: 8.8, d: 30, r: 1.4 };
  put([8.5, 30], S(k.slabOf(bridge, 25, 1.6, P, 4, 0.3), { tone: "mid" }) + Ln(k.ring(px, py, 2.2, 26.6, P, 18), { tone: "lo" }) + D([at([px, py, 26.6]), at([3, 5.6, 26.6]), at([3, 32.4, 26.6])], { size: 0.5 }), 6);
}

// ---------------------------------------------------------------- printkop, veer, geleiders
function head() {
  // inloop- en uitloopgeleider aan de bodykant, met de labelsensor op de inloop
  put([13.7, 4], box(12.75, 2, 1.9, 4.2, 10, 12, { r: 0.5 }) + box(14.65, 2.4, 2.2, 3.2, 13.5, 4, { r: 0.4, tone: "hi" }) + D([at([15.75, 4, 17.5])], { size: 0.6, tone: "hi" }));
  // lintgeleider en afpelpen
  put([14.8, 7.6], cyl(14.8, 7.6, 0.9, BASE, 20.6, { steps: 12, crease: "none" }) + D([at([14.8, 7.6, 23.6])], { size: 0.4 }));
  put([15.6, 26.6], cyl(15.6, 26.6, 0.9, BASE, 20.6, { steps: 12, crease: "none" }) + D([at([15.6, 26.6, 23.6])], { size: 0.4 }), 1.5);
  // keramische printkop met de printlijn
  const kop = { x: 12.75, y: 15, w: 1.5, d: 8, r: 0.3 };
  const drager = { x: 14.25, y: 13.5, w: 3.2, d: 11, r: 0.6 };
  const fins = [12, 16, 20].map((z) => k.sideSeam(drager, z, P, 3)).join("");
  put([15.2, 19], [
    S(k.slabOf(kop, 9.5, 13, P, 2), { tone: "hi", lit: true }),
    S(k.slabOf(drager, 8, 16, P, 3, 0.3), { tone: "mid", inner: Ln(fins, { tone: "faint" }) }),
    D([at([15.85, 15.2, 24]), at([15.85, 22.8, 24])], { size: 0.45 }),
  ].join(""), 0.6);
  // aandrukveer en aanslag
  const veer = k.coil(17.45, 22, [19, 16], 2.3, 4.5, "x", P);
  put([19.7, 19], Ln(veer.back, { tone: "lo" }) + Ln(veer.front, { tone: "hi" }), 0.9);
  put([23, 19], box(22, 13, 2, 12, BASE, 19, { r: 0.5, bevel: 0.25 }) + D([at([23, 15, 22]), at([23, 23, 22])], { size: 0.45 }), 1.2);
}

// ---------------------------------------------------------------- lintcassette
function cassette() {
  const plaat = { x: 26.5, y: 2.6, w: 41.5, d: 23.8, r: 3 };
  put([47, 14.5], S(k.slabOf(plaat, BASE, 1.6, P, 6, 0.3), { tone: "mid" }) + Ln(k.planOutline(k.insetPlan(plaat, 1.2), BASE + 1.6, P, 6), { tone: "faint" }) + D(k.corners(plaat, 3).map(([x, y]) => at([x, y, BASE + 1.6])), { size: 0.4 }), -40);
  const spool = ([cx, cy], wound, rings) => {
    const out = [cyl(cx, cy, 4.4, BASE + 1.6, 3.6, { steps: 24 })];
    out.push(cyl(cx, cy, 9.1, 8.6, 0.8, { steps: 48, tone: "mid" }));
    out.push(cyl(cx, cy, wound, 9.5, RIBBON.h + 0.2, { steps: 48, tone: "mid", cls: "pp-ink" }));
    out.push(Ln(rings.map((r) => k.ring(cx, cy, r, 22.5, P, 40)).join(""), { tone: "lo" }));
    out.push(cyl(cx, cy, 2.7, 22.5, 1.6, { steps: 24, tone: "hi" }));
    const spokes = [0, 1, 2].map((i) => { const a = (i / 3) * Math.PI * 2 + 0.4; return k.lineOnTop([cx, cy], [cx + Math.cos(a) * 2.7, cy + Math.sin(a) * 2.7], 24.1, P); }).join("");
    out.push(Ln(spokes, { tone: "mid" }));
    out.push(D([at([cx, cy, 24.1])], { size: 0.6, tone: "hi" }));
    return out.join("");
  };
  put(TAKEUP, spool(TAKEUP, 5.2, [3.6, 4.4]));
  put(SUPPLY, spool(SUPPLY, 8.6, [3.6, 4.8, 6, 7.2, 8]));
  // lintpad: voorraadspoel, geleider, langs de printkop, afpelpen, opwikkelspoel
  const path = [[56, 5.9], [14.8, 6.7], [12.48, 9], [12.48, 25.2], [15.6, 27.5], [36, 19.7]];
  for (let i = 0; i + 1 < path.length; i++) {
    const [a, b] = [path[i], path[i + 1]];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const pieces = Math.max(1, Math.ceil(length / 8));
    const n = [-(b[1] - a[1]) / length * 0.1, (b[0] - a[0]) / length * 0.1];
    for (let j = 0; j < pieces; j++) {
      const p = [a[0] + (b[0] - a[0]) * (j / pieces), a[1] + (b[1] - a[1]) * (j / pieces)];
      const q = [a[0] + (b[0] - a[0]) * ((j + 1) / pieces), a[1] + (b[1] - a[1]) * ((j + 1) / pieces)];
      const ring = [[p[0] + n[0], p[1] + n[1]], [q[0] + n[0], q[1] + n[1]], [q[0] - n[0], q[1] - n[1]], [p[0] - n[0], p[1] - n[1]]];
      put([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], S(k.extrude(ring, RIBBON.z, RIBBON.h, P), { tone: "mid", crease: "none", className: "pp-film" }), i === 2 ? -0.5 : 0.2);
    }
  }
}

// ---------------------------------------------------------------- motor en tandwielen
function drive() {
  GEARS.forEach(({ at: [x, y], r }, i) => {
    const out = [cyl(x, y, 0.9, BASE, GEAR_Z - BASE, { steps: 10, crease: "none" })];
    out.push(cyl(x, y, r, GEAR_Z, GEAR_H, { steps: 30 }));
    out.push(Ln(k.knurl(x, y, r, GEAR_Z, GEAR_Z + GEAR_H, Math.round(r * 8), P, 0.1), { tone: "lo" }));
    out.push(Ln(k.ring(x, y, 1.1, GEAR_Z + GEAR_H, P, 12), { tone: "lo" }));
    out.push(D([at([x, y, GEAR_Z + GEAR_H])], { size: 0.45 }));
    put([x, y], out.join(""), i === 0 ? -1 : 0);
  });
  // tandwielkast
  const kast = { x: 35, y: 28, w: 9, d: 9.4, r: 0.8 };
  put([39.5, 33], S(k.slabOf(kast, BASE, 10.4, P, 3, 0.3), { tone: "mid", inner: Ln(k.sideSeam(kast, 6.6, P, 3) + k.sideSeam(kast, 10, P, 3), { tone: "faint" }) }) + D(k.corners(kast, 1.6).map(([x, y]) => at([x, y, BASE + 10.4])), { size: 0.4 }), 1);
  // uitgaande as met worm, richting neus
  const F1 = G.frameAlong([35, MOTOR.y, MOTOR.z], [-1, 0, 0]);
  const worm = [S(G.disc(0, 7.6, 1, F1, P), { tone: "mid", crease: "none" }), S(G.disc(1, 7, 1.9, F1, P), { tone: "mid" }), Ln(G.ribsOf(F1, 1, 7, 1.9, 9, P, { twist: 2.6, seams: true }), { tone: "lo" })];
  put([31, MOTOR.y], worm.join(""), 0.5);
  // motorhuis
  const F2 = G.frameAlong([44, MOTOR.y, MOTOR.z], [1, 0, 0]);
  const can = S(G.disc(0, 15, MOTOR.r, F2, P), { tone: "hi", inner: Ln(G.arcOf(F2, 2, MOTOR.r, P) + G.arcOf(F2, 13, MOTOR.r, P), { tone: "faint" }) });
  const cap = S(G.disc(15, 16.4, 3.8, F2, P), { tone: "mid" });
  put([52, MOTOR.y], can + cap + D([at([60.4, MOTOR.y - 2, MOTOR.z]), at([60.4, MOTOR.y + 2, MOTOR.z])], { size: 0.6, tone: "hi" }), 2);
}

// ---------------------------------------------------------------- accu en printplaat
function power() {
  put([69.7, 19], box(69, 2.6, 1.4, 32.8, BASE, 14, { r: 0.4 }), -3);
  const B = BATTERY;
  const F = G.frameAlong([B.x0, B.y, B.z], [1, 0, 0]);
  put([71.3, B.y], box(70.5, 7, 1.4, 8, BASE, 12, { r: 0.4 }) + S(G.disc(-0.9, 0, 2.4, F, P), { tone: "hi" }), -1);
  const wrap = [3, 6, B.len - 4].map((s) => G.arcOf(F, s, B.r, P)).join("");
  put([B.x0 + B.len / 2, B.y], S(G.disc(0, B.len, B.r, F, P), { tone: "hi", inner: Ln(wrap, { tone: "faint" }) }));
  put([123.2, B.y], box(122.6, 7, 1.2, 8, BASE, 12, { r: 0.4 }), 4);
  // printplaat op vier afstandsbusjes
  const plaat = PCB;
  const posts = k.corners(plaat, 2);
  put([97, 28], posts.map(([x, y]) => cyl(x, y, 1.3, BASE, 3, { steps: 12, crease: "none" })).join("") + S(k.slabOf(plaat, 6, 1.2, P, 3), { tone: "mid", className: "pp-pcb" }) + D(posts.map(([x, y]) => at([x, y, PCB_Z])), { size: 0.5 }), -6);
  // Bluetooth-module met afscherming en antenne
  const mod = { x: 75, y: 22, w: 13.2, d: 12.5, r: 0.4 };
  const kap = { x: 75.8, y: 25.6, w: 11.6, d: 8.3, r: 0.5 };
  const ant = [[76, 25.6], [76, 23], [78, 23], [78, 24.6], [80, 24.6], [80, 23], [82, 23], [82, 24.6], [84, 24.6], [84, 23], [86, 23], [86, 25.6]];
  put([81.6, 28.2], S(k.slabOf(mod, PCB_Z, 0.8, P, 2), { tone: "mid" }) + Ln(k.onTop(ant, PCB_Z + 0.8, P), { tone: "mid" }) + S(k.slabOf(kap, PCB_Z + 0.8, 2.2, P, 3, 0.25), { tone: "hi" }) + D([at([77, 27, PCB_Z + 3]), at([86.2, 32.6, PCB_Z + 3])], { size: 0.4 }));
  // lader, spoel, buffercondensator, schakelaar, USB-C
  put([93.5, 24.5], box(91.5, 22.5, 4, 4, PCB_Z, 1, { r: 0.3 }) + D([at([92.2, 23.2, PCB_Z + 1])], { size: 0.35 }));
  put([93.6, 31.6], cyl(93.6, 31.6, 2.2, PCB_Z, 2.6, { steps: 20 }) + Ln(k.ring(93.6, 31.6, 1.2, PCB_Z + 2.6, P, 12), { tone: "lo" }));
  put([102.5, 30.6], cyl(102.5, 30.6, 3.1, PCB_Z, 9, { steps: 28, tone: "hi" }) + Ln(k.sideArc(102.5, 30.6, 3.1, PCB_Z + 7.6, P, 16), { tone: "faint" }) + Ln(k.lineOnTop([100.3, 28.4], [104.7, 32.8], PCB_Z + 9, P) + k.lineOnTop([100.3, 32.8], [104.7, 28.4], PCB_Z + 9, P), { tone: "lo" }));
  put([BUTTON[0], BUTTON[1]], box(BUTTON[0] - 2.6, BUTTON[1] - 2.6, 5.2, 5.2, PCB_Z, 3.4, { r: 0.6 }) + cyl(BUTTON[0], BUTTON[1], 1.4, PCB_Z + 3.4, 1.2, { steps: 14, tone: "hi" }));
  const usb = { x: 114.6, y: 24.6, w: 8.6, d: 9, r: 1.2 };
  put([119, 29], S(k.slabOf(usb, PCB_Z, 3.2, P, 4, 0.25), { tone: "hi" }) + Ln(k.planOutline(k.insetPlan(usb, 1.4), PCB_Z + 3.2, P, 4), { tone: "faint" }), 2);
  // motordraden en accudraad
  put([66, 33], k.wireSvg(at([60.5, MOTOR.y, MOTOR.z]), at([72.8, 33.6, PCB_Z]), { via: [at([66, MOTOR.y, MOTOR.z])], tone: "mid" }), 60);
}

// ---------------------------------------------------------------- kap (in de tekening opgetild)
function cover() {
  const ring = k.ringOf(BODY, 10);
  const jaw = clipX(ring, KERF[0], true);
  const main = clipX(ring, KERF[1], false);
  const H = T - BASE;
  const out = [];
  out.push(S(k.extrude(jaw, BASE, H, P, { bevel: 0.5 }), { tone: "hi", inner: Ln(k.ringSeam(jaw, 24, P) + k.ringSeam(jaw, 15, P), { tone: "faint" }) }));
  // pijl op de neusklep: de looprichting van het label
  out.push(Ln(k.onTop([[4.4, 13], [7.6, 13], [6, 17]], T, P, true) + k.onTop([[4.4, 20], [7.6, 20], [6, 24]], T, P, true), { tone: "mid" }));
  const grip = k.sideTicks(40, 97, 2.85, 1000, W, 24, [9, 9], P);
  out.push(S(k.extrude(main, BASE, H, P, { bevel: 0.5 }), { tone: "hi", inner: Ln(k.ringSeam(main, 24, P) + k.ringSeam(main, 15, P), { tone: "faint" }) + Ln(grip.minor + grip.major, { tone: "faint" }) }));
  // USB-C opening in de staart
  out.push(Ln(rectOn(L, 24.6, 33.6, PCB_Z + 0.2, PCB_Z + 3.2, "x"), { tone: "mid" }));
  // display
  out.push(Ln(k.planOutline(OLED, T, P, 4), { tone: "mid" }) + Ln(k.planOutline(k.insetPlan(OLED, 1.1), T, P, 4), { tone: "faint" }));
  out.push(`<text class="pp-oled" data-oled="code" transform="${k.topMatrix([OLED.x + 2.6, OLED.y + 7.4], T, P, "x")}" font-size="5">${codeOf(FIRST)}</text>`);
  out.push(`<text class="pp-oled pp-oled-sub" data-oled="count" transform="${k.topMatrix([OLED.x + 2.6, OLED.y + 11.3], T, P, "x")}" font-size="2.6">${FIRST} / ${TOTAL}</text>`);
  // printknop en lampje
  out.push(cyl(BUTTON[0], BUTTON[1], 4.3, T, 1, { steps: 32, tone: "hi", bevel: 0.3 }) + Ln(k.ring(BUTTON[0], BUTTON[1], 2.6, T + 1, P, 24), { tone: "mid" }));
  out.push(Ln(k.ring(104, 12, 1.1, T, P, 12), { tone: "mid" }) + D([at([104, 12, T])], { size: 0.8, tone: "hi" }));
  out.push(D([[118, 6], [118, 32], [24, 6], [24, 32]].map(([x, y]) => at([x, y, T])), { size: 0.5 }) + Ln([[118, 6], [118, 32], [24, 6], [24, 32]].map(([x, y]) => k.ring(x, y, 1.2, T, P, 12)).join(""), { tone: "lo" }));
  return out.join("");
}

// ---------------------------------------------------------------- het label dat door de neus loopt
function label(id) {
  const plan = { x: LABEL.x, y: 0, w: LABEL.t, d: LABEL.len, r: 0.25 };
  const face = LABEL.x + LABEL.t;
  const slots = rectOn(face, 3, 8, LABEL.z + 3.5, LABEL.z + 6.5, "x") + rectOn(face, 52, 57, LABEL.z + 3.5, LABEL.z + 6.5, "x");
  const text = `<g clip-path="url(#${id}-printed)"><g data-move><text class="pp-label-text" data-label-text transform="${k.sideMatrix([face, 49, 0], LABEL.z + 3.2, P, "right")}" font-size="5">${codeOf(FIRST)}</text></g></g>`;
  return `<g data-move>${S(k.slabOf(plan, LABEL.z, LABEL.h, P, 2), { tone: "hi", className: "pp-label" })}${Ln(slots, { tone: "hi", className: "pp-label-line" })}</g>${text}`;
}

nose(); head(); cassette(); drive(); power();
items.sort((a, b) => a.key - b.key);

const sx = (y) => at([LABEL.x + LABEL.t, y, 0])[0];
const VY = k.axisVector(P, [0, 1, 0]);
const START = 10;
const moveOf = (dy) => `translate(${(VY[0] * dy).toFixed(2)} ${(VY[1] * dy).toFixed(2)})`;
// alles aan de neuskant van het label komt eerst, de rest erna
const before = items.filter((i) => i.x < LABEL.x).map((i) => i.svg).join("");
const after = items.filter((i) => i.x >= LABEL.x).map((i) => i.svg).join("");

function figure(open) {
  const id = open ? "ppo" : "ppc";
  const lab = label(id).replaceAll("data-move", `data-move transform="${moveOf(START)}"`);
  const defs = `<defs>
<clipPath id="${id}-far"><rect x="${sx(0).toFixed(1)}" y="-200" width="2000" height="2000"/></clipPath>
<clipPath id="${id}-mid"><rect x="${sx(W).toFixed(1)}" y="-200" width="${(sx(0) - sx(W)).toFixed(1)}" height="2000"/></clipPath>
<clipPath id="${id}-near"><rect x="-2000" y="-200" width="${(sx(W) + 2000).toFixed(1)}" height="2000"/></clipPath>
<clipPath id="${id}-printed"><rect x="-2000" y="-200" width="${(sx(HEAD_Y) + 2000).toFixed(1)}" height="2000"/></clipPath>
</defs>`;
  const inside = open
    ? [before, `<g clip-path="url(#${id}-mid)">${lab}</g>`, after,
       pin(4, [PLATEN[0], PLATEN[1] + 6, 26.6]), pin(5, [15.85, 19, 24]), pin(6, [SUPPLY[0] + 4.5, SUPPLY[1] + 3, 22.6]), pin(7, [39.5, 33, BASE + 10.4]),
       pin(8, [BATTERY.x0 + 30, BATTERY.y, BATTERY.z + BATTERY.r]), pin(9, [97.5, 26.2, PCB_Z])]
    : [cover(), pin(2, [6, 30.5, T]), pin(3, [55, 14, T])];
  return k.figureSvg({
    width: WIDTH, height: HEIGHT,
    label: open
      ? "De pocketprinter zonder kap. Een geel kabellabel loopt staand door de neus, tussen een aandrukrol en een printkop met inktlint. Daarachter de lintcassette met twee spoelen, de motor met tandwielen, de accu en de printplaat."
      : "De pocketprinter van buiten: een platte staaf met een display en een printknop bovenop. Een geel kabellabel loopt staand door een gleuf dwars door de neus en komt er bedrukt uit.",
    body: [
      defs, chassis(), open ? "" : strip(),
      `<g clip-path="url(#${id}-far)">${lab}</g>`,
      ...inside,
      `<g clip-path="url(#${id}-near)">${lab}</g>`,
      open ? "" : `<g data-pin-follow transform="${moveOf(START)}">${pin(1, [LABEL.x + LABEL.t, 55, LABEL.z + LABEL.h + 2.4])}</g>`,
    ],
  });
}

// ---------------------------------------------------------------- maatschets (bovenaanzicht en zijaanzicht)
function plan2d() {
  const s = 5, ox = 70, oy = 128;                 // px per mm, marge
  const X = (x) => (ox + x * s).toFixed(1), Y = (y) => (oy + y * s).toFixed(1);
  const rect = (x, y, w, h, cls, r = 0) => `<rect class="${cls}" x="${X(x)}" y="${Y(y)}" width="${(w * s).toFixed(1)}" height="${(h * s).toFixed(1)}" rx="${(r * s).toFixed(1)}"/>`;
  const circ = (x, y, r, cls) => `<circle class="${cls}" cx="${X(x)}" cy="${Y(y)}" r="${(r * s).toFixed(1)}"/>`;
  const txt = (x, y, t, cls = "d-t", anchor = "middle") => `<text class="${cls}" x="${X(x)}" y="${Y(y)}" text-anchor="${anchor}">${t}</text>`;
  const dimH = (x0, x1, y, t) => `<path class="d-dim" d="M${X(x0)} ${Y(y)}H${X(x1)}M${X(x0)} ${Y(y - 1.2)}V${Y(y + 1.2)}M${X(x1)} ${Y(y - 1.2)}V${Y(y + 1.2)}"/>${txt((x0 + x1) / 2, y - 1.4, t, "d-n")}`;
  const dimV = (y0, y1, x, t) => `<path class="d-dim" d="M${X(x)} ${Y(y0)}V${Y(y1)}M${X(x - 1.2)} ${Y(y0)}H${X(x + 1.2)}M${X(x - 1.2)} ${Y(y1)}H${X(x + 1.2)}"/><text class="d-n" x="${X(x + 1.6)}" y="${Y((y0 + y1) / 2 + 0.9)}" text-anchor="start">${t}</text>`;
  const top = [
    rect(0, 0, L, W, "d-body", 6),
    `<path class="d-kerf" d="M${X(12)} ${Y(0)}V${Y(W)}"/>`,
    circ(PLATEN[0], PLATEN[1], 4, "d-part"),
    rect(12.75, 15, 4.7, 8, "d-hot"),
    rect(26.5, 2.6, 41.5, 23.8, "d-part", 3),
    circ(SUPPLY[0], SUPPLY[1], 8.6, "d-ink"), circ(TAKEUP[0], TAKEUP[1], 5.2, "d-ink"),
    `<path class="d-ribbon" d="M${X(56)} ${Y(5.9)}L${X(14.8)} ${Y(6.7)}L${X(12.6)} ${Y(9)}V${Y(25.2)}L${X(15.6)} ${Y(27.5)}L${X(36)} ${Y(19.7)}"/>`,
    ...GEARS.map((g) => circ(g.at[0], g.at[1], g.r, "d-part")),
    rect(35, 28, 9, 9.4, "d-part", 0.8), rect(44, 28.1, 16.4, 9.8, "d-part", 2),
    rect(BATTERY.x0, BATTERY.y - 7, BATTERY.len, 14, "d-part", 2),
    rect(PCB.x, PCB.y, PCB.w, PCB.d, "d-part", 1), rect(75, 22, 13.2, 12.5, "d-sub", 0.4), rect(114.6, 24.6, 10.4, 9, "d-sub", 1),
    rect(11.7, -17, 0.6, LABEL.len, "d-label"),
    txt(47, 25.2, "lintcassette", "d-t"), txt(97.5, 12.2, "accu 14500", "d-t"), txt(100, 30.2, "printplaat", "d-t"), txt(52, 34.2, "motor", "d-t"),
    txt(14.5, -12, "label, 60 × 10 mm", "d-t", "start"),
    `<path class="d-arrow" d="M${X(12)} ${Y(-21.5)}V${Y(-18.2)}M${X(11)} ${Y(-19.4)}L${X(12)} ${Y(-18)}L${X(13)} ${Y(-19.4)}"/>`,
    dimH(0, L, W + 5.5, "125"), dimV(0, W, L + 4, "38"),
    txt(30, -3.4, "BOVENAANZICHT, kap eraf", "d-h", "start"),
  ];
  const oz = 58;                                   // zijaanzicht eronder
  const Z = (z) => (oy + (oz + T - z) * s).toFixed(1);
  const rz = (x, z0, z1, w, cls, r = 0) => `<rect class="${cls}" x="${X(x)}" y="${Z(z1)}" width="${(w * s).toFixed(1)}" height="${((z1 - z0) * s).toFixed(1)}" rx="${(r * s).toFixed(1)}"/>`;
  const side = [
    rz(0, 0, T, L, "d-body", 5),
    `<path class="d-dim" d="M${X(0)} ${Z(BASE)}H${X(L)}"/>`,
    `<path class="d-kerf" d="M${X(12)} ${Z(BASE)}V${Z(T)}"/>`,
    rz(11.7, LABEL.z, LABEL.z + LABEL.h, 0.6, "d-label"),
    rz(OLED.x, T - 1.2, T, OLED.w, "d-sub", 0.2), rz(BUTTON[0] - 4.3, T, T + 1, 8.6, "d-part", 0.3),
    rz(L - 0.6, PCB_Z + 0.2, PCB_Z + 3.2, 0.6, "d-sub"),
    `<text class="d-t" x="${X(OLED.x + OLED.w / 2)}" y="${Z(T + 2.2)}" text-anchor="middle">display</text>`,
    `<text class="d-t" x="${X(BUTTON[0])}" y="${Z(T + 3)}" text-anchor="middle">printknop</text>`,
    `<text class="d-t" x="${X(16)}" y="${Z(15)}" text-anchor="start">gleuf, label staat op zijn kant</text>`,
    `<text class="d-t" x="${X(L - 2)}" y="${Z(13.5)}" text-anchor="end">USB-C</text>`,
    `<path class="d-dim" d="M${X(L + 4)} ${Z(0)}V${Z(T)}M${X(L + 2.8)} ${Z(0)}H${X(L + 5.2)}M${X(L + 2.8)} ${Z(T)}H${X(L + 5.2)}"/><text class="d-n" x="${X(L + 5.6)}" y="${Z(T / 2 - 0.9)}" text-anchor="start">30</text>`,
    `<text class="d-h" x="${X(30)}" y="${Z(T + 5.4)}" text-anchor="start">ZIJAANZICHT, kap erop</text>`,
  ];
  return `<svg class="d-svg" viewBox="0 0 800 ${Math.round(oy + (oz + T) * s + 24)}" role="img" aria-label="Maatschets: bovenaanzicht en zijaanzicht van de pocketprinter, 125 bij 38 bij 30 millimeter">${top.join("")}${side.join("")}</svg>`;
}

// ---------------------------------------------------------------- formaatvergelijking
function compare() {
  const s = 1.9, base = 236, gap = 26;
  const things = [
    { name: "Kabellabel", size: "60 × 10 mm", w: 60, h: 10, cls: "d-label", r: 1 },
    { name: "Pocketprinter (concept)", size: "125 × 38 × 30 mm · 143 cm³", w: L, h: W, cls: "d-me", r: 6 },
    { name: "Niimbot B18", size: "137 × 90 × 37 mm · 456 cm³", w: 137, h: 90, cls: "d-other", r: 8 },
    { name: "Brady M211", size: "137 × 102 × 66 mm · 920 cm³", w: 137, h: 102, cls: "d-other", r: 8 },
  ];
  let x = 14;
  const out = things.map((t) => {
    const g = `<rect class="${t.cls}" x="${x.toFixed(1)}" y="${(base - t.h * s).toFixed(1)}" width="${(t.w * s).toFixed(1)}" height="${(t.h * s).toFixed(1)}" rx="${(t.r * s).toFixed(1)}"/><text class="d-cn" x="${x.toFixed(1)}" y="${base + 18}">${t.name}</text><text class="d-cs" x="${x.toFixed(1)}" y="${base + 33}">${t.size}</text>`;
    x += t.w * s + gap;
    return g;
  });
  return `<svg class="d-svg" viewBox="0 0 ${Math.ceil(x)} ${base + 44}" role="img" aria-label="Formaatvergelijking van de bovenkant: kabellabel, pocketprinter, Niimbot B18 en Brady M211 op dezelfde schaal">${out.join("")}</svg>`;
}

// ---------------------------------------------------------------- pagina
const plateOut = k.plateHtml({
  fig: "Fig 1", title: "Buitenkant", hint: "Label loopt op ware snelheid", readout: `${codeOf(FIRST)} · 15 mm/s`,
  body: `<div class="iso-stage">${figure(false)}</div>`,
});
const plateIn = k.plateHtml({
  fig: "Fig 2", title: "Binnenwerk, kap eraf", hint: "Zelfde schaal als fig 1", readout: `${codeOf(FIRST)} · 15 mm/s`,
  body: `<div class="iso-stage">${figure(true)}</div>`,
});

const live = `
const VY = ${JSON.stringify(VY)};
const SPEED = ${SPEED}, TRAVEL = ${JSON.stringify(TRAVEL)}, HEAD_Y = ${HEAD_Y}, LEN = ${LABEL.len}, TOTAL = ${TOTAL}, FIRST = ${FIRST}, START = ${START};
const stages = [...document.querySelectorAll(".iso-stage")];
const movers = document.querySelectorAll("[data-move],[data-pin-follow]");
const texts = document.querySelectorAll("[data-label-text]");
const oledCode = document.querySelector('[data-oled="code"]'), oledCount = document.querySelector('[data-oled="count"]');
const readouts = document.querySelectorAll("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const codeOf = (n) => "W1-L2-" + String(n).padStart(3, "0");
let n = FIRST, dy = START, phase = "feed", wait = 0, frame = 0, last = 0;
const seen = new Set();
function draw() {
  const move = "translate(" + (VY[0] * dy).toFixed(2) + " " + (VY[1] * dy).toFixed(2) + ")";
  movers.forEach((el) => el.setAttribute("transform", move));
  const done = Math.max(0, Math.min(LEN, dy + LEN - HEAD_Y));
  const text = phase === "insert" ? codeOf(n) + " · label erin, sensor ziet het" : phase === "out" ? codeOf(n) + " · klaar na " + (LEN / SPEED).toFixed(0) + " s" : codeOf(n) + " · " + done.toFixed(0) + " van " + LEN + " mm · " + SPEED + " mm/s";
  readouts.forEach((el) => { if (el.textContent !== text) el.textContent = text; });
}
function setLabel() {
  texts.forEach((el) => (el.textContent = codeOf(n)));
  oledCode.textContent = codeOf(n);
  oledCount.textContent = n + " / " + TOTAL;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (phase === "insert") { wait += dt; if (wait > 0.9) { phase = "feed"; wait = 0; } }
  else if (phase === "feed") { dy += SPEED * dt; if (dy >= TRAVEL[1]) { dy = TRAVEL[1]; phase = "out"; wait = 0; } }
  else { wait += dt; if (wait > 1.4) { n = n >= TOTAL ? 1 : n + 1; setLabel(); dy = TRAVEL[0]; phase = "insert"; wait = 0; } }
  draw();
  frame = seen.size && !still.matches ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && seen.size && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
const watcher = new IntersectionObserver((entries) => { entries.forEach((entry) => (entry.isIntersecting ? seen.add(entry.target) : seen.delete(entry.target))); run(); }, { rootMargin: "120px 0px" });
stages.forEach((stage) => watcher.observe(stage));
stages.forEach((stage) => { stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) * 0.55; });
document.querySelectorAll(".sheet").forEach((sheet) => { sheet.scrollLeft = 0; });
still.addEventListener("change", run);
document.querySelectorAll(".parts li[data-n]").forEach((li) => {
  const pins = document.querySelectorAll('[data-pin="' + li.dataset.n + '"]');
  const on = (state) => () => { pins.forEach((el) => el.toggleAttribute("data-on", state)); li.toggleAttribute("data-on", state); };
  li.addEventListener("pointerenter", on(true)); li.addEventListener("pointerleave", on(false));
  li.addEventListener("focus", on(true)); li.addEventListener("blur", on(false));
});
draw();
`;

const kitCss = k.ISO_CSS.replace(/\.iso\{[^}]*\}/, "").replace(/\.iso\[data-theme="light"\]\{[^}]*\}/, "");
const css = readCss();
function readCss() {
  return `
/* Layout: één kolom van 880 px; de tekening is de held, daaronder onderdelenlijst, stappen, maatschets en keuzes. */
:root{
  --bg:#f1f2ee;--surface:#fbfbf9;--ink:#17181a;--text:#4c4e52;--muted:#85878c;--rule:#d6d7d2;--accent:#f2c200;--accent-ink:#1b1600;--accent-deep:#8a6d00;
  --font-display:"IBM Plex Sans Condensed","IBM Plex Sans",system-ui,sans-serif;--font-body:"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif;--font-mono:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace;
  --label-top:#f6ca14;--label-side:#d6a800;--label-edge:#5c4700;--label-ink:#141000;
  --ink-top:#4b4c52;--ink-side:#33343a;--rubber-top:#55565b;--rubber-side:#3d3e43;--pcb-top:#eef0ea;
  --anatomy-page:#f1f2ee;--anatomy-card:#fbfbf9;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;
  --anatomy-paper:#fbfbf9;--anatomy-face:#ffffff;--anatomy-top:#ffffff;
  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;
  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;
  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;
  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;
  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;
  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);--anatomy-mono:var(--font-mono);
  --anatomy-lift:none;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --bg:#0e0f0f;--surface:#151616;--ink:#ececea;--text:#a9aaa6;--muted:#72736f;--rule:#2b2c2b;--accent:#f2c200;--accent-ink:#1b1600;--accent-deep:#f2c200;
  --label-top:#eec210;--label-side:#c79b00;--label-edge:#3d2f00;--label-ink:#141000;
  --ink-top:#0a0a0a;--ink-side:#050505;--rubber-top:#232324;--rubber-side:#19191a;--pcb-top:#1a1c1a;
  --anatomy-page:#0e0f0f;--anatomy-card:#151616;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;
  --anatomy-paper:#151616;--anatomy-face:#1d1e1e;--anatomy-top:#1e1f1f;
  --anatomy-shade-0:#101111;--anatomy-shade-1:#131414;--anatomy-shade-2:#171818;--anatomy-shade-3:#1a1b1b;
  --anatomy-lit-top:#2a2b2b;--anatomy-lit-shade:#202121;
  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;
  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;
  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;color-scheme:dark}}
:root[data-theme="dark"]{
  --bg:#0e0f0f;--surface:#151616;--ink:#ececea;--text:#a9aaa6;--muted:#72736f;--rule:#2b2c2b;--accent:#f2c200;--accent-ink:#1b1600;--accent-deep:#f2c200;
  --label-top:#eec210;--label-side:#c79b00;--label-edge:#3d2f00;--label-ink:#141000;
  --ink-top:#0a0a0a;--ink-side:#050505;--rubber-top:#232324;--rubber-side:#19191a;--pcb-top:#1a1c1a;
  --anatomy-page:#0e0f0f;--anatomy-card:#151616;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;
  --anatomy-paper:#151616;--anatomy-face:#1d1e1e;--anatomy-top:#1e1f1f;
  --anatomy-shade-0:#101111;--anatomy-shade-1:#131414;--anatomy-shade-2:#171818;--anatomy-shade-3:#1a1b1b;
  --anatomy-lit-top:#2a2b2b;--anatomy-lit-shade:#202121;
  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;
  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;
  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--text);font:16px/1.6 var(--font-body);-webkit-font-smoothing:antialiased}
.wrap{max-width:880px;margin:0 auto;padding-block:44px 80px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:flex;flex-direction:column;gap:44px}
header{display:flex;flex-direction:column;gap:14px}
.eyebrow{font:500 12px/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.chip{background:var(--accent);color:var(--accent-ink);padding:5px 8px;font-weight:600}
h1{font:600 clamp(34px,6vw,54px)/1.02 var(--font-display);letter-spacing:-.01em;color:var(--ink);margin:0;text-wrap:balance}
.lede{font-size:18px;line-height:1.55;max-width:62ch;margin:0;color:var(--text)}
h2{font:600 24px/1.2 var(--font-display);color:var(--ink);margin:0 0 14px;text-wrap:balance}
p{margin:0;max-width:66ch}
section{display:flex;flex-direction:column;gap:14px;min-width:0}
.specs{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));border-top:1px solid var(--rule);border-left:1px solid var(--rule);margin:0}
.specs div{padding:12px 14px;border-right:1px solid var(--rule);border-bottom:1px solid var(--rule);min-width:0}
.specs dt{font:500 11px/1.3 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.specs dd{margin:4px 0 0;font:600 18px/1.25 var(--font-display);color:var(--ink);font-variant-numeric:tabular-nums}
.specs small{display:block;font:400 12px/1.35 var(--font-body);color:var(--muted);margin-top:2px}
.iso-figure{margin:0}
.iso-plate{padding:46px 12px 44px}
.iso-stage{overflow-x:auto}
.iso-stage .iso-svg{min-width:620px}
.pp-label>.iso-fill,.pp-label>.iso-top{fill:var(--label-top)}
.pp-label>.iso-shade{fill:var(--label-side)}
.pp-label>.iso-edge,.pp-label>.iso-crease,.iso-line.pp-label-line{stroke:var(--label-edge)}
.pp-label-text{fill:var(--label-ink);font:600 5px var(--font-mono);letter-spacing:.02em}
.pp-ink>.iso-fill,.pp-ink>.iso-shade{fill:var(--ink-side)}
.pp-ink>.iso-top{fill:var(--ink-top)}
.pp-film>.iso-fill{fill:var(--ink-side);fill-opacity:.82}
.pp-film>.iso-shade,.pp-film>.iso-top{fill:var(--ink-top);fill-opacity:.5}
.pp-rubber>.iso-fill,.pp-rubber>.iso-shade{fill:var(--rubber-side)}
.pp-rubber>.iso-top{fill:var(--rubber-top)}
.pp-pcb>.iso-top{fill:var(--pcb-top)}
.pp-oled{fill:var(--anatomy-hi);font-family:var(--font-mono);font-weight:600;letter-spacing:.02em}
.pp-oled-sub{fill:var(--anatomy-mid);font-weight:500}
.pp-pin circle{fill:var(--accent);stroke:var(--accent-ink);stroke-width:.8;transition:r .15s}
.pp-pin text{fill:var(--accent-ink);font:700 8.5px var(--font-mono)}
.pp-pin[data-on] circle{r:10.5;stroke-width:1.6}



.parts li:focus-visible{outline:2px solid var(--accent-deep);outline-offset:2px}
.note{font-size:13px;color:var(--muted)}
.parts{list-style:none;margin:6px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:0 28px}
.parts li{display:grid;grid-template-columns:26px 1fr;gap:10px;padding:10px 0;border-bottom:1px solid var(--rule);font-size:14.5px;line-height:1.45;min-width:0}
.parts li b{color:var(--ink);font-weight:600}
.parts .n{width:24px;height:24px;border-radius:50%;background:var(--accent);color:var(--accent-ink);font:700 12px/24px var(--font-mono);text-align:center}
.parts li[data-on] .n{outline:2px solid var(--ink);outline-offset:1px}
.steps{margin:0;padding:0;list-style:none;counter-reset:stap;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:16px}
.steps li{counter-increment:stap;border-top:3px solid var(--accent);padding-top:10px;font-size:14.5px;line-height:1.5;min-width:0}
.steps li::before{content:"Stap " counter(stap);display:block;font:500 11px/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
.steps b{display:block;color:var(--ink);font:600 17px/1.25 var(--font-display);margin-bottom:4px}
.sheet{background:var(--surface);border:1px solid var(--rule);padding:8px;overflow-x:auto}
.d-svg{display:block;width:100%;min-width:640px;height:auto}
.d-body{fill:none;stroke:var(--ink);stroke-width:1.6}
.d-part{fill:none;stroke:var(--muted);stroke-width:1}
.d-sub{fill:none;stroke:var(--muted);stroke-width:.8;stroke-dasharray:3 2.5}
.d-ink{fill:var(--ink);fill-opacity:.82;stroke:none}
.d-hot{fill:var(--ink);stroke:none}
.d-ribbon{fill:none;stroke:var(--ink);stroke-width:1.4}
.d-kerf{stroke:var(--accent-deep);stroke-width:1;stroke-dasharray:4 3;fill:none}
.d-label{fill:var(--label-top);stroke:var(--label-edge);stroke-width:.8}
.d-dim,.d-arrow{fill:none;stroke:var(--muted);stroke-width:.9}
.d-n{fill:var(--ink);font:600 13px var(--font-mono)}
.d-t{fill:var(--text);font:400 11.5px var(--font-body)}
.d-h{fill:var(--muted);font:500 10.5px var(--font-mono);letter-spacing:.1em}
.d-me{fill:var(--accent);fill-opacity:.2;stroke:var(--accent-deep);stroke-width:1.6}
.d-other{fill:none;stroke:var(--muted);stroke-width:1.1}
.d-cn{fill:var(--ink);font:600 13px var(--font-body)}
.d-cs{fill:var(--muted);font:400 11.5px var(--font-mono)}
.two{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px 36px}
.two ul{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:9px;font-size:15px;line-height:1.5}
.two li b{color:var(--ink)}
h3{font:500 12px/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:0 0 10px}
footer{border-top:1px solid var(--rule);padding-top:16px;font-size:13px;color:var(--muted)}
@media (max-width:560px){.iso-plate{padding:44px 8px 64px}}
`;
}

const page = `<title>Pocketprinter conceptschets</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans+Condensed:wght@600&family=IBM+Plex+Sans:wght@400;600&display=swap">
<style>${kitCss}${css}</style>
<div class="wrap">
<header>
  <div class="eyebrow"><span class="chip">Conceptschets</span><span>versie 0.1</span><span>nog geen CAD, nog niet getest</span></div>
  <h1>Pocketprinter voor kabellabels</h1>
  <p class="lede">Een platte staaf van 125 × 38 × 30 mm. Je scheurt een geel kunststof label van de rol, steekt het dwars door de neus en het komt aan de andere kant bedrukt naar buiten. Het label gaat er recht doorheen en hoeft nergens een bocht te maken, want een stug label buigt niet mee.</p>
  <dl class="specs">
    <div><dt>Buitenmaat</dt><dd>125 × 38 × 30 mm</dd><small>143 cm³, past in een binnenzak</small></div>
    <div><dt>Gewicht</dt><dd>± 170 g</dd><small>raming, 135 tot 195 g</small></div>
    <div><dt>Printen</dt><dd>12 mm, 203 dpi</dd><small>thermotransfer met harslint</small></div>
    <div><dt>Snelheid</dt><dd>15 mm/s</dd><small>4 seconden per label van 60 mm</small></div>
    <div><dt>Lint</dt><dd>± 20 m</dd><small>ongeveer 300 labels per cassette</small></div>
    <div><dt>Accu</dt><dd>14500, verwisselbaar</dd><small>raming 200 tot 500 labels</small></div>
  </dl>
</header>

<section>
  ${plateOut}
  ${plateIn}
  <p class="note">Beide tekeningen zijn op schaal. Het label loopt op de echte snelheid door de neus; de tekst verschijnt waar het de printkop passeert.</p>
  <ol class="parts">
    <li data-n="1" tabindex="0"><span class="n">1</span><span><b>Kabellabel, 60 × 10 mm.</b> Stug geel kunststof, los van de rol gescheurd. Staat op zijn kant in de gleuf.</span></li>
    <li data-n="2" tabindex="0"><span class="n">2</span><span><b>Neusklep met gleuf.</b> De gleuf loopt dwars door de neus. De klep scharniert open om het lint te wisselen of een vastgelopen label eruit te halen.</span></li>
    <li data-n="3" tabindex="0"><span class="n">3</span><span><b>Display en printknop.</b> Het display toont de tekst van het volgende label. De telefoon kan in je zak blijven.</span></li>
    <li data-n="4" tabindex="0"><span class="n">4</span><span><b>Aandrukrol.</b> Siliconen rol in de neus. Trekt het label erdoor en drukt het tegen de printkop.</span></li>
    <li data-n="5" tabindex="0"><span class="n">5</span><span><b>Printkop, 12 mm.</b> Verend opgehangen, zodat hij vlak op een stug label blijft liggen. Het inktlint loopt ertussendoor.</span></li>
    <li data-n="6" tabindex="0"><span class="n">6</span><span><b>Lintcassette.</b> Voorraadspoel en opwikkelspoel met ± 20 m harslint. Als één geheel te wisselen.</span></li>
    <li data-n="7" tabindex="0"><span class="n">7</span><span><b>Motor met tandwielen.</b> Eén motortje drijft via een worm de aandrukrol aan en wikkelt het gebruikte lint op.</span></li>
    <li data-n="8" tabindex="0"><span class="n">8</span><span><b>Accu, type 14500.</b> Zelfde formaat als een AA-batterij. Door de gebruiker te verwisselen; dat wordt in de EU verplicht vanaf februari 2027.</span></li>
    <li data-n="9" tabindex="0"><span class="n">9</span><span><b>Printplaat.</b> Bluetooth-module, lader, buffercondensator voor de piekstroom van de printkop, en USB-C in de staart.</span></li>
  </ol>
</section>

<section>
  <h2>Zo gebruik je hem</h2>
  <ol class="steps">
    <li><b>Lijst klaarzetten</b>Je laadt de kabellijst in de app, of typt een begincode met oplopend nummer. De printer onthoudt de lijst.</li>
    <li><b>Label afscheuren</b>Je scheurt één label van de rol. De rol zelf blijft in je zak of gereedschapstas.</li>
    <li><b>Insteken</b>Je steekt het label in de gleuf. De sensor ziet het, de rol pakt het vast en het print vanzelf de volgende code.</li>
    <li><b>Vastzetten</b>Na vier seconden komt het label er aan de andere kant uit. Twee tiewraps erdoor en klaar.</li>
  </ol>
</section>

<section>
  <h2>Maatschets</h2>
  <div class="sheet">${plan2d()}</div>
  <p class="note">Maten in millimeter. De buitenmaat volgt uit de volumeraming in het onderzoek; de plaatsing van de onderdelen binnenin is mijn eerste indeling en moet in CAD worden nagerekend.</p>
</section>

<section>
  <h2>Hoe klein is dat</h2>
  <div class="sheet">${compare()}</div>
  <p class="note">Bovenkant van elk apparaat op dezelfde schaal. De Niimbot B18 en de Brady M211 zijn de kleinste printers met inktlint die nu te koop zijn; beide hebben de labelrol in het apparaat, en dat maakt ze zo groot.</p>
</section>

<section>
  <h2>Waarom zo, en wat nog open staat</h2>
  <div class="two">
    <div>
      <h3>Ontwerpkeuzes</h3>
      <ul>
        <li><b>Recht pad.</b> Het label is een stug plaatje van ongeveer een halve millimeter. Het gaat in één rechte lijn tussen rol en kop door.</li>
        <li><b>Dwars door de neus.</b> Het label van 60 mm hoeft niet in het apparaat te passen. Het steekt er aan twee kanten uit, dus de printer blijft 38 mm breed.</li>
        <li><b>Geen rol in het apparaat.</b> Een rolhouder is wat bestaande printers groot maakt. Zonder rol blijft alleen het lint over, en dat is dun.</li>
        <li><b>Zelfde techniek als nu.</b> Thermotransfer met harslint, net als de vaste printer. De opdruk is daarmee het minst onzeker.</li>
        <li><b>Uiteinden blijven vrij.</b> De rol heeft grip nodig op het begin en het eind van het label. Daar zitten de tiewrap-sleuven, dus daar hoeft toch geen tekst.</li>
      </ul>
    </div>
    <div>
      <h3>Nog niet bewezen</h3>
      <ul>
        <li><b>De doorvoer.</b> Of een kleine rol een los, stug label recht en zonder slippen langs de kop trekt, moet een proefopstelling laten zien.</li>
        <li><b>De hechting.</b> Of het lint bij deze kleine kop en druk goed op het labelmateriaal hecht, is niet getest.</li>
        <li><b>Het label zelf.</b> Dikte, sleufposities en het exacte materiaal zijn aangenomen. Eerst opmeten met een schuifmaat.</li>
        <li><b>De printkop.</b> Een kop van 12 mm is niet als los catalogusonderdeel gevonden; die komt uit een bestaande printer of van een Chinese fabrikant.</li>
        <li><b>De indeling.</b> Dit is een schets op schaal, geen doorgerekend ontwerp. Wanddiktes, schroefpunten en de lintkoppeling ontbreken nog.</li>
      </ul>
    </div>
  </div>
</section>
<footer>Conceptschets bij het haalbaarheidsonderzoek pocket-kabellabelprinter, 19 november 2026. Getallen met "raming" komen uit het rekenmodel van dat onderzoek en zijn niet gemeten.</footer>
</div>
<script type="module">${live.replace(/<\/(script)/gi, "<\\/$1")}</script>
`;

writeFileSync(join(HERE, "pocketprinter-concept.html"), page);
console.log("wrote pocketprinter-concept.html", (page.length / 1024).toFixed(0) + " KB, scale", P.scale.toFixed(2));
