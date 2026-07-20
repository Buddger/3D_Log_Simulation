import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";

/* =====================================================================
   Forecast-to-Transport Capacity Simulation
   Single-file interactive 3D simulation (React + Three.js r128)
   9 phases: demand → validation → decomposition → MPL → MPM →
   long goods → stacking → TU selection → loading & result
   ===================================================================== */

const C = {
  bg: "#0a1017",
  green: "#34d399", amber: "#fbbf24", red: "#f87171",
  blue: "#60a5fa", purple: "#c084fc", cyan: "#22d3ee",
  text: "#e6edf3", dim: "#8aa0b4",
  panel: "rgba(12,19,27,0.93)", border: "rgba(130,160,190,0.16)",
};
const MAT_COLORS = [0x4f8ef7, 0x34d399, 0xf59e0b, 0xef4444, 0xc084fc, 0x22d3ee, 0x94a3b8];

const DEMANDS = [
  { id: "D-01", mat: "M-1001 Standard Cartoned Goods", short: "M-1001", qty: 1250, lane: "Oberhausen → Vienna", bucket: "CW31 · Tue", mode: "Road", temp: "Ambient", special: "—", color: 0, valid: true },
  { id: "D-02", mat: "M-2002 Pharma Coolpacks", short: "M-2002", qty: 620, lane: "Oberhausen → Vienna", bucket: "CW31 · Tue", mode: "Road", temp: "2–8 °C", special: "Temperature-controlled", color: 5, valid: true },
  { id: "D-03", mat: "M-3003 Precision Sensors", short: "M-3003", qty: 340, lane: "Nuremberg → Paris", bucket: "CW31 · Wed", mode: "Air", temp: "Ambient", special: "Air-freight mandatory", color: 4, valid: true },
  { id: "D-04", mat: "M-4004 Steel Fittings", short: "M-4004", qty: 900, lane: "Oberhausen → Zurich", bucket: "CW31 · Thu", mode: "Road", temp: "Ambient", special: "Heavy · 620 kg/pallet", color: 3, valid: true },
  { id: "D-05", mat: "M-5005 Panel Elements", short: "M-5005", qty: 260, lane: "Oberhausen → Zurich", bucket: "CW31 · Thu", mode: "Road", temp: "Ambient", special: "Overhanging (120 mm)", color: 1, valid: true },
  { id: "D-06", mat: "M-6006 Aluminium Profiles 4.2 m", short: "M-6006", qty: 180, lane: "Nuremberg → Paris", bucket: "CW31 · Wed", mode: "Road", temp: "Ambient", special: "Long goods", color: 2, valid: true },
  { id: "D-07", mat: "M-7007 Spare Kits", short: "M-7007", qty: 95, lane: "Oberhausen → Vienna", bucket: "CW31 · Tue", mode: "Road", temp: "Ambient", special: "—", color: 6, valid: false, issue: "Missing layer UOM · missing material height · missing stackability indicator" },
];

const PHASES = [
  { n: 1, name: "Normalized Demand", zone: "Forecast Input", cam: [-62, 15, 24], tgt: [-62, 2.5, 0],
    info: "Forecast demand is grouped into compatible planning buckets before packaging and transport-capacity calculation begins — by source, destination, departure bucket, material, transport-unit mode, temperature requirement and special-goods characteristics." },
  { n: 2, name: "Master Data Validation", zone: "Validation Gate", cam: [-45, 14, 23], tgt: [-45, 3, 0],
    info: "The heuristic requires complete master data before quantities can be converted into logistics building blocks: units of measure (EPF/UPF, EPL/UPL, CAR, PAC), handling-unit type, lane & TU assignment, dimensions, weight, temperature requirement, stackability, overhang and long-goods rules." },
  { n: 3, name: "Quantity Decomposition", zone: "Decomposition", cam: [-26, 16, 26], tgt: [-26, 2, 0],
    info: "Each demand quantity is split in strict sequence: full homogeneous pallets (EPF/UPF) → homogeneous layers (EPL/UPL) → cartons (CAR) → loose sales packs (PAC). The remaining quantity shrinks after every step." },
  { n: 4, name: "Building Mixed Layer Pallets (MPL)", zone: "MPL Builder", cam: [-8, 12, 20], tgt: [-8, 3, 0],
    info: "MPL represents a mixed pallet built from complete homogeneous material layers. Layers are sorted (overhang ↓, length ↓, width ↓, weight ↓) and added to an existing MPL only when source, destination, bucket, TU mode, temperature, overhang, height and weight are compatible — otherwise a new MPL is created." },
  { n: 5, name: "Building MPM Mixed Pallets", zone: "MPM Builder", cam: [7, 12, 20], tgt: [7, 3, 0],
    info: "MPM represents a mixed pallet built from cartons and loose goods using a volume-based height estimation: sum item volume → apply DispersionFactorMP → convert to theoretical height → apply MinimumHeightLayerLL → check MaxMPHeight & MaxMPWeight → split into additional pallets when a limit is exceeded." },
  { n: 6, name: "Long-Goods Handling", zone: "Long-Goods Lane", cam: [-2, 13, 38], tgt: [-2, 2, 17],
    info: "Long goods follow dedicated palletization and loading rules because they do not fit standard pallet footprints. They are grouped by length, width, weight, destination, bucket and mode. Overlong pallets (type MPG) are treated as non-stackable and require dedicated transport-unit compatibility." },
  { n: 7, name: "Pallet Stacking", zone: "Stack Builder", cam: [23, 13, 22], tgt: [23, 3, 0],
    info: "Pallets are converted into transport-ready stacks based on physical and operational compatibility: max stack height & weight, max weight on first pallet, load-bearing capacity, stackability indicator, goods-allowed-on-top, TU inner height, width compatibility, loading margin. Air freight: one pallet = one stack." },
  { n: 8, name: "Transport-Unit Selection", zone: "TU Selection", cam: [40, 14, 25], tgt: [40, 3, 0],
    info: "The algorithm walks the lane-specific TU priority list starting with the lowest sequence and checks: TU mode, temperature, inner length/width/height, volume & weight capacity, lane max weight, loading margin, stack footprint, long-goods and air-freight compatibility. Incompatible units are rejected until a match is found." },
  { n: 9, name: "Loading & Capacity Result", zone: "Loading / Result", cam: [58, 16, 27], tgt: [58, 3, 0],
    info: "Stacks are loaded onto visible floor positions inside semi-transparent transport units. When a unit reaches a floor-space, volume or weight constraint, it is closed and an additional unit is created. The result shows utilization, warnings and full planning transparency." },
];

const SUMMARY = {
  forecastQty: 3645, materials: 7, fullPallets: 6, layers: 7, cartons: 11, loosePacks: 15,
  mpl: 2, mpm: 3, mpg: 2, totalPallets: 13, totalStacks: 10, totalTUs: 3,
  volUtil: 71, weightUtil: 55, floorUtil: 74, warnings: 4, mdIssues: 1,
  tus: [
    { id: "TU 1", type: "Standard Trailer", stacks: 5, pallets: 8, floor: 92, vol: 84, weight: 61, status: "Fully planned — closed on floor-space limit", color: C.cyan },
    { id: "TU 2", type: "Temperature-Controlled Trailer", stacks: 2, pallets: 3, floor: 54, vol: 47, weight: 43, status: "Temperature-controlled load", color: C.blue },
    { id: "TU 3", type: "Long-Goods Trailer", stacks: 2, pallets: 2, floor: 48, vol: 39, weight: 35, status: "Dedicated long-goods unit", color: C.amber },
  ],
  insights: [
    "Full-pallet conversion reduced mixed-pallet demand: 2,780 of 3,645 units left the flow as homogeneous full pallets.",
    "One additional MPL pallet was created due to overhang incompatibility of M-5005 layers.",
    "Loose-item volume exceeded MaxMPWeight once — the MPM builder split the load into two mixed pallets.",
    "One temperature-controlled TU was required for the Oberhausen → Vienna pharma demand.",
    "Long goods (M-6006) could not be combined with standard pallet stacks and triggered a dedicated MPG trailer.",
    "TU 1 was closed by floor-space utilization (92%), not by weight (61%).",
    "One demand record (D-07) requires master-data correction before it can be planned.",
  ],
};

/* --------------------------- 3D helpers --------------------------- */
function makeLabel(text, opts = {}) {
  const { size = 40, color = "#e6edf3", bg = "rgba(10,16,23,0.78)", pad = 16 } = opts;
  const cv = document.createElement("canvas");
  let ctx = cv.getContext("2d");
  ctx.font = "600 " + size + "px 'Segoe UI', system-ui, sans-serif";
  const w = Math.min(900, ctx.measureText(text).width) + pad * 2;
  cv.width = w; cv.height = size + pad * 2;
  ctx = cv.getContext("2d");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.font = "600 " + size + "px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = color; ctx.textBaseline = "middle";
  ctx.fillText(text, pad, cv.height / 2, 900);
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  const s = 0.011;
  sp.scale.set(cv.width * s, cv.height * s, 1);
  return sp;
}
function palletBase() {
  const g = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: 0x8a6a45 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1.6), wood);
  deck.position.y = 0.28; g.add(deck);
  for (let i = -1; i <= 1; i++) {
    const blk = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 1.6), wood);
    blk.position.set(i, 0.11, 0); g.add(blk);
  }
  return g;
}
function edged(mesh, color = 0x0b1220) {
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color }));
  e.position.copy(mesh.position); e.rotation.copy(mesh.rotation);
  return e;
}
function fullPallet(ci) {
  const g = palletBase();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.5, 1.5), new THREE.MeshLambertMaterial({ color: MAT_COLORS[ci] }));
  body.position.y = 1.09; g.add(body); g.add(edged(body));
  return g;
}
function layerUnit(ci, overhang = false) {
  const g = new THREE.Group();
  const w = overhang ? 2.7 : 2.3;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.42, 1.5), new THREE.MeshLambertMaterial({ color: MAT_COLORS[ci] }));
  m.position.y = 0.21; g.add(m); g.add(edged(m));
  return g;
}
function mplPallet(cis, overhangTop = false) {
  const g = palletBase();
  cis.forEach((ci, i) => {
    const w = overhangTop && i === cis.length - 1 ? 2.7 : 2.3;
    const l = new THREE.Mesh(new THREE.BoxGeometry(w, 0.42, 1.5), new THREE.MeshLambertMaterial({ color: MAT_COLORS[ci] }));
    l.position.y = 0.55 + i * 0.46; g.add(l); g.add(edged(l));
  });
  return g;
}
function mpmPallet(cis, h = 1.4, seed = 1) {
  const g = palletBase();
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return (s % 1000) / 1000; };
  for (let n = 0; n < 8; n++) {
    const ci = cis[n % cis.length];
    const bw = 0.5 + rnd() * 0.4, bh = 0.3 + rnd() * 0.25, bd = 0.4 + rnd() * 0.3;
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), new THREE.MeshLambertMaterial({ color: MAT_COLORS[ci] }));
    let y = 0.34 + bh / 2 + (n > 3 ? 0.35 + rnd() * 0.5 : 0);
    if (y + bh / 2 > 0.34 + h) y = 0.34 + h - bh / 2;
    b.position.set(-0.7 + rnd() * 1.4, y, -0.4 + rnd() * 0.8);
    g.add(b); g.add(edged(b));
  }
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.35, h, 1.55), new THREE.MeshLambertMaterial({ color: 0xc084fc, transparent: true, opacity: 0.12 }));
  frame.position.y = 0.34 + h / 2; g.add(frame);
  const fe = edged(frame, 0xc084fc); fe.material.transparent = true; fe.material.opacity = 0.75; g.add(fe);
  return g;
}
function longCarrier(ci) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.25, 1.2), new THREE.MeshLambertMaterial({ color: 0x64748b }));
  base.position.y = 0.13; g.add(base); g.add(edged(base, 0x94a3b8));
  for (let i = 0; i < 5; i++) {
    const rod = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.15, 0.15), new THREE.MeshLambertMaterial({ color: MAT_COLORS[ci] }));
    rod.position.set(0, 0.34 + Math.floor(i / 3) * 0.2, -0.35 + (i % 3) * 0.35);
    g.add(rod);
  }
  return g;
}
function cartonBox(ci, s = 0.7) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.75, s * 0.85), new THREE.MeshLambertMaterial({ color: MAT_COLORS[ci] }));
  m.position.y = s * 0.375; g.add(m); g.add(edged(m));
  return g;
}
function truckUnit(kind) {
  const g = new THREE.Group();
  const cfg = {
    box:      { L: 6,  H: 2.6, W: 2.8, col: 0xa3e635 },
    standard: { L: 10, H: 3.2, W: 3.0, col: 0x9aa7b5 },
    highcube: { L: 10, H: 3.9, W: 3.0, col: 0x7dd3fc },
    temp:     { L: 10, H: 3.2, W: 3.0, col: 0x60a5fa },
    air:      { L: 6.5,H: 2.9, W: 2.9, col: 0xc4b5fd },
    long:     { L: 12, H: 3.1, W: 3.0, col: 0xfbbf24 },
  }[kind];
  const body = new THREE.Mesh(new THREE.BoxGeometry(cfg.L, cfg.H, cfg.W),
    new THREE.MeshLambertMaterial({ color: cfg.col, transparent: true, opacity: 0.18, depthWrite: false }));
  body.position.set(0, cfg.H / 2 + 0.75, 0); g.add(body);
  const be = edged(body, cfg.col); g.add(be);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(cfg.L, 0.14, cfg.W), new THREE.MeshLambertMaterial({ color: 0x334155 }));
  floor.position.set(0, 0.75, 0); g.add(floor);
  const gm = new THREE.LineBasicMaterial({ color: 0x7b8ba0, transparent: true, opacity: 0.55 });
  for (let x = -cfg.L / 2 + 2.4; x < cfg.L / 2 - 0.5; x += 2.7) {
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, 0.84, -cfg.W / 2), new THREE.Vector3(x, 0.84, cfg.W / 2)]), gm));
  }
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.1, cfg.W * 0.92), new THREE.MeshLambertMaterial({ color: 0x475569 }));
  cab.position.set(-cfg.L / 2 - 1.05, 1.8, 0); g.add(cab); g.add(edged(cab, 0x64748b));
  [[-cfg.L / 2 + 1.4], [cfg.L / 2 - 1.4], [-cfg.L / 2 - 1.05]].forEach(([wx]) => {
    [-cfg.W / 2, cfg.W / 2].forEach((wz) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.28, 12), new THREE.MeshLambertMaterial({ color: 0x1f2937 }));
      wheel.rotation.x = Math.PI / 2; wheel.position.set(wx, 0.48, wz); g.add(wheel);
    });
  });
  g.userData.dims = cfg;
  return g;
}
function stackBracket(h, col = 0x22d3ee) {
  const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.9, h, 2.0)),
    new THREE.LineBasicMaterial({ color: col }));
  box.position.y = h / 2;
  return box;
}
function ring(colorHex, r = 1.9) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.16, 40),
    new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.03;
  return m;
}
function conveyorSeg(len, x, z, rotY = 0) {
  const g = new THREE.Group();
  const belt = new THREE.Mesh(new THREE.BoxGeometry(len, 0.18, 1.7), new THREE.MeshLambertMaterial({ color: 0x243244 }));
  belt.position.y = 0.5; g.add(belt); g.add(edged(belt, 0x39506b));
  for (let i = -len / 2 + 0.8; i < len / 2; i += 2) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 1.5), new THREE.MeshLambertMaterial({ color: 0x18222f }));
    leg.position.set(i, 0.25, 0); g.add(leg);
  }
  g.position.set(x, 0, z); g.rotation.y = rotY;
  return g;
}
function floorArrow(x, z) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.8); shape.lineTo(1.5, 0); shape.lineTo(0, -0.8); shape.lineTo(0.45, 0); shape.closePath();
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: 0x33506e, transparent: true, opacity: 0.9 }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = 0; m.position.set(x, 0.02, z);
  return m;
}

/* ============================ component ============================ */
export default function ForecastToTransportSim() {
  const mountRef = useRef(null);
  const threeRef = useRef(null);          // { scene, camera, renderer, dynamic, tweens, pulses }
  const camRef = useRef({ target: new THREE.Vector3(0, 3, 0), theta: 0.9, phi: 1.05, dist: 95, anim: null });
  const builtRef = useRef(-1);            // highest phase index already built
  const phaseRef = useRef(-1);
  const playRef = useRef(false);
  const speedRef = useRef(1);
  const autoCamRef = useRef(true);
  const timerRef = useRef(0);
  const logSeq = useRef(0);

  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [autoCam, setAutoCam] = useState(true);
  const [selected, setSelected] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showLog, setShowLog] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showDash, setShowDash] = useState(false);
  const [webglOk, setWebglOk] = useState(true);

  const addLog = useCallback((text, kind = "info") => {
    logSeq.current += 1;
    const step = logSeq.current;
    setLogs((l) => [...l, { step, text, kind }]);
  }, []);

  /* ------------------------- tween helpers ------------------------- */
  const tween = useCallback((vec, to, dur = 0.9, delay = 0, ease = "out") => {
    const t3 = threeRef.current; if (!t3) return;
    t3.tweens.push({ vec, from: vec.clone(), to: new THREE.Vector3(to[0], to[1], to[2]), dur, delay, t: 0, ease });
  }, []);
  const flyCam = useCallback((pos, tgt, dur = 1.6) => {
    const cam = camRef.current;
    const p = new THREE.Vector3(...pos), tg = new THREE.Vector3(...tgt);
    const off = p.clone().sub(tg);
    cam.anim = {
      t: 0, dur,
      fromT: cam.target.clone(), toT: tg,
      fromD: cam.dist, toD: off.length(),
      fromTh: cam.theta, toTh: Math.atan2(off.x, off.z),
      fromPh: cam.phi, toPh: Math.acos(Math.min(0.999, Math.max(0.02, off.y / off.length()))),
    };
  }, []);

  /* ---------------------- phase content builders ---------------------- */
  const buildPhase = useCallback((i, instant = false) => {
    const t3 = threeRef.current; if (!t3) return;
    const D = t3.dynamic;
    const put = (obj, x, y, z, pick) => {
      obj.position.set(x, y, z);
      if (pick) obj.traverse((o) => { o.userData.pick = pick; });
      D.add(obj);
      return obj;
    };
    const lbl = (text, x, y, z, opts) => put(makeLabel(text, opts), x, y, z);
    const dropIn = (obj, x, y, z, pick, delay = 0) => {
      put(obj, x, instant ? y : y + 7, z, pick);
      if (!instant) tween(obj.position, [x, y, z], 0.8, delay);
      return obj;
    };

    if (i === 0) {
      // Phase 1: demand cards
      DEMANDS.forEach((d, k) => {
        const g = new THREE.Group();
        const card = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.7, 0.1),
          new THREE.MeshLambertMaterial({ color: 0x16324a, emissive: 0x0a2233 }));
        card.position.y = 1.6; g.add(card); g.add(edged(card, MAT_COLORS[d.color]));
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.28, 0.12), new THREE.MeshBasicMaterial({ color: MAT_COLORS[d.color] }));
        stripe.position.set(0, 2.3, 0); g.add(stripe);
        const tag = makeLabel(d.id + " · " + d.short + " · " + d.qty + " u", { size: 30 });
        tag.position.set(0, 0.55, 0.3); g.add(tag);
        const col = k % 4, row = Math.floor(k / 4);
        const x = -66 + col * 3.4, z = -3 + row * 4;
        put(g, instant ? x : x - 14, 0, z, { kind: "Demand record", ...d });
        if (!instant) tween(g.position, [x, 0, z], 1.0, k * 0.18);
        t3.pulses.push(stripe);
      });
      lbl("Forecast Input — normalized demand buckets", -62, 6.5, -7, { size: 34, color: "#8ecbff" });
      addLog("Forecast demand normalized: 7 records grouped into planning buckets (lane × bucket × material × mode × temp).");
    }

    if (i === 1) {
      // Phase 2: validation gate
      const gate = new THREE.Group();
      [-1.9, 1.9].forEach((zz) => {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5.2, 0.5), new THREE.MeshLambertMaterial({ color: 0x2b3b52 }));
        p.position.set(0, 2.6, zz); gate.add(p);
      });
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.3), new THREE.MeshLambertMaterial({ color: 0x2b3b52 }));
      top.position.set(0, 5.0, 0); gate.add(top);
      const scan = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 4.6),
        new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
      scan.rotation.y = Math.PI / 2; scan.scale.set(1, 1, 1);
      const scanPlane = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 4.4),
        new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.16, side: THREE.DoubleSide }));
      scanPlane.rotation.y = Math.PI / 2; scanPlane.position.set(0, 2.4, 0); gate.add(scanPlane);
      put(gate, -48, 0, 0, { kind: "Validation gate", name: "Master Data Validation", checks: "UOM · EPF/UPF · EPL/UPL · CAR · PAC · HU type · lane · TU list · location · dimensions · weight · temperature · stackability · overhang/long-goods" });
      t3.pulses.push(scanPlane);
      lbl("Master Data Validation Gate", -48, 6.4, 0, { size: 34, color: "#8ecbff" });

      // valid records pass with green ring
      DEMANDS.filter((d) => d.valid).forEach((d, k) => {
        const g = new THREE.Group();
        const chip = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.9, 0.1), new THREE.MeshLambertMaterial({ color: 0x123a2c }));
        chip.position.y = 1.0; g.add(chip); g.add(edged(chip, 0x34d399));
        const tag = makeLabel(d.id + " ✓ valid", { size: 28, color: "#8df0c6" });
        tag.position.set(0, 0.35, 0.3); g.add(tag);
        g.add(ring(0x34d399, 1.15));
        const x = -44.5 + (k % 3) * 2.6, z = -3.2 + Math.floor(k / 3) * 3.2;
        dropIn(g, x, 0, z, { kind: "Validated record", ...d, status: "Valid — released for decomposition" }, k * 0.15);
      });
      // exception record
      const bad = DEMANDS.find((d) => !d.valid);
      const gB = new THREE.Group();
      const chip = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.0, 0.1), new THREE.MeshLambertMaterial({ color: 0x4a3410 }));
      chip.position.y = 1.0; gB.add(chip); gB.add(edged(chip, 0xfbbf24));
      const tag = makeLabel(bad.id + " ⚠ exception", { size: 28, color: "#ffe08a" });
      tag.position.set(0, 0.35, 0.3); gB.add(tag);
      gB.add(ring(0xfbbf24, 1.25));
      dropIn(gB, -48, 0, -7.5, { kind: "Exception record", ...bad, status: "Routed to exception area — master data incomplete" }, 0.8);
      lbl("Exception area", -48, 3.0, -9.6, { size: 26, color: "#ffd97a" });
      lbl("⚠ Missing layer UOM", -52.5, 4.6, -5.5, { size: 24, color: "#ffd97a" });
      lbl("⚠ Missing TU assignment", -52.5, 3.9, -5.5, { size: 24, color: "#ffd97a" });
      lbl("⚠ Missing material height", -52.5, 3.2, -5.5, { size: 24, color: "#ffd97a" });
      lbl("⚠ Missing stackability indicator", -52.5, 2.5, -5.5, { size: 24, color: "#ffd97a" });
      addLog("Master data validated: 6 of 7 records complete.", "ok");
      addLog("D-07 routed to exception area — missing layer UOM, material height, stackability indicator.", "warn");
    }

    if (i === 2) {
      // Phase 3: decomposition of M-1001 + outputs of other materials
      lbl("Quantity Decomposition — EPF → EPL → CAR → PAC", -26, 7.4, -9, { size: 34, color: "#8ecbff" });
      lbl("M-1001: 1,250 u → 2 full pallets (EPF 480) → 3 layers (EPL 96) → 4 cartons (CAR 24) → 6 loose packs", -26, 6.4, -9, { size: 24, color: "#9fd0ff" });
      // row labels
      lbl("Full Pallets · ExecutionCalcPallets", -33.5, 2.6, -6, { size: 24, color: "#9fd0ff" });
      lbl("Homogeneous Layers · ExecutionCalcLayers", -33.6, 2.6, -2, { size: 24, color: "#9fd0ff" });
      lbl("Cartons · ExecutionCalcItems", -33.0, 2.6, 2, { size: 24, color: "#9fd0ff" });
      lbl("Loose Packs · ExecutionCalcItems", -33.1, 2.6, 6, { size: 24, color: "#9fd0ff" });
      // full pallets row (z=-6)
      const fps = [
        { ci: 0, id: "FP-01", mat: "M-1001" }, { ci: 0, id: "FP-02", mat: "M-1001" },
        { ci: 5, id: "FP-03", mat: "M-2002 · temp" }, { ci: 5, id: "FP-04", mat: "M-2002 · temp" },
        { ci: 3, id: "FP-05", mat: "M-4004 · heavy" }, { ci: 3, id: "FP-06", mat: "M-4004 · heavy" },
      ];
      fps.forEach((f, k) => dropIn(fullPallet(f.ci), -30 + k * 3.0, 0, -6,
        { kind: "Pallet", id: f.id, type: "Full Pallet (homogeneous)", materials: f.mat, layers: "n/a — full unit", height: "1.85 m", weight: f.ci === 3 ? "620 kg" : "310 kg", overhang: "No", temp: f.ci === 5 ? "2–8 °C" : "Ambient", stackable: f.ci === 3 ? "No (heavy)" : "Yes", output: "ExecutionCalcPallets" }, k * 0.12));
      // layers row (z=-2)
      const lys = [
        { ci: 0 }, { ci: 0 }, { ci: 0 }, { ci: 5 }, { ci: 5 }, { ci: 1, o: true }, { ci: 1, o: true },
      ];
      lys.forEach((l, k) => dropIn(layerUnit(l.ci, l.o), -30 + k * 2.8, 0, -2,
        { kind: "Layer", id: "LY-0" + (k + 1), type: "Homogeneous Layer", materials: l.ci === 0 ? "M-1001" : l.ci === 5 ? "M-2002 (temp)" : "M-5005 (overhang)", output: "ExecutionCalcLayers", note: "Waits for MPL processing" }, 0.3 + k * 0.1));
      // cartons row (z=2)
      for (let k = 0; k < 11; k++) {
        const ci = [0, 0, 0, 0, 5, 5, 4, 4, 4, 1, 1][k];
        dropIn(cartonBox(ci, 0.75), -30 + (k % 8) * 1.3, 0, 2 + Math.floor(k / 8) * 1.2,
          { kind: "Carton", id: "CAR-" + (k + 1), type: "Carton / export box", output: "ExecutionCalcItems" }, 0.5 + k * 0.06);
      }
      // loose packs row (z=6)
      for (let k = 0; k < 15; k++) {
        const ci = [0, 0, 0, 0, 0, 0, 5, 5, 5, 4, 4, 1, 1, 3, 3][k];
        dropIn(cartonBox(ci, 0.4), -30 + (k % 10) * 0.9, 0, 6 + Math.floor(k / 10) * 0.9,
          { kind: "Loose pack", id: "PAC-" + (k + 1), type: "Loose sales pack", output: "ExecutionCalcItems" }, 0.7 + k * 0.05);
      }
      addLog("M-1001: 2 full pallets created (EPF).", "ok");
      addLog("M-2002 / M-4004: 4 further full pallets created.", "ok");
      addLog("7 homogeneous layers created (EPL) — staged for MPL.", "ok");
      addLog("11 cartons and 15 loose packs remain (CAR / PAC) — routed to MPM.");
    }

    if (i === 3) {
      // Phase 4: MPL builder
      const plat = new THREE.Mesh(new THREE.BoxGeometry(12, 0.15, 10), new THREE.MeshLambertMaterial({ color: 0x1b2636 }));
      put(plat, -8, 0.07, 0, null);
      lbl("MPL Builder — Mixed Pallet from Homogeneous Layers", -8, 7.2, -5.5, { size: 32, color: "#d9b8ff" });
      lbl("Sort: overhang ↓ · length ↓ · width ↓ · weight ↓", -8, 6.3, -5.5, { size: 24, color: "#c9a8ef" });
      const m1 = mplPallet([0, 0, 5]);
      dropIn(m1, -10.5, 0.15, 0, { kind: "Pallet", id: "MPL-01", type: "MPL — mixed pallet from homogeneous layers", materials: "M-1001 (2 layers) + M-2002 (1 layer)", layers: 3, height: "1.75 m", weight: "410 kg", overhang: "No", temp: "Ambient/2–8 °C compatible bucket", stackable: "Yes", stack: "ST-02", tu: "TU 1", output: "ExecutionCalcPallets · PalletID MPL-01" });
      const m2 = mplPallet([0, 1], true);
      dropIn(m2, -5.5, 0.15, 0, { kind: "Pallet", id: "MPL-02", type: "MPL — mixed pallet from homogeneous layers", materials: "M-1001 (1 layer) + M-5005 (overhang layer)", layers: 2, height: "1.30 m", weight: "300 kg", overhang: "Yes — 120 mm", temp: "Ambient", stackable: "No (overhang)", stack: "ST-05 (single)", tu: "TU 1", output: "ExecutionCalcPallets · PalletID MPL-02" }, 0.5);
      // flying layer decision
      if (!instant) {
        const fl = layerUnit(5);
        put(fl, -8, 5.5, 6, null);
        tween(fl.position, [-10.5, 1.7, 0], 1.4, 1.2);
      }
      lbl("✔ Compatible — Add to Existing MPL", -10.5, 4.3, 1.6, { size: 26, color: "#8df0c6" });
      lbl("✖ Incompatible (overhang) — Create New MPL", -5.5, 4.3, 1.6, { size: 26, color: "#ffb3b3" });
      addLog("Layer M-2002 compatible → added to existing MPL-01.", "ok");
      addLog("Layer M-5005 incompatible (overhang) → new MPL-02 created.", "warn");
    }

    if (i === 4) {
      // Phase 5: MPM builder
      const plat = new THREE.Mesh(new THREE.BoxGeometry(12, 0.15, 10), new THREE.MeshLambertMaterial({ color: 0x1b2636 }));
      put(plat, 7, 0.07, 0, null);
      lbl("MPM Builder — Mixed Pallet from Cartons & Loose Goods", 7, 7.2, -5.5, { size: 32, color: "#d9b8ff" });
      lbl("Σ volume → DispersionFactorMP 1.25 → theoretical height → MinimumHeightLayerLL → MaxMPHeight/Weight", 7, 6.3, -5.5, { size: 22, color: "#c9a8ef" });
      dropIn(mpmPallet([0, 5, 4], 1.5, 7), 4, 0.15, 0,
        { kind: "Pallet", id: "MPM-01", type: "MPM — volume-based mixed pallet", materials: "M-1001 · M-2002 · M-3003 cartons/packs", layers: "theoretical (volume-based)", height: "1.84 m (est.)", weight: "290 kg", overhang: "No", temp: "Ambient", stackable: "Yes", stack: "ST-03", tu: "TU 1", output: "ExecutionCalcLayers + ExecutionCalcPallets · Type MPM" });
      lbl("✔ Volume fits — 1 pallet", 4, 3.6, 1.6, { size: 26, color: "#8df0c6" });
      dropIn(mpmPallet([3, 1], 1.5, 21), 9.5, 0.15, 0,
        { kind: "Pallet", id: "MPM-02", type: "MPM — volume-based mixed pallet", materials: "M-4004 · M-5005 cartons", height: "1.62 m (est.)", weight: "480 kg", note: "First half of a weight-driven split", output: "Type MPM" }, 0.4);
      dropIn(mpmPallet([3, 1], 0.9, 33), 13, 0.15, 0,
        { kind: "Pallet", id: "MPM-03", type: "MPM — volume-based mixed pallet", materials: "M-4004 · M-5005 remainder", height: "1.05 m (est.)", weight: "310 kg", note: "Created by MaxMPWeight split", output: "Type MPM" }, 0.7);
      lbl("✖ MaxMPWeight exceeded — split into 2 pallets", 11.2, 3.8, 1.6, { size: 26, color: "#ffb3b3" });
      addLog("MPM-01 built: loose-item volume fits one pallet (dispersion 1.25).", "ok");
      addLog("MPM split: MaxMPWeight exceeded → MPM-02 + MPM-03 created.", "warn");
    }

    if (i === 5) {
      // Phase 6: long goods lane (z = 17)
      D.add(conveyorSeg(18, -2, 17));
      lbl("Long-Goods Handling — dedicated lane · pallet type MPG", -2, 6.6, 12.5, { size: 32, color: "#ffd97a" });
      lbl("Grouped by length · width · weight · destination · bucket · mode", -2, 5.7, 12.5, { size: 23, color: "#eec97a" });
      dropIn(longCarrier(2), -6, 0.7, 17,
        { kind: "Pallet", id: "MPG-01", type: "MPG — long-goods carrier", materials: "M-6006 Aluminium Profiles 4.2 m", height: "0.55 m", weight: "260 kg", overhang: "Yes — exceeds pallet footprint", stackable: "No (overlong = non-stackable)", tu: "TU 3 (Long-Goods Trailer)" });
      dropIn(longCarrier(2), 3.5, 0.7, 17,
        { kind: "Pallet", id: "MPG-02", type: "MPG — long-goods carrier", materials: "M-6006 Aluminium Profiles 4.2 m", stackable: "No", tu: "TU 3" }, 0.4);
      lbl("Overlong → standard pallet logic not applied · dedicated TU required", -2, 3.4, 20.5, { size: 24, color: "#ffd97a" });
      addLog("Long goods M-6006 routed to special lane — 2 MPG carriers created.", "warn");
    }

    if (i === 6) {
      // Phase 7: stack builder
      const plat = new THREE.Mesh(new THREE.BoxGeometry(16, 0.15, 16), new THREE.MeshLambertMaterial({ color: 0x1b2636 }));
      put(plat, 23, 0.07, 0, null);
      lbl("Stack Builder — pallets → transport-ready stacks", 23, 8.0, -8, { size: 32, color: "#7fe7f7" });
      // Stack A: two compatible pallets
      const stA = new THREE.Group();
      const p1 = fullPallet(0); stA.add(p1);
      const p2 = mplPallet([0, 5]); p2.position.y = 1.95; stA.add(p2);
      stA.add(stackBracket(3.6));
      dropIn(stA, 19, 0, -3, { kind: "Stack", id: "ST-01", pallets: "FP-01 + MPL-01", height: "3.55 m", weight: "720 kg", status: "Stackable — checks passed", tu: "TU 1" });
      lbl("✔ Stack OK — 2 pallets", 19, 4.6, -1.2, { size: 25, color: "#8df0c6" });
      // Stack B: heavy non-stackable
      const stB = new THREE.Group();
      stB.add(fullPallet(3)); stB.add(stackBracket(2.1, 0xf87171));
      dropIn(stB, 24, 0, -3, { kind: "Stack", id: "ST-02", pallets: "FP-05 (heavy)", height: "1.85 m", weight: "620 kg", status: "Non-stackable → single-pallet stack", tu: "TU 1" }, 0.3);
      lbl("✖ Non-stackable — single-pallet stack", 24.4, 3.2, -1.2, { size: 24, color: "#ffb3b3" });
      // Air freight
      const stC = new THREE.Group(); stC.add(fullPallet(4)); stC.add(stackBracket(2.1, 0xc084fc));
      dropIn(stC, 20, 0, 4.5, { kind: "Stack", id: "ST-AF-01", pallets: "M-3003 air-freight pallet", status: "Air freight: one pallet = one stack", tu: "Air-Freight Unit" }, 0.5);
      lbl("Air freight: 1 pallet = 1 stack", 20, 3.3, 6.3, { size: 25, color: "#d9b8ff" });
      // Long goods stack check
      const stD = new THREE.Group(); stD.add(longCarrier(2));
      const lb = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(7.0, 1.1, 1.6)), new THREE.LineBasicMaterial({ color: 0xfbbf24 }));
      lb.position.y = 0.55; stD.add(lb);
      dropIn(stD, 27, 0, 4.5, { kind: "Stack", id: "ST-LG-01", pallets: "MPG-01", status: "Long-goods check: inner TU height · width · margin OK — no stacking", tu: "TU 3" }, 0.7);
      lbl("Long goods — dedicated stacking check", 27, 2.6, 6.3, { size: 23, color: "#ffd97a" });
      // Oversize
      const stE = new THREE.Group();
      const os = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.4, 2.4), new THREE.MeshLambertMaterial({ color: 0x94a3b8 }));
      os.position.y = 1.0; stE.add(os); stE.add(edged(os));
      const ob = palletBase(); ob.scale.set(1.45, 1, 1.5); stE.add(ob);
      dropIn(stE, 30, 0, -3, { kind: "Stack", id: "ST-OS-01", pallets: "Oversize pallet", status: "Handled separately — footprint differs from standard", tu: "TU 1 (dedicated slot)" }, 0.9);
      lbl("Oversize — separate handling", 30, 3.2, -1.2, { size: 23, color: "#cbd5e1" });
      addLog("ST-01 built: FP-01 + MPL-01 stacked (height & weight checks passed).", "ok");
      addLog("Heavy pallet FP-05 non-stackable → single-pallet stack.", "warn");
      addLog("Air-freight pallets kept as single stacks.");
      addLog("10 transport-ready stacks created in total.");
    }

    if (i === 7) {
      // Phase 8: TU selection
      lbl("Transport-Unit Selection — lane priority list", 40, 8.4, -9, { size: 32, color: "#7fe7f7" });
      const cands = [
        { kind: "box", name: "Small Box Truck", x: 34, verdict: "✖ Rejected: volume capacity too small", col: "#ffb3b3", ok: false },
        { kind: "standard", name: "Standard Trailer", x: 40, verdict: "✖ Rejected for pharma: Temperature-Controlled TU required", col: "#ffb3b3", ok: false, ok2: true, verdict2: "✔ Selected for ambient stacks" },
        { kind: "highcube", name: "High-Cube Trailer", x: 46, verdict: "✖ Rejected: Stack exceeds inner height on prior check — held as fallback", col: "#ffd97a", ok: false },
        { kind: "temp", name: "Temperature-Controlled Trailer", x: 52, verdict: "✔ Selected for 2–8 °C stacks", col: "#8df0c6", ok: true },
      ];
      cands.forEach((c, k) => {
        const t = truckUnit(c.kind);
        dropIn(t, c.x, 0, k % 2 === 0 ? -3 : 3,
          { kind: "Transport unit (candidate)", id: c.name, type: c.name, mode: c.kind === "air" ? "Air" : "Road", lane: "Oberhausen → Vienna", temp: c.kind === "temp" ? "2–8 °C capable" : "Ambient only", status: c.ok || c.ok2 ? "Selected" : "Rejected" }, k * 0.2);
        const l1 = makeLabel(c.verdict, { size: 24, color: c.col });
        l1.position.set(c.x, 5.6, k % 2 === 0 ? -3 : 3); D.add(l1);
        if (c.verdict2) { const l2 = makeLabel(c.verdict2, { size: 24, color: "#8df0c6" }); l2.position.set(c.x, 6.4, -3); D.add(l2); }
        if (c.ok || c.ok2) { const r = ring(0x34d399, 6.2); r.position.set(c.x, 0.03, k % 2 === 0 ? -3 : 3); D.add(r); }
      });
      addLog("TU check: Small Box Truck rejected (volume capacity).", "warn");
      addLog("TU check: Standard Trailer rejected for pharma — Temperature-Controlled TU required.", "warn");
      addLog("TU check: High-Cube held — stack exceeds inner height case documented.", "warn");
      addLog("Standard Trailer selected (ambient) · Temp-Controlled Trailer selected (2–8 °C).", "ok");
    }

    if (i === 8) {
      // Phase 9: loading + result
      lbl("Loading Docks & Result Area", 58, 9.4, -10, { size: 34, color: "#7fe7f7" });
      const t1 = truckUnit("standard");
      put(t1, 54, 0, -5, { kind: "Transport unit", id: "TU 1", type: "Standard Trailer", mode: "Road", lane: "Oberhausen → Vienna/Zurich", temp: "Ambient", stacks: 5, pallets: 8, floor: "92%", vol: "84%", weight: "61%", status: "Closed on floor-space limit" });
      [[-3.4, -0.9], [-0.8, -0.9], [1.8, -0.9], [-3.4, 0.9], [-0.8, 0.9]].forEach(([dx, dz], k) => {
        const s = k === 0 ? (() => { const g = new THREE.Group(); g.add(fullPallet(0)); const p = mplPallet([0, 5]); p.position.y = 1.95; g.add(p); return g; })()
          : k === 1 ? fullPallet(0) : k === 2 ? mpmPallet([0, 5, 4], 1.3, 7 + k) : fullPallet(k === 3 ? 3 : 0);
        s.scale.set(0.82, 0.82, 0.82);
        s.position.set(54 + dx, instant ? 0.82 : 7, -5 + dz);
        s.traverse((o) => { o.userData.pick = { kind: "Loaded stack", id: "ST-0" + (k + 1), tu: "TU 1" }; });
        D.add(s);
        if (!instant) tween(s.position, [54 + dx, 0.82, -5 + dz], 0.8, 0.3 + k * 0.25);
      });
      lbl("TU 1 · floor 92% · vol 84% · wt 61%", 54, 6.2, -5, { size: 25, color: "#7fe7f7" });
      lbl("“TU 1 closed due to floor-space limit”", 54, 7.0, -5, { size: 24, color: "#ffd97a" });

      const t2 = truckUnit("temp");
      put(t2, 54, 0, 4.5, { kind: "Transport unit", id: "TU 2", type: "Temperature-Controlled Trailer", mode: "Road", lane: "Oberhausen → Vienna", temp: "2–8 °C", stacks: 2, pallets: 3, floor: "54%", vol: "47%", weight: "43%", status: "Temperature-controlled load" });
      [[-3.0, 0], [-0.4, 0]].forEach(([dx, dz], k) => {
        const s = k === 0 ? (() => { const g = new THREE.Group(); g.add(fullPallet(5)); const p = fullPallet(5); p.position.y = 1.95; p.scale.set(1, 0.7, 1); g.add(p); return g; })() : fullPallet(5);
        s.scale.set(0.82, 0.82, 0.82);
        s.position.set(54 + dx, instant ? 0.82 : 7, 4.5 + dz);
        s.traverse((o) => { o.userData.pick = { kind: "Loaded stack", id: "ST-T" + (k + 1), tu: "TU 2" }; });
        D.add(s);
        if (!instant) tween(s.position, [54 + dx, 0.82, 4.5 + dz], 0.8, 1.2 + k * 0.25);
      });
      lbl("“TU 2 created for remaining (temp) stacks”", 54, 6.2, 4.5, { size: 24, color: "#8ecbff" });

      const t3l = truckUnit("long");
      put(t3l, 66, 0, 0, { kind: "Transport unit", id: "TU 3", type: "Long-Goods Trailer", mode: "Road", lane: "Nuremberg → Paris", temp: "Ambient", stacks: 2, pallets: 2, floor: "48%", vol: "39%", weight: "35%", status: "Dedicated long-goods unit" });
      [[-2.4], [2.0]].forEach(([dx], k) => {
        const s = longCarrier(2); s.scale.set(0.85, 0.85, 0.85);
        s.position.set(66 + dx, instant ? 0.82 : 7, 0);
        s.traverse((o) => { o.userData.pick = { kind: "Loaded stack", id: "ST-LG-0" + (k + 1), tu: "TU 3" }; });
        D.add(s);
        if (!instant) tween(s.position, [66 + dx, 0.82, 0], 0.8, 1.8 + k * 0.25);
      });
      lbl("TU 3 · long goods · floor 48%", 66, 5.6, 0, { size: 25, color: "#ffd97a" });
      addLog("TU 1 loaded: 5 stacks / 8 pallets — closed due to floor-space limit.", "ok");
      addLog("TU 2 created for remaining temperature-controlled stacks.", "ok");
      addLog("TU 3 loaded with 2 MPG long-goods carriers.", "ok");
      addLog("Loading completed — 3 transport units planned, 4 warnings, 1 master-data issue.", "ok");
    }
  }, [addLog, tween]);

  /* ------------------------ phase navigation ------------------------ */
  const gotoPhase = useCallback((i, viaAuto = false) => {
    i = Math.max(0, Math.min(PHASES.length - 1, i));
    const t3 = threeRef.current; if (!t3) return;
    if (i < builtRef.current) {
      // rebuild world from scratch up to i (instant)
      while (t3.dynamic.children.length) {
        const c = t3.dynamic.children.pop();
        t3.dynamic.remove(c);
      }
      t3.tweens.length = 0; t3.pulses.length = 0;
      for (let k = 0; k <= i; k++) buildPhase(k, k < i);
      builtRef.current = i;
    } else {
      for (let k = builtRef.current + 1; k <= i; k++) buildPhase(k, k < i);
      builtRef.current = Math.max(builtRef.current, i);
    }
    phaseRef.current = i;
    timerRef.current = 0;
    setPhase(i);
    if (autoCamRef.current || !viaAuto) flyCam(PHASES[i].cam, PHASES[i].tgt, viaAuto ? 2.0 : 1.4);
    if (i === PHASES.length - 1) {
      setTimeout(() => setShowDash(true), viaAuto ? 3500 : 1200);
    }
  }, [buildPhase, flyCam]);

  const startSim = useCallback(() => {
    setStarted(true);
    setPlaying(true); playRef.current = true;
    setTimeout(() => gotoPhase(0), 60);
  }, [gotoPhase]);

  const resetSim = useCallback(() => {
    const t3 = threeRef.current; if (!t3) return;
    while (t3.dynamic.children.length) t3.dynamic.remove(t3.dynamic.children.pop());
    t3.tweens.length = 0; t3.pulses.length = 0;
    builtRef.current = -1; phaseRef.current = -1; timerRef.current = 0; logSeq.current = 0;
    setLogs([]); setSelected(null); setShowDash(false); setPhase(-1);
    setPlaying(false); playRef.current = false;
    flyCam([0, 55, 85], [0, 2, 4]);
    setTimeout(() => gotoPhase(0), 400);
  }, [flyCam, gotoPhase]);

  /* --------------------------- three setup --------------------------- */
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch (e) { setWebglOk(false); return; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(C.bg);
    scene.fog = new THREE.Fog(C.bg, 90, 220);

    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 500);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(30, 60, 40); scene.add(key);
    const fill = new THREE.DirectionalLight(0x7ea8d8, 0.3);
    fill.position.set(-40, 30, -30); scene.add(fill);

    /* static world */
    const staticG = new THREE.Group(); scene.add(staticG);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(190, 70), new THREE.MeshLambertMaterial({ color: 0x121a24 }));
    floor.rotation.x = -Math.PI / 2; staticG.add(floor);
    const grid = new THREE.GridHelper(190, 76, 0x22303f, 0x1a2531);
    grid.position.y = 0.01; staticG.add(grid);
    // zone dividers + titles
    const zones = [
      ["1 · Forecast Input", -62], ["2 · Validation", -45], ["3 · Decomposition", -26],
      ["4 · MPL Builder", -8], ["5 · MPM Builder", 7], ["7 · Stack Builder", 23],
      ["8 · TU Selection", 40], ["9 · Loading / Result", 58],
    ];
    zones.forEach(([name, x], i) => {
      const t = makeLabel(name, { size: 30, color: "#6f8aa6", bg: "rgba(10,16,23,0.55)" });
      t.position.set(x, 0.4, -13.5); staticG.add(t);
      if (i > 0) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 30), new THREE.MeshBasicMaterial({ color: 0x2b3b4e }));
        line.rotation.x = -Math.PI / 2; line.position.set(x - ((x - zones[i - 1][1]) / 2), 0.02, 0);
        staticG.add(line);
      }
    });
    const lg = makeLabel("6 · Long-Goods Lane", { size: 30, color: "#8a7a4f", bg: "rgba(10,16,23,0.55)" });
    lg.position.set(-14, 0.4, 17); staticG.add(lg);
    // main conveyor + arrows
    staticG.add(conveyorSeg(24, -36, 10));
    staticG.add(conveyorSeg(24, 0, 10));
    staticG.add(conveyorSeg(22, 31, 10));
    for (let x = -58; x <= 50; x += 12) staticG.add(floorArrow(x, 10));
    for (let x = -60; x <= 52; x += 14) staticG.add(floorArrow(x, -11));

    const dynamic = new THREE.Group(); scene.add(dynamic);

    const t3 = { scene, camera, renderer, dynamic, tweens: [], pulses: [], raycaster: new THREE.Raycaster(), mouse: new THREE.Vector2() };
    threeRef.current = t3;

    /* camera controls */
    const cam = camRef.current;
    let drag = null;
    const onDown = (e) => {
      const p = e.touches ? e.touches[0] : e;
      drag = { x: p.clientX, y: p.clientY, btn: e.button ?? 0, moved: false, two: e.touches && e.touches.length === 2, d0: 0 };
      if (drag.two) {
        const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
        drag.d0 = Math.hypot(dx, dy);
      }
    };
    const onMove = (e) => {
      if (!drag) return;
      if (e.touches && e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
        const d = Math.hypot(dx, dy);
        cam.dist = Math.max(8, Math.min(160, cam.dist * (drag.d0 / d)));
        drag.d0 = d; cam.anim = null; drag.moved = true;
        return;
      }
      const p = e.touches ? e.touches[0] : e;
      const dx = p.clientX - drag.x, dy = p.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      if (drag.btn === 2 || e.shiftKey) {
        // pan
        const right = new THREE.Vector3().subVectors(camera.position, cam.target).cross(new THREE.Vector3(0, 1, 0)).normalize();
        const fwd = new THREE.Vector3().subVectors(cam.target, camera.position); fwd.y = 0; fwd.normalize();
        cam.target.addScaledVector(right, dx * 0.03 * (cam.dist / 40));
        cam.target.addScaledVector(fwd, dy * 0.04 * (cam.dist / 40));
      } else {
        cam.theta -= dx * 0.006;
        cam.phi = Math.max(0.15, Math.min(1.45, cam.phi - dy * 0.005));
      }
      cam.anim = null;
      drag.x = p.clientX; drag.y = p.clientY;
    };
    const onUp = (e) => {
      if (drag && !drag.moved && !drag.two) {
        // click select
        const rect = renderer.domElement.getBoundingClientRect();
        const cx = (drag.x - rect.left) / rect.width * 2 - 1;
        const cy = -((drag.y - rect.top) / rect.height) * 2 + 1;
        t3.mouse.set(cx, cy);
        t3.raycaster.setFromCamera(t3.mouse, camera);
        const hits = t3.raycaster.intersectObjects(dynamic.children, true);
        let pick = null;
        for (const h of hits) {
          let o = h.object;
          while (o && !o.userData.pick) o = o.parent;
          if (o && o.userData.pick) { pick = o.userData.pick; break; }
        }
        setSelected(pick);
      }
      drag = null;
    };
    const onWheel = (e) => {
      e.preventDefault();
      cam.dist = Math.max(8, Math.min(160, cam.dist * (1 + e.deltaY * 0.001)));
      cam.anim = null;
    };
    const onCtx = (e) => e.preventDefault();
    const el = renderer.domElement;
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    el.addEventListener("touchstart", onDown, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("contextmenu", onCtx);

    const onResize = () => {
      if (!mount.clientWidth) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    /* render loop */
    const clock = new THREE.Clock();
    let raf;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, clock.getDelta());
      // tweens
      for (let i = t3.tweens.length - 1; i >= 0; i--) {
        const tw = t3.tweens[i];
        if (tw.delay > 0) { tw.delay -= dt * speedRef.current; continue; }
        tw.t += dt * speedRef.current / tw.dur;
        const k = ease(Math.min(1, tw.t));
        tw.vec.lerpVectors(tw.from, tw.to, k);
        if (tw.t >= 1) t3.tweens.splice(i, 1);
      }
      // pulses
      const pt = clock.elapsedTime;
      t3.pulses.forEach((m) => { if (m.material) m.material.opacity = 0.12 + 0.1 * (0.5 + 0.5 * Math.sin(pt * 2.5)); });
      // camera animation
      if (cam.anim) {
        const a = cam.anim;
        a.t += dt / a.dur;
        const k = ease(Math.min(1, a.t));
        cam.target.lerpVectors(a.fromT, a.toT, k);
        cam.dist = a.fromD + (a.toD - a.fromD) * k;
        cam.theta = a.fromTh + (a.toTh - a.fromTh) * k;
        cam.phi = a.fromPh + (a.toPh - a.fromPh) * k;
        if (a.t >= 1) cam.anim = null;
      }
      const sp = Math.sin(cam.phi);
      camera.position.set(
        cam.target.x + cam.dist * sp * Math.sin(cam.theta),
        cam.target.y + cam.dist * Math.cos(cam.phi),
        cam.target.z + cam.dist * sp * Math.cos(cam.theta)
      );
      camera.lookAt(cam.target);
      // auto-advance
      if (playRef.current && phaseRef.current >= 0 && phaseRef.current < PHASES.length - 1) {
        timerRef.current += dt * speedRef.current;
        if (timerRef.current > 9) {
          timerRef.current = 0;
          gotoPhase(phaseRef.current + 1, true);
        }
      } else if (playRef.current && phaseRef.current === PHASES.length - 1) {
        playRef.current = false; setPlaying(false);
      }
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      el.removeEventListener("mousedown", onDown);
      el.removeEventListener("touchstart", onDown);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("contextmenu", onCtx);
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      threeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { autoCamRef.current = autoCam; }, [autoCam]);
  useEffect(() => { playRef.current = playing; }, [playing]);

  const viewPreset = useCallback((v) => {
    if (v === "overview") flyCam([0, 60, 90], [0, 2, 4]);
    if (v === "process") flyCam([-10, 30, 55], [-10, 2, 2]);
    if (v === "pallet") flyCam([0, 10, 16], [0, 2.5, 0]);
    if (v === "stacking") flyCam(PHASES[6].cam, PHASES[6].tgt);
    if (v === "loading") flyCam(PHASES[8].cam, PHASES[8].tgt);
  }, [flyCam]);

  /* ------------------------------ UI ------------------------------ */
  const S = {
    btn: { background: "#16222f", color: C.text, border: "1px solid " + C.border, borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
    btnA: { background: "#0e3a4f", borderColor: "#1e6a8a", color: "#aee9ff" },
    card: { background: C.panel, border: "1px solid " + C.border, borderRadius: 12, padding: 14, backdropFilter: "blur(6px)" },
    kv: { display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, padding: "3px 0", borderBottom: "1px solid rgba(130,160,190,0.08)" },
  };
  const ph = phase >= 0 ? PHASES[phase] : null;

  const kindColor = (k) => (k === "ok" ? C.green : k === "warn" ? C.amber : C.dim);
  const warnCount = logs.filter((l) => l.kind === "warn").length;

  if (!webglOk) {
    return <div style={{ height: "100vh", display: "grid", placeItems: "center", background: C.bg, color: C.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={S.card}>WebGL is not available in this browser — the 3D simulation cannot start.</div>
    </div>;
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, color: C.text, fontFamily: "'Segoe UI', system-ui, sans-serif", overflow: "hidden" }}>
      <div ref={mountRef} style={{ position: "absolute", inset: 0 }} />

      {/* ---------- top bar ---------- */}
      {started && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", gap: 14, padding: "10px 16px", background: "linear-gradient(rgba(10,16,23,0.92), rgba(10,16,23,0))", pointerEvents: "none", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.3 }}>Forecast-to-Transport Capacity Simulation</div>
          {ph && (
            <div style={{ fontSize: 13, color: "#9fd0ff" }}>
              Phase {ph.n} of 9 — {ph.name}
            </div>
          )}
          <div style={{ display: "flex", gap: 5, pointerEvents: "auto" }}>
            {PHASES.map((p, i) => (
              <button key={p.n} onClick={() => { setPlaying(false); gotoPhase(i); }}
                title={p.name}
                style={{ width: 22, height: 22, borderRadius: "50%", border: "1px solid " + (i === phase ? "#4dc3ff" : C.border), background: i <= phase ? "#0e3a4f" : "#141d28", color: i === phase ? "#aee9ff" : C.dim, fontSize: 10, cursor: "pointer" }}>
                {p.n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---------- control panel (left) ---------- */}
      {started && (
        <div style={{ ...S.card, position: "absolute", left: 12, top: 64, width: 168, display: "flex", flexDirection: "column", gap: 6, maxHeight: "calc(100vh - 90px)", overflowY: "auto" }}>
          <div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: 1 }}>Simulation</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={{ ...S.btn, ...(playing ? {} : S.btnA), flex: 1 }} onClick={() => setPlaying((p) => { playRef.current = !p; return !p; })}>{playing ? "Pause" : phase < 0 ? "Start" : "Play"}</button>
            <button style={S.btn} onClick={resetSim}>Reset</button>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={{ ...S.btn, flex: 1 }} onClick={() => { setPlaying(false); gotoPhase(phase - 1); }} disabled={phase <= 0}>◀ Prev</button>
            <button style={{ ...S.btn, flex: 1 }} onClick={() => { setPlaying(false); gotoPhase(phase + 1); }} disabled={phase >= 8}>Next ▶</button>
          </div>
          <div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>Speed</div>
          <div style={{ display: "flex", gap: 5 }}>
            {[0.5, 1, 2, 4].map((s) => (
              <button key={s} style={{ ...S.btn, flex: 1, padding: "5px 0", ...(speed === s ? S.btnA : {}) }} onClick={() => setSpeed(s)}>{s}x</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>Camera</div>
          <button style={{ ...S.btn, ...(autoCam ? S.btnA : {}) }} onClick={() => setAutoCam((a) => !a)}>{autoCam ? "✓ Automatic Camera" : "Automatic Camera"}</button>
          <button style={S.btn} onClick={() => ph && flyCam(ph.cam, ph.tgt)}>Refocus</button>
          <button style={S.btn} onClick={() => viewPreset("overview")}>Overview View</button>
          <button style={S.btn} onClick={() => viewPreset("process")}>Process View</button>
          <button style={S.btn} onClick={() => viewPreset("pallet")}>Pallet View</button>
          <button style={S.btn} onClick={() => viewPreset("stacking")}>Stacking View</button>
          <button style={S.btn} onClick={() => viewPreset("loading")}>Transport Loading View</button>
          {phase >= 3 && <button style={{ ...S.btn, marginTop: 4, ...(showCompare ? S.btnA : {}) }} onClick={() => setShowCompare((s) => !s)}>MPL vs MPM</button>}
          {phase === 8 && <button style={{ ...S.btn, ...S.btnA }} onClick={() => setShowDash(true)}>Result Dashboard</button>}
          <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>Drag: orbit · Shift/right-drag: pan · Wheel/pinch: zoom · Click objects for details</div>
        </div>
      )}

      {/* ---------- phase info (right) ---------- */}
      {started && ph && (
        <div style={{ ...S.card, position: "absolute", right: 12, top: 64, width: 300, maxHeight: "44vh", overflowY: "auto" }}>
          <div style={{ fontSize: 11, color: "#4dc3ff", textTransform: "uppercase", letterSpacing: 1 }}>{ph.zone}</div>
          <div style={{ fontWeight: 700, margin: "4px 0 6px" }}>{ph.name}</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#c7d5e3" }}>{ph.info}</div>
          {phase === 3 && (
            <details style={{ marginTop: 8, fontSize: 12, color: "#c7d5e3" }}>
              <summary style={{ cursor: "pointer", color: C.purple }}>MPL compatibility rules</summary>
              Same source · same destination · same departure bucket · compatible TU mode · compatible temperature · overhang compatibility · max MPL height · max MPL weight · optional intermediate pallet · special-goods prioritization
            </details>
          )}
          {phase === 4 && (
            <details style={{ marginTop: 8, fontSize: 12, color: "#c7d5e3" }}>
              <summary style={{ cursor: "pointer", color: C.purple }}>MPM parameters</summary>
              TopMPLayersWithMixedGoods · DispersionFactorMP = 1.25 · MinimumHeightLayerLL · MaxMPHeight · MaxMPWeight
            </details>
          )}
        </div>
      )}

      {/* ---------- MPL vs MPM comparison ---------- */}
      {started && showCompare && (
        <div style={{ ...S.card, position: "absolute", right: 12, top: "calc(44vh + 76px)", width: 300, fontSize: 12 }}>
          <div style={{ fontWeight: 700, color: C.purple, marginBottom: 6 }}>MPL vs MPM</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ color: "#aee9ff", fontWeight: 600 }}>MPL</div>
              <ul style={{ margin: "4px 0 0 14px", padding: 0, color: "#c7d5e3", lineHeight: 1.5 }}>
                <li>Complete homogeneous layers</li>
                <li>Known layer dimensions</li>
                <li>Ordered horizontal structure</li>
                <li>Layer-based compatibility</li>
              </ul>
            </div>
            <div>
              <div style={{ color: "#d9b8ff", fontWeight: 600 }}>MPM</div>
              <ul style={{ margin: "4px 0 0 14px", padding: 0, color: "#c7d5e3", lineHeight: 1.5 }}>
                <li>Cartons & loose items</li>
                <li>Volume-based height estimate</li>
                <li>Dispersion factor applied</li>
                <li>May require splitting</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ---------- selected object panel ---------- */}
      {started && selected && (
        <div style={{ ...S.card, position: "absolute", left: 192, bottom: 54, width: 300, maxHeight: "40vh", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700, color: "#aee9ff" }}>{selected.kind}{selected.id ? " · " + selected.id : ""}</div>
            <button style={{ ...S.btn, padding: "2px 8px" }} onClick={() => setSelected(null)}>✕</button>
          </div>
          <div style={{ marginTop: 6 }}>
            {Object.entries(selected).filter(([k]) => !["kind", "color", "valid"].includes(k)).map(([k, v]) => (
              <div key={k} style={S.kv}>
                <span style={{ color: C.dim, textTransform: "capitalize" }}>{k}</span>
                <span style={{ textAlign: "right" }}>{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- log panel (bottom) ---------- */}
      {started && (
        <div style={{ position: "absolute", left: 12, right: 12, bottom: 10 }}>
          <div style={{ ...S.card, padding: showLog ? 12 : "8px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setShowLog((s) => !s)}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{showLog ? "▾" : "▸"} Algorithm Log ({logs.length})</span>
              <span style={{ fontSize: 12, color: C.amber }}>Warnings: {warnCount}</span>
              {phase === 8 && <span style={{ fontSize: 12, color: C.cyan }}>Planning complete — open Result Dashboard for the summary</span>}
            </div>
            {showLog && (
              <div style={{ maxHeight: 150, overflowY: "auto", marginTop: 8, fontSize: 12, fontFamily: "Consolas, monospace" }}>
                {logs.slice().reverse().map((l) => (
                  <div key={l.step} style={{ padding: "2px 0", color: kindColor(l.kind) }}>
                    #{String(l.step).padStart(2, "0")} · {l.text}
                  </div>
                ))}
                {!logs.length && <div style={{ color: C.dim }}>No entries yet — start the simulation.</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- dashboard modal ---------- */}
      {showDash && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(5,9,14,0.72)", display: "grid", placeItems: "center", padding: 16, overflowY: "auto" }}>
          <div style={{ ...S.card, width: "min(860px, 96vw)", maxHeight: "92vh", overflowY: "auto", padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: "#4dc3ff", textTransform: "uppercase", letterSpacing: 1 }}>Result</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>Capacity Planning Summary</div>
              </div>
              <button style={S.btn} onClick={() => setShowDash(false)}>Close</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8, marginTop: 14 }}>
              {[
                ["Forecast quantity", SUMMARY.forecastQty.toLocaleString() + " u"], ["Materials", SUMMARY.materials],
                ["Full pallets", SUMMARY.fullPallets], ["Homog. layers", SUMMARY.layers],
                ["Cartons", SUMMARY.cartons], ["Loose packs", SUMMARY.loosePacks],
                ["MPL pallets", SUMMARY.mpl], ["MPM pallets", SUMMARY.mpm], ["MPG pallets", SUMMARY.mpg],
                ["Total pallets", SUMMARY.totalPallets], ["Total stacks", SUMMARY.totalStacks], ["Transport units", SUMMARY.totalTUs],
                ["Ø volume util.", SUMMARY.volUtil + "%"], ["Ø weight util.", SUMMARY.weightUtil + "%"], ["Ø floor util.", SUMMARY.floorUtil + "%"],
                ["Warnings", SUMMARY.warnings], ["Master-data issues", SUMMARY.mdIssues],
              ].map(([k, v]) => (
                <div key={k} style={{ background: "#121b26", border: "1px solid " + C.border, borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10.5, color: C.dim }}>{k}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#aee9ff" }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, marginTop: 14 }}>
              {SUMMARY.tus.map((tu) => (
                <div key={tu.id} style={{ background: "#121b26", border: "1px solid " + C.border, borderLeft: "3px solid " + tu.color, borderRadius: 10, padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>{tu.id} — {tu.type}</div>
                  <div style={{ fontSize: 12, color: "#c7d5e3", marginTop: 6, lineHeight: 1.7 }}>
                    Loaded stacks: {tu.stacks} · pallets: {tu.pallets}<br />
                    {["Floor-space", "Volume", "Weight"].map((n, i) => {
                      const v = [tu.floor, tu.vol, tu.weight][i];
                      return (
                        <span key={n} style={{ display: "block" }}>
                          {n}: {v}%
                          <span style={{ display: "inline-block", width: 90, height: 6, background: "#1c2836", borderRadius: 3, marginLeft: 8, verticalAlign: "middle" }}>
                            <span style={{ display: "block", width: v * 0.9 + "px", maxWidth: 90, height: 6, background: tu.color, borderRadius: 3 }} />
                          </span>
                        </span>
                      );
                    })}
                    <span style={{ color: C.dim }}>Status: {tu.status}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 700, color: C.cyan, marginBottom: 6 }}>Management insights</div>
              <ul style={{ margin: "0 0 0 16px", padding: 0, fontSize: 13, color: "#c7d5e3", lineHeight: 1.7 }}>
                {SUMMARY.insights.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ---------- landing page ---------- */}
      {!started && (
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(8,13,20,0.96), rgba(10,18,28,0.92))", display: "grid", placeItems: "center", padding: 20, overflowY: "auto" }}>
          <div style={{ maxWidth: 760, textAlign: "center" }}>
            <div style={{ fontSize: 12, letterSpacing: 3, color: "#4dc3ff", textTransform: "uppercase", marginBottom: 14 }}>Packing & Transport-Capacity Heuristic</div>
            <h1 style={{ fontSize: "clamp(26px, 4.5vw, 42px)", margin: 0, lineHeight: 1.15 }}>Forecast-to-Transport Capacity Simulation</h1>
            <p style={{ color: "#9fb6c9", fontSize: "clamp(14px, 2vw, 17px)", marginTop: 12 }}>
              Visualizing how forecast quantities are converted into pallets, stacks and transport units
            </p>
            <p style={{ color: "#7e93a6", fontSize: 13.5, lineHeight: 1.6, maxWidth: 640, margin: "14px auto 0" }}>
              This simulation demonstrates how a packing heuristic transforms normalized demand into realistic
              transport-capacity requirements while considering material dimensions, logistics units, compatibility
              rules, stackability and transport-unit constraints.
            </p>
            <button onClick={startSim}
              style={{ marginTop: 26, background: "linear-gradient(135deg, #0e6d92, #0aa3c2)", color: "#eafcff", border: "none", borderRadius: 12, padding: "14px 38px", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 30px rgba(10,163,194,0.35)" }}>
              Start Simulation ▶
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 34, textAlign: "left" }}>
              {[
                ["Demand Transformation", "Forecast quantities are decomposed into full pallets, layers, cartons and loose packs using material master data (EPF · EPL · CAR · PAC).", C.blue],
                ["Load Building", "Homogeneous layers become MPL pallets, loose goods become volume-estimated MPM pallets, long goods follow the dedicated MPG lane — then stacks are formed.", C.purple],
                ["Transport Capacity Planning", "Stacks are assigned to compatible transport units from a lane priority list; physical constraints determine the final number of TUs and their utilization.", C.cyan],
              ].map(([t, d, col]) => (
                <div key={t} style={{ ...S.card, borderTop: "3px solid " + col }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{t}</div>
                  <div style={{ fontSize: 12.5, color: "#9fb6c9", lineHeight: 1.55 }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
