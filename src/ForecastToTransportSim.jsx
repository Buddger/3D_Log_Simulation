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

const BUCKETS = {
  AMB_VIE: { id: "BKT-VIE-ROAD-AMBIENT", source: "Oberhausen", destination: "Vienna", departure: "CW31 · Tue", mode: "Road", temperature: "Ambient", color: "#60a5fa" },
  COOL_VIE: { id: "BKT-VIE-ROAD-COOL", source: "Oberhausen", destination: "Vienna", departure: "CW31 · Tue", mode: "Road", temperature: "2–8 °C", color: "#22d3ee" },
  AIR_PAR: { id: "BKT-PAR-AIR-AMBIENT", source: "Nuremberg", destination: "Paris", departure: "CW31 · Wed", mode: "Air", temperature: "Ambient", color: "#c084fc" },
  AMB_ZRH: { id: "BKT-ZRH-ROAD-AMBIENT", source: "Oberhausen", destination: "Zurich", departure: "CW31 · Thu", mode: "Road", temperature: "Ambient", color: "#34d399" },
  LONG_PAR: { id: "BKT-PAR-ROAD-LONG", source: "Nuremberg", destination: "Paris", departure: "CW31 · Wed", mode: "Road", temperature: "Ambient", special: "Long goods", color: "#fbbf24" },
};

const DEMANDS = [
  { id:"D-01", mat:"M-1001 Standard Cartoned Goods", short:"M-1001", qty:1250, bucketId:BUCKETS.AMB_VIE.id, lane:"Oberhausen → Vienna", bucket:"CW31 · Tue", mode:"Road", temp:"Ambient", special:"—", color:0, valid:true,
    fullPalletQty:480, layerQty:96, cartonQty:24, packQty:1, unitVolume:0.0048, unitWeight:1.8, materialLength:0.40, materialWidth:0.30, materialHeight:0.20, stackable:true, maxTopLoad:420, overhang:0, temperatureCompatibility:["Ambient"], assignedLane:"OBH-VIE-RD", allowedTUTypes:["Small Box Truck","Standard Trailer","High-Cube Trailer"] },
  { id:"D-02", mat:"M-2002 Pharma Coolpacks", short:"M-2002", qty:620, bucketId:BUCKETS.COOL_VIE.id, lane:"Oberhausen → Vienna", bucket:"CW31 · Tue", mode:"Road", temp:"2–8 °C", special:"Temperature-controlled", color:5, valid:true,
    fullPalletQty:240, layerQty:48, cartonQty:12, packQty:1, unitVolume:0.0062, unitWeight:1.3, materialLength:0.38, materialWidth:0.28, materialHeight:0.22, stackable:true, maxTopLoad:300, overhang:0, temperatureCompatibility:["2–8 °C"], assignedLane:"OBH-VIE-COOL", allowedTUTypes:["Temperature-Controlled Box Truck","Temperature-Controlled Trailer"] },
  { id:"D-03", mat:"M-3003 Precision Sensors", short:"M-3003", qty:340, bucketId:BUCKETS.AIR_PAR.id, lane:"Nuremberg → Paris", bucket:"CW31 · Wed", mode:"Air", temp:"Ambient", special:"Air-freight mandatory", color:4, valid:true,
    fullPalletQty:160, layerQty:40, cartonQty:10, packQty:1, unitVolume:0.0032, unitWeight:0.9, materialLength:0.32, materialWidth:0.24, materialHeight:0.16, stackable:false, maxTopLoad:0, overhang:0, temperatureCompatibility:["Ambient"], assignedLane:"NUE-PAR-AIR", allowedTUTypes:["Air-Freight Unit","Air-Freight ULD"] },
  { id:"D-04", mat:"M-4004 Steel Fittings", short:"M-4004", qty:900, bucketId:BUCKETS.AMB_ZRH.id, lane:"Oberhausen → Zurich", bucket:"CW31 · Thu", mode:"Road", temp:"Ambient", special:"Heavy", color:3, valid:true,
    fullPalletQty:450, layerQty:90, cartonQty:15, packQty:1, unitVolume:0.0025, unitWeight:2.75, materialLength:0.35, materialWidth:0.28, materialHeight:0.18, stackable:false, maxTopLoad:0, overhang:0, temperatureCompatibility:["Ambient"], assignedLane:"OBH-ZRH-RD", allowedTUTypes:["Standard Trailer","High-Cube Trailer"] },
  { id:"D-05", mat:"M-5005 Panel Elements", short:"M-5005", qty:260, bucketId:BUCKETS.AMB_ZRH.id, lane:"Oberhausen → Zurich", bucket:"CW31 · Thu", mode:"Road", temp:"Ambient", special:"Overhanging", color:1, valid:true,
    fullPalletQty:200, layerQty:40, cartonQty:10, packQty:1, unitVolume:0.012, unitWeight:4.2, materialLength:1.30, materialWidth:0.95, materialHeight:0.09, stackable:false, maxTopLoad:0, overhang:0.12, temperatureCompatibility:["Ambient"], assignedLane:"OBH-ZRH-RD", allowedTUTypes:["Standard Trailer","High-Cube Trailer"] },
  { id:"D-06", mat:"M-6006 Aluminium Profiles 4.2 m", short:"M-6006", qty:180, bucketId:BUCKETS.LONG_PAR.id, lane:"Nuremberg → Paris", bucket:"CW31 · Wed", mode:"Road", temp:"Ambient", special:"Long goods", color:2, valid:true,
    fullPalletQty:90, layerQty:30, cartonQty:0, packQty:1, unitVolume:0.018, unitWeight:3.1, materialLength:4.20, materialWidth:0.10, materialHeight:0.10, stackable:false, maxTopLoad:0, overhang:2.40, temperatureCompatibility:["Ambient"], assignedLane:"NUE-PAR-LONG", allowedTUTypes:["Long-Goods Trailer","Extended-Length Trailer"] },
  { id:"D-07", mat:"M-7007 Spare Kits", short:"M-7007", qty:95, bucketId:BUCKETS.AMB_VIE.id, lane:"Oberhausen → Vienna", bucket:"CW31 · Tue", mode:"Road", temp:"Ambient", special:"—", color:6, valid:false,
    fullPalletQty:120, layerQty:null, cartonQty:8, packQty:1, unitVolume:0.005, unitWeight:1.1, materialLength:0.30, materialWidth:0.25, materialHeight:null, stackable:null, maxTopLoad:null, overhang:0, temperatureCompatibility:["Ambient"], assignedLane:null, allowedTUTypes:[], issue:"Missing layer UOM · missing material height · missing stackability indicator · missing TU assignment" },
];

const PHASES = [
  { n:1, name:"Normalized Demand", zone:"Forecast Input", cam:[-62,15,24], tgt:[-62,2.5,0], info:"Demand is separated into strict planning buckets. Source, destination, departure, TU mode, temperature and special transport characteristics remain attached to every object." },
  { n:2, name:"Master Data Validation", zone:"Validation Gate", cam:[-45,14,23], tgt:[-45,3,0], info:"Illustrative logistics master data is validated before decomposition: UOM quantities, dimensions, weight, stackability, temperature rules, assigned lane and allowed TU types." },
  { n:3, name:"Quantity Decomposition", zone:"Decomposition", cam:[-26,16,26], tgt:[-26,2,0], info:"Quantity is reconciled in strict sequence: full pallets → homogeneous layers → cartons → loose packs. Remaining quantity is displayed after every step." },
  { n:4, name:"Building Mixed Layer Pallets (MPL)", zone:"MPL Builder", cam:[-8,12,20], tgt:[-8,3,0], info:"MPL uses complete homogeneous layers only. Ambient and 2–8 °C layers remain on separate pallets because no cross-temperature compatibility rule is defined." },
  { n:5, name:"Building MPM Mixed Pallets", zone:"MPM Builder", cam:[7,12,20], tgt:[7,3,0], info:"MPM uses cartons and loose packs within one compatible planning bucket. Cross-destination, cross-mode, cross-departure and cross-temperature consolidation is rejected visibly." },
  { n:6, name:"Long-Goods Handling", zone:"Long-Goods Lane", cam:[-2,13,38], tgt:[-2,2,17], info:"Long goods retain BKT-PAR-ROAD-LONG and are routed to dedicated MPG carriers and long-goods TU types." },
  { n:7, name:"Pallet Stacking", zone:"Stack Builder", cam:[23,13,22], tgt:[23,3,0], info:"Stacks retain bucket identity. Air freight remains one pallet per stack; overhang, heavy and long-goods pallets remain non-stackable." },
  { n:8, name:"Transport-Unit Selection", zone:"TU Selection", cam:[40,14,25], tgt:[40,3,0], info:"Each bucket evaluates its own lane-specific priority list in sequence. Rejections show concrete capacity, dimensional, temperature or mode calculations." },
  { n:9, name:"Loading & Capacity Result", zone:"Loading / Result", cam:[60,16,30], tgt:[60,3,0], info:"Stacks are loaded into separated transport units using trailer-relative floor positions. Dashboard KPIs are calculated from the same central scenario structure." },
];

function decompose(d) {
  if (!d.valid) return { demand:d, fullPallets:0, fullPalletUnits:0, layers:0, layerUnits:0, cartons:0, cartonUnits:0, loosePacks:0, remainingSteps:[d.qty] };
  let remaining=d.qty;
  const fullPallets=d.fullPalletQty ? Math.floor(remaining/d.fullPalletQty) : 0; const fullPalletUnits=fullPallets*(d.fullPalletQty||0); remaining-=fullPalletUnits;
  const afterPallets=remaining;
  const layers=d.layerQty ? Math.floor(remaining/d.layerQty) : 0; const layerUnits=layers*(d.layerQty||0); remaining-=layerUnits;
  const afterLayers=remaining;
  const cartons=d.cartonQty ? Math.floor(remaining/d.cartonQty) : 0; const cartonUnits=cartons*(d.cartonQty||0); remaining-=cartonUnits;
  const afterCartons=remaining;
  const loosePacks=d.packQty ? Math.floor(remaining/d.packQty) : remaining;
  return { demand:d, fullPallets, fullPalletUnits, layers, layerUnits, cartons, cartonUnits, loosePacks, remainingSteps:[d.qty,afterPallets,afterLayers,afterCartons,0] };
}
const DECOMPOSITIONS=DEMANDS.map(decompose);
const validDecomp=DECOMPOSITIONS.filter(x=>x.demand.valid);
const sum=(key)=>validDecomp.reduce((a,x)=>a+(x[key]||0),0);

const PALLET_PLAN = {
  mpl:[
    {id:"MPL-01",bucketId:BUCKETS.AMB_VIE.id,materials:"M-1001 · 3 ambient layers",layers:3,height:1.30,weight:285,temp:"Ambient"},
    {id:"MPL-02",bucketId:BUCKETS.COOL_VIE.id,materials:"M-2002 · 2 temperature-controlled layers",layers:2,height:1.10,weight:230,temp:"2–8 °C"},
  ],
  mpm:[
    {id:"MPM-01",bucketId:BUCKETS.AMB_VIE.id,materials:"M-1001 · 2 loose packs",height:0.55,weight:28,temp:"Ambient"},
    {id:"MPM-02",bucketId:BUCKETS.COOL_VIE.id,materials:"M-2002 cartons / loose packs",height:1.30,weight:245,temp:"2–8 °C"},
    {id:"MPM-03",bucketId:BUCKETS.AIR_PAR.id,materials:"M-3003 cartons / loose packs",height:1.15,weight:180,temp:"Ambient · Air"},
  ],
  mpg:[
    {id:"MPG-01",bucketId:BUCKETS.LONG_PAR.id,materials:"M-6006 long goods",height:0.55,weight:279},
    {id:"MPG-02",bucketId:BUCKETS.LONG_PAR.id,materials:"M-6006 long goods",height:0.55,weight:279},
  ],
};

const TU_RESULTS=[
  {id:"TU 1",bucketId:BUCKETS.AMB_VIE.id,type:"Standard Trailer",stacks:2,pallets:3,floor:58,vol:46,weight:39,status:"Selected after Small Box Truck capacity rejection",color:C.cyan},
  {id:"TU 2",bucketId:BUCKETS.COOL_VIE.id,type:"Temperature-Controlled Box Truck",stacks:2,pallets:3,floor:64,vol:58,weight:51,status:"Selected · 2–8 °C capable",color:C.blue},
  {id:"TU 3",bucketId:BUCKETS.AIR_PAR.id,type:"Air-Freight Unit",stacks:2,pallets:2,floor:52,vol:43,weight:31,status:"Selected · Air mode mandatory",color:C.purple},
  {id:"TU 4",bucketId:BUCKETS.AMB_ZRH.id,type:"Standard Trailer",stacks:3,pallets:4,floor:76,vol:61,weight:68,status:"Selected · heavy and overhang positions separated",color:C.green},
  {id:"TU 5",bucketId:BUCKETS.LONG_PAR.id,type:"Long-Goods Trailer",stacks:2,pallets:2,floor:48,vol:39,weight:35,status:"Selected · 4.2 m material length",color:C.amber},
];
const avg=(k)=>Math.round(TU_RESULTS.reduce((a,t)=>a+t[k],0)/TU_RESULTS.length);
const SUMMARY={
  forecastQty:DEMANDS.reduce((a,d)=>a+d.qty,0), materials:DEMANDS.length,
  fullPalletQty:sum("fullPalletUnits"), fullPallets:sum("fullPallets"), layers:sum("layers"), cartons:sum("cartons"), loosePacks:sum("loosePacks"),
  mpl:PALLET_PLAN.mpl.length, mpm:PALLET_PLAN.mpm.length, mpg:PALLET_PLAN.mpg.length,
  totalPallets:sum("fullPallets")+PALLET_PLAN.mpl.length+PALLET_PLAN.mpm.length+PALLET_PLAN.mpg.length,
  totalStacks:TU_RESULTS.reduce((a,t)=>a+t.stacks,0), totalTUs:TU_RESULTS.length,
  volUtil:avg("vol"), weightUtil:avg("weight"), floorUtil:avg("floor"), warnings:5, mdIssues:DEMANDS.filter(d=>!d.valid).length,
  tus:TU_RESULTS,
  insights:[
    `${sum("fullPalletUnits").toLocaleString()} of ${DEMANDS.reduce((a,d)=>a+d.qty,0).toLocaleString()} forecast units are assigned to homogeneous full pallets.`,
    "M-1001 reconciles exactly: 1,250 → 960 full-pallet units → 288 layer units → 0 carton units → 2 loose packs.",
    "Ambient and 2–8 °C Vienna flows remain in separate MPL, MPM and TU objects.",
    "Air-freight M-3003 remains in BKT-PAR-AIR-AMBIENT from decomposition through TU loading.",
    "Long goods M-6006 remain in BKT-PAR-ROAD-LONG and require a dedicated long-goods trailer.",
    "All KPI values are derived from the central illustrative scenario data used by the 3D scene.",
    "D-07 remains blocked because required master data and TU assignment are incomplete.",
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
  const s = opts.scale ?? 0.0085;
  sp.scale.set(cv.width * s, cv.height * s, 1);
  sp.userData.isSceneLabel = true;
  sp.userData.keepVisible = !!opts.keepVisible;
  sp.userData.labelRole = opts.labelRole || "context";
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

function disposeObject3D(root) {
  if (!root) return;
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose?.();
    const materials = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
    materials.forEach((material) => {
      ["map","alphaMap","aoMap","bumpMap","normalMap","roughnessMap","metalnessMap","emissiveMap"].forEach((key) => material[key]?.dispose?.());
      material.dispose?.();
    });
  });
}
function clearGroup(group) {
  if (!group) return;
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    disposeObject3D(child);
  }
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
  const timeoutIdsRef = useRef([]);
  const schedule = useCallback((fn, ms) => {
    const id = window.setTimeout(() => {
      timeoutIdsRef.current = timeoutIdsRef.current.filter((x) => x !== id);
      fn();
    }, ms);
    timeoutIdsRef.current.push(id);
    return id;
  }, []);
  const clearScheduled = useCallback(() => {
    timeoutIdsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutIdsRef.current = [];
  }, []);

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
  const [labelMode, setLabelMode] = useState("minimal");
  const [logFilter, setLogFilter] = useState("all");
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
        const tag = makeLabel(d.id + " · " + d.short + " · " + d.qty + " u · " + d.bucketId, { size: 24 });
        tag.position.set(0, 0.55, 0.3); g.add(tag);
        const col = k % 4, row = Math.floor(k / 4);
        const x = -66 + col * 3.4, z = -3 + row * 4;
        put(g, instant ? x : x - 14, 0, z, { kind: "Demand record", ...d });
        if (!instant) tween(g.position, [x, 0, z], 1.0, k * 0.18);
        t3.pulses.push(stripe);
      });
      lbl("Forecast Input — normalized demand buckets", -62, 6.5, -7, { size: 34, color: "#8ecbff" });
      if (!instant) addLog("Forecast demand normalized: 7 records grouped into planning buckets (lane × bucket × material × mode × temp).");
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
      if (!instant) addLog("Master data validated: 6 of 7 records complete.", "ok");
      if (!instant) addLog("D-07 routed to exception area — missing layer UOM, material height, stackability indicator.", "warn");
    }

    if (i === 2) {
      lbl("Quantity Decomposition — strict bucket lanes", -26, 8.0, -9, { size: 34, color: "#8ecbff", keepVisible:true });
      lbl("Scenario-based heuristic simulation using illustrative master data", -26, 7.1, -9, { size: 22, color: "#ffd97a" });
      const laneDefs=[
        [BUCKETS.AMB_VIE,-36,-5,"A · Vienna road · Ambient"],
        [BUCKETS.COOL_VIE,-29,-5,"B · Vienna road · 2–8 °C"],
        [BUCKETS.AIR_PAR,-22,-5,"C · Paris air · Ambient"],
        [BUCKETS.AMB_ZRH,-35,4,"D · Zurich road · Ambient"],
        [BUCKETS.LONG_PAR,-25,4,"E · Paris road · Long goods"],
      ];
      laneDefs.forEach(([b,x,z,shortLabel])=>{
        const floor=new THREE.Mesh(new THREE.BoxGeometry(7.4,0.08,6.8),new THREE.MeshBasicMaterial({color:new THREE.Color(b.color),transparent:true,opacity:0.12}));
        put(floor,x,0.04,z,{kind:"Planning bucket",...b});
        // Keep only one short, self-explanatory label in the 3D world. Full details are available in the legend and object panel.
        lbl(shortLabel,x,0.32,z-2.55,{size:18,color:b.color,scale:0.0074,keepVisible:true});
      });
      const m=DECOMPOSITIONS.find(x=>x.demand.short==="M-1001");
      const steps=[
        `Initial demand: ${m.demand.qty.toLocaleString()} units`,
        `After full pallets: ${m.remainingSteps[1]} units remaining`,
        `After homogeneous layers: ${m.remainingSteps[2]} units remaining`,
        `After cartons: ${m.remainingSteps[3]} units remaining`,
        `Final loose packs: ${m.loosePacks} units`,
      ];
      steps.forEach((s,k)=>lbl(s,-34,5.9-k*0.65,-8.0,{size:21,color:k===4?"#8df0c6":"#d7e8fb"}));
      lbl("M-1001: 2 × 480 = 960 · 3 × 96 = 288 · 0 cartons · 2 loose packs",-34,2.5,-8,{size:21,color:"#9fd0ff"});
      // bucket-aware representative outputs
      // Pallets are placed in dedicated non-overlapping slots. A standard pallet is 2.4 m wide, so every centre is at least 2.9 m apart.
      const fpObjects=[
        [0,"FP-01",BUCKETS.AMB_VIE.id,-38.1,-5.9],[0,"FP-02",BUCKETS.AMB_VIE.id,-34.2,-4.7],
        [5,"FP-03",BUCKETS.COOL_VIE.id,-31.0,-5.9],[5,"FP-04",BUCKETS.COOL_VIE.id,-27.1,-4.7],
        [4,"AF-01",BUCKETS.AIR_PAR.id,-22,-5.3],
        [3,"FP-05",BUCKETS.AMB_ZRH.id,-37.1,3.0],[3,"FP-06",BUCKETS.AMB_ZRH.id,-33.2,4.4],
      ];
      fpObjects.forEach(([ci,id,bid,x,z],k)=>{
        const slot = new THREE.Mesh(new THREE.BoxGeometry(2.85,0.05,2.05),new THREE.MeshBasicMaterial({color:0x93a4b8,transparent:true,opacity:0.16}));
        put(slot,x,0.075,z,{kind:"Pallet slot",id:`SLOT-${id}`,bucketId:bid});
        const pallet=fullPallet(ci); pallet.scale.set(0.82,0.82,0.82);
        dropIn(pallet,x,0.12,z,{kind:"Pallet",id,bucketId:bid,type:"Homogeneous full pallet",output:"ExecutionCalcPallets"},k*0.08);
      });
      // Layers are shown behind their full pallets rather than in the same footprint.
      [0,1,2].forEach((k)=>dropIn(layerUnit(0),-38.2+k*2.7,0,-1.9,{kind:"Layer",id:`LY-A-${k+1}`,bucketId:BUCKETS.AMB_VIE.id,materials:"M-1001",qty:96},0.2+k*0.08));
      [0,1].forEach((k)=>dropIn(layerUnit(5),-30.8+k*2.9,0,-1.9,{kind:"Layer",id:`LY-C-${k+1}`,bucketId:BUCKETS.COOL_VIE.id,materials:"M-2002",qty:48},0.4+k*0.08));
      [0,1].forEach((k)=>dropIn(longCarrier(2),-27+k*2.8,0.7,4.4,{kind:"MPG input",id:`LG-${k+1}`,bucketId:BUCKETS.LONG_PAR.id,materials:"M-6006"},0.5+k*0.1));
      dropIn(cartonBox(0,0.42),-38.2,0,-7.0,{kind:"Loose pack",id:"PAC-M1001-01",bucketId:BUCKETS.AMB_VIE.id,quantity:1},0.7);
      dropIn(cartonBox(0,0.42),-37.4,0,-7.0,{kind:"Loose pack",id:"PAC-M1001-02",bucketId:BUCKETS.AMB_VIE.id,quantity:1},0.76);
      if (!instant) {
        addLog("M-1001 reconciled: 1,250 − 960 = 290; 290 − 288 = 2; 0 cartons; 2 loose packs.","ok");
        addLog("All decomposition outputs retained their planning-bucket identity.","ok");
      }
    }

    if (i === 3) {
      const plat=new THREE.Mesh(new THREE.BoxGeometry(13,0.15,11),new THREE.MeshLambertMaterial({color:0x1b2636})); put(plat,-8,0.07,0);
      lbl("MPL Builder — complete homogeneous layers only",-8,7.2,-5.5,{size:32,color:"#d9b8ff"});
      const m1=mplPallet([0,0,0]);
      dropIn(m1,-11,0.15,0,{kind:"Pallet",id:"MPL-01",bucketId:BUCKETS.AMB_VIE.id,type:"MPL",materials:"M-1001 · 3 ambient layers",layers:3,temp:"Ambient",rule:"Same source · destination · departure · mode · temperature"});
      const m2=mplPallet([5,5]);
      dropIn(m2,-5.5,0.15,0,{kind:"Pallet",id:"MPL-02",bucketId:BUCKETS.COOL_VIE.id,type:"MPL",materials:"M-2002 · 2 cool layers",layers:2,temp:"2–8 °C",rule:"Temperature-controlled layers remain separate"},0.35);
      lbl("Ambient MPL",-11,3.6,1.7,{size:20,color:BUCKETS.AMB_VIE.color,scale:0.0075});
      lbl("Cool MPL · 2–8 °C",-5.5,3.6,1.7,{size:20,color:BUCKETS.COOL_VIE.color,scale:0.0075});
      lbl("Separate pallets: temperature incompatible",-8,5.0,4.2,{size:20,color:"#ffb3b3",scale:0.0075});
      if(!instant){addLog("MPL-01 created from ambient M-1001 layers only.","ok");addLog("M-2002 rejected from MPL-01: temperature requirement incompatible.","warn");addLog("MPL-02 created for BKT-VIE-ROAD-COOL.","ok");}
    }

    if (i === 4) {
      const plat=new THREE.Mesh(new THREE.BoxGeometry(14,0.15,12),new THREE.MeshLambertMaterial({color:0x1b2636})); put(plat,7,0.07,0);
      lbl("MPM Builder — cartons & loose goods within one bucket",7,7.2,-5.8,{size:31,color:"#d9b8ff"});
      const plans=[
        [PALLET_PLAN.mpm[0],0,4,-2],[PALLET_PLAN.mpm[1],5,8,-2],[PALLET_PLAN.mpm[2],4,11,-2],
      ];
      plans.forEach(([p,ci,x,z],k)=>{
        dropIn(mpmPallet([ci],p.height,10+k*7),x,0.15,z,{kind:"Pallet",...p,type:"MPM — bucket-separated",rule:"source + destination + departure + mode + temperature"},k*0.25);
        lbl(`${p.id} · ${p.temp}`,x,3.6,z+1.6,{size:20,color:"#8df0c6",scale:0.0075});
      });
      lbl("Rejected goods remain in their original bucket",7,5.1,4.1,{size:20,color:"#ffd97a",scale:0.0075});
      if(!instant){addLog("MPM-01 kept in BKT-VIE-ROAD-AMBIENT.","ok");addLog("M-2002 rejected from MPM-01: temperature requirement incompatible.","warn");addLog("M-3003 rejected from road MPMs: different TU mode and destination.","warn");addLog("Three bucket-specific MPM pallets created.","ok");}
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
      if (!instant) addLog("Long goods M-6006 routed to special lane — 2 MPG carriers created.", "warn");
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
      if (!instant) addLog("ST-01 built: FP-01 + MPL-01 stacked (height & weight checks passed).", "ok");
      if (!instant) addLog("Heavy pallet FP-05 non-stackable → single-pallet stack.", "warn");
      if (!instant) addLog("Air-freight pallets kept as single stacks.");
      if (!instant) addLog("10 transport-ready stacks created in total.");
    }

    if (i === 7) {
      lbl("Transport-Unit Selection — lane-specific priority sequences",40,9.0,-9,{size:32,color:"#7fe7f7"});
      const rows=[
        {b:BUCKETS.AMB_VIE,z:-6,items:["1 Small Box Truck — Rejected: required 22.4 m³ > 18.0 m³","2 Standard Trailer — Selected"]},
        {b:BUCKETS.COOL_VIE,z:-2,items:["1 Temperature-Controlled Box Truck — Selected","2 Temperature-Controlled Trailer — not evaluated"]},
        {b:BUCKETS.AIR_PAR,z:2,items:["1 Air-Freight Unit — Selected","2 Air-Freight ULD — not evaluated"]},
        {b:BUCKETS.LONG_PAR,z:6,items:["1 Long-Goods Trailer — Selected","2 Extended-Length Trailer — not evaluated"]},
      ];
      rows.forEach((r,ri)=>{
        lbl(`${r.b.id} · ${r.b.source} → ${r.b.destination} · ${r.b.mode} · ${r.b.temperature}`,40,7.4,r.z,{size:21,color:r.b.color});
        r.items.forEach((txt,k)=>lbl(txt,40,6.7-k*0.62,r.z,{size:19,color:txt.includes("Rejected")?"#ffb3b3":"#8df0c6"}));
      });
      lbl("High-Cube dimensional check",50,7.4,-6,{size:23,color:"#ffd97a"});
      lbl("Stack height 4.05 m",50,6.7,-6,{size:20,color:"#cbd5e1"});
      lbl("Usable inner height 3.85 m − loading margin 0.10 m = 3.75 m",50,6.1,-6,{size:18,color:"#cbd5e1"});
      lbl("Rejected by 0.30 m",50,5.5,-6,{size:22,color:"#ffb3b3"});
      if(!instant){addLog("BKT-VIE-ROAD-AMBIENT: Small Box Truck rejected — 22.4 m³ required vs 18.0 m³ available.","warn");addLog("BKT-VIE-ROAD-AMBIENT: Standard Trailer selected at sequence 2.","ok");addLog("BKT-VIE-ROAD-COOL: Temperature-Controlled Box Truck selected at sequence 1.","ok");addLog("BKT-PAR-AIR-AMBIENT: Air-Freight Unit selected; road TUs rejected by mode.","ok");addLog("High-Cube rejected: 4.05 m stack exceeds 3.75 m usable height by 0.30 m.","warn");}
    }

    if (i === 8) {
      lbl("Loading Docks & Calculated Capacity Result",61,10.0,-12,{size:34,color:"#7fe7f7"});
      const layouts=[
        {res:TU_RESULTS[0],kind:"standard",x:53,z:-7,loads:[[0,-2.8,-0.65],[0,-0.5,0.65],[0,2.0,-0.65]]},
        {res:TU_RESULTS[1],kind:"temp",x:53,z:3,loads:[[5,-2.5,-0.55],[5,0.1,0.55],[5,2.3,-0.55]]},
        {res:TU_RESULTS[2],kind:"air",x:66,z:-7,loads:[[4,-1.8,0],[4,1.5,0]]},
        {res:TU_RESULTS[3],kind:"standard",x:66,z:3,loads:[[3,-2.8,-0.65],[3,-0.5,0.65],[1,2.0,-0.65]]},
        {res:TU_RESULTS[4],kind:"long",x:80,z:-2,loads:[]},
      ];
      layouts.forEach((cfg,ti)=>{
        const truck=truckUnit(cfg.kind); put(truck,cfg.x,0,cfg.z,{kind:"Transport unit",...cfg.res});
        cfg.loads.forEach(([ci,dx,dz],k)=>{
          const load=fullPallet(ci); load.scale.set(0.68,0.68,0.68);
          const target=[cfg.x+dx,0.82,cfg.z+dz]; load.position.set(target[0],instant?target[1]:8,target[2]);
          load.traverse(o=>{o.userData.pick={kind:"Loaded stack",id:`${cfg.res.id}-ST-${k+1}`,bucketId:cfg.res.bucketId,tu:cfg.res.id};}); D.add(load);
          if(!instant)tween(load.position,target,0.75,0.25+ti*0.12+k*0.14);
        });
        lbl(`${cfg.res.id} · ${cfg.res.type}`,cfg.x,6.1,cfg.z,{size:23,color:cfg.res.color});
        lbl(`${cfg.res.bucketId} · floor ${cfg.res.floor}% · vol ${cfg.res.vol}% · wt ${cfg.res.weight}%`,cfg.x,6.8,cfg.z,{size:18,color:"#cbd5e1"});
      });
      // Long carriers are placed fully inside the dedicated trailer and separated longitudinally.
      [[-2.4,-0.45],[2.4,0.45]].forEach(([dx,dz],k)=>{
        const load=longCarrier(2); load.scale.set(0.62,0.62,0.62); const target=[80+dx,0.82,-2+dz]; load.position.set(target[0],instant?target[1]:8,target[2]);
        load.traverse(o=>{o.userData.pick={kind:"Loaded long-goods stack",id:`TU 5-ST-${k+1}`,bucketId:BUCKETS.LONG_PAR.id,tu:"TU 5"};}); D.add(load);
        if(!instant)tween(load.position,target,0.8,1.2+k*0.22);
      });
      lbl("Truck and pallet geometry separated: all loads use trailer-relative slots",66,9.0,8,{size:23,color:"#8df0c6"});
      if(!instant){TU_RESULTS.forEach(t=>addLog(`${t.id} loaded for ${t.bucketId}: ${t.stacks} stacks / ${t.pallets} pallets.`,"ok"));addLog(`Loading completed — ${SUMMARY.totalTUs} lane-specific transport units planned.`,"ok");}
    }  }, [addLog, tween]);

  /* ------------------------ phase navigation ------------------------ */
  const gotoPhase = useCallback((i, viaAuto = false) => {
    i = Math.max(0, Math.min(PHASES.length - 1, i));
    const t3 = threeRef.current; if (!t3) return;
    if (i < builtRef.current) {
      // rebuild world from scratch up to i (instant)
      clearScheduled();
      clearGroup(t3.dynamic);
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
      schedule(() => {
        if (phaseRef.current === PHASES.length - 1) setShowDash(true);
      }, viaAuto ? 3500 : 1200);
    }
  }, [buildPhase, flyCam, schedule, clearScheduled]);

  const startSim = useCallback(() => {
    setStarted(true);
    setPlaying(true); playRef.current = true;
    clearScheduled();
    schedule(() => gotoPhase(0), 60);
  }, [gotoPhase, schedule, clearScheduled]);

  const resetSim = useCallback(() => {
    const t3 = threeRef.current; if (!t3) return;
    clearScheduled();
    clearGroup(t3.dynamic);
    t3.tweens.length = 0; t3.pulses.length = 0;
    builtRef.current = -1; phaseRef.current = -1; timerRef.current = 0; logSeq.current = 0;
    setLogs([]); setSelected(null); setShowDash(false); setPhase(-1);
    setPlaying(false); playRef.current = false;
    flyCam([0, 55, 85], [0, 2, 4]);
    schedule(() => gotoPhase(0), 400);
  }, [flyCam, gotoPhase, schedule, clearScheduled]);


  useEffect(() => () => clearScheduled(), [clearScheduled]);

  useEffect(() => {
    const dynamic = threeRef.current?.dynamic;
    if (!dynamic) return;
    dynamic.traverse((o) => {
      if (o.userData?.isSceneLabel) {
        o.visible = labelMode === "all" || o.userData.keepVisible;
      }
    });
  }, [labelMode, phase]);

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
        drag.d0 = d; cam.anim = null; autoCamRef.current = false; setAutoCam(false); drag.moved = true;
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
      autoCamRef.current = false; setAutoCam(false);
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
  const logCategory = (text) => /reject|incompatible|exceed|blocked/i.test(text) ? "rejections" : /warn|exception|missing/i.test(text) ? "warnings" : "decisions";
  const filteredLogs = logs.filter((l) => logFilter === "all" || logCategory(l.text) === logFilter);

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
          <div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>Scene labels</div>
          <div style={{ display:"flex", gap:5 }}>
            {["minimal","all"].map((m)=><button key={m} style={{...S.btn,flex:1,padding:"5px 0",...(labelMode===m?S.btnA:{})}} onClick={()=>setLabelMode(m)}>{m==="minimal"?"Minimal":"All"}</button>)}
          </div>
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
          <details open={phase === 2} style={{ marginTop: 9, fontSize: 11.5, color: "#c7d5e3" }}>
            <summary style={{ cursor: "pointer", color: "#9fd0ff", fontWeight: 700 }}>Legend · planning buckets and objects</summary>
            <div style={{ marginTop: 7, display: "grid", gap: 5 }}>
              {[
                [BUCKETS.AMB_VIE.color, "A · Vienna road · Ambient"],
                [BUCKETS.COOL_VIE.color, "B · Vienna road · 2–8 °C"],
                [BUCKETS.AIR_PAR.color, "C · Paris air · Ambient"],
                [BUCKETS.AMB_ZRH.color, "D · Zurich road · Ambient"],
                [BUCKETS.LONG_PAR.color, "E · Paris road · Long goods"],
              ].map(([color, label]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: "inline-block", flex: "0 0 auto" }} />
                  <span>{label}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid " + C.border, marginTop: 3, paddingTop: 5, color: C.dim }}>
                Solid block = full pallet · Thin block = homogeneous layer · Small box = carton/loose pack · Long carrier = MPG input. Click an object for its complete bucket ID and master data.<div style={{marginTop:6,color:"#d7e8fb"}}><b>MPL</b> = Mixed-Layer Pallet, built only from complete homogeneous layers.<br/><b>MPM</b> = Mixed-Material Pallet, built from cartons and loose packs inside one compatible bucket.<br/><b>MPG</b> = Long-Goods Pallet, handled in a dedicated oversized-material flow.</div><div style={{marginTop:6,color:C.dim}}>Planning rules: same source, destination, departure, mode and compatible temperature. Air, cool and long-goods flows remain separated unless an explicit compatibility rule exists.</div>
              </div>
            </div>
          </details>
          {phase === 2 && (
            <div style={{ marginTop:9, padding:9, border:`1px solid ${C.border}`, borderRadius:8, background:"rgba(9,16,24,.62)" }}>
              <div style={{ color:C.cyan, fontWeight:700, marginBottom:6 }}>M-1001 quantity reconciliation</div>
              <div style={{ display:"grid", gap:5, fontFamily:"Consolas, monospace", fontSize:11.5 }}>
                {[
                  ["Initial demand","1,250 units"],
                  ["Full pallets","−960 → 290 remain"],
                  ["Homogeneous layers","−288 → 2 remain"],
                  ["Cartons","−0 → 2 remain"],
                  ["Loose packs","2 → final remainder 0"],
                ].map(([a,b])=><div key={a} style={{display:"flex",justifyContent:"space-between",gap:8}}><span style={{color:C.dim}}>{a}</span><span>{b}</span></div>)}
              </div>
            </div>
          )}
          {phase === 7 && (
            <div style={{ marginTop:9 }}>
              <div style={{color:C.cyan,fontWeight:700,marginBottom:6}}>Lane-specific TU decision sequence</div>
              {[
                ["1","Small Box Truck","Rejected","22.4 m³ required vs 18.0 m³"],
                ["2","Standard Trailer","Selected","All lane constraints fulfilled"],
                ["3","High-Cube Trailer","Not evaluated","Earlier feasible candidate selected"],
              ].map(([seq,candidate,result,reason])=><div key={seq} style={{display:"grid",gridTemplateColumns:"22px 1fr",gap:6,padding:"5px 0",borderTop:`1px solid ${C.border}`}}><span style={{color:C.dim}}>{seq}</span><div><div style={{color:result==="Selected"?C.green:result==="Rejected"?C.red:C.dim,fontWeight:700}}>{candidate} · {result}</div><div style={{fontSize:10.5,color:C.dim}}>{reason}</div></div></div>)}
            </div>
          )}
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
              <div style={{ marginTop:8 }}>
                <div style={{display:"flex",gap:5,marginBottom:7}}>
                  {["all","decisions","rejections","warnings"].map((f)=><button key={f} style={{...S.btn,padding:"4px 8px",fontSize:10,...(logFilter===f?S.btnA:{})}} onClick={(e)=>{e.stopPropagation();setLogFilter(f)}}>{f[0].toUpperCase()+f.slice(1)}</button>)}
                </div>
              <div style={{ maxHeight: 150, overflowY: "auto", fontSize: 12, fontFamily: "Consolas, monospace" }}>
                {filteredLogs.slice().reverse().map((l) => (
                  <div key={l.step} style={{ padding: "2px 0", color: kindColor(l.kind) }}>
                    #{String(l.step).padStart(2, "0")} · {l.text}
                  </div>
                ))}
                {!filteredLogs.length && <div style={{ color: C.dim }}>No matching entries.</div>}
              </div>
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
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,marginTop:14}}>
              {[
                ["Result",`${SUMMARY.totalTUs} transport units planned`],
                ["Main driver","Temperature, air and long-goods separation"],
                ["Data quality risk",`${SUMMARY.mdIssues} blocked material record`],
              ].map(([a,b])=><div key={a} style={{padding:10,border:`1px solid ${C.border}`,borderRadius:8,background:"rgba(12,19,27,.78)"}}><div style={{fontSize:10,color:C.dim,textTransform:"uppercase"}}>{a}</div><div style={{marginTop:4,fontWeight:700}}>{b}</div></div>)}
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
