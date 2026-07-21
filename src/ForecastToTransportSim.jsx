import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/**
 * Forecast-to-Transport Capacity Simulation
 * Management-pitch version
 *
 * Improvements:
 * - clearly separated process sections
 * - no overlap between MPM / Long Goods / TU Selection / Loading
 * - simplified TU candidate sequence
 * - only selected transport units shown as large 3D objects
 * - reduced and larger labels
 * - physically consistent floor / pallet / truck placement
 * - active phase highlighted, previous phases dimmed
 * - management-focused result view
 */

const COLORS = {
  bg: "#081019",
  floor: 0x111b26,
  grid: 0x233245,
  text: "#e8f0f7",
  muted: "#8ea3b7",
  panel: "rgba(10,18,28,.94)",
  border: "rgba(140,170,200,.18)",
  blue: "#60a5fa",
  cyan: "#22d3ee",
  green: "#34d399",
  amber: "#fbbf24",
  red: "#f87171",
  purple: "#c084fc",
};

const LANES = [
  { key: "AMB_VIE", id: "Vienna · Road · Ambient", z: -12, color: "#60a5fa" },
  { key: "COOL_VIE", id: "Vienna · Road · 2–8 °C", z: -6, color: "#22d3ee" },
  { key: "AIR_PAR", id: "Paris · Air · Ambient", z: 0, color: "#c084fc" },
  { key: "AMB_ZRH", id: "Zurich · Road · Ambient", z: 6, color: "#34d399" },
  { key: "LONG_PAR", id: "Paris · Road · Long goods", z: 12, color: "#fbbf24" },
];

const SECTIONS = [
  { n: 1, key: "input", title: "Forecast Input", x: -86, cam: [-86, 22, 38], target: [-86, 2, 0] },
  { n: 2, key: "validation", title: "Validation", x: -64, cam: [-64, 21, 36], target: [-64, 2, 0] },
  { n: 3, key: "decomposition", title: "Decomposition", x: -42, cam: [-42, 22, 38], target: [-42, 2, 0] },
  { n: 4, key: "mpl", title: "MPL Builder", x: -20, cam: [-20, 20, 36], target: [-20, 2, 0] },
  { n: 5, key: "mpm", title: "MPM Builder", x: 2, cam: [2, 20, 36], target: [2, 2, 0] },
  { n: 6, key: "long", title: "Long-Goods Handling", x: 24, cam: [24, 18, 31], target: [24, 2, 10] },
  { n: 7, key: "stacking", title: "Stack Building", x: 48, cam: [48, 22, 38], target: [48, 2, 0] },
  { n: 8, key: "selection", title: "TU Selection", x: 74, cam: [74, 24, 42], target: [74, 2, 0] },
  { n: 9, key: "loading", title: "Loading & Result", x: 108, cam: [108, 28, 52], target: [108, 2, 0] },
];


const SECTION_DETAILS = [
  {
    pitch: "The weekly forecast is split into five transport-relevant demand streams.",
    full: "Each demand record combines material, forecast quantity, destination, departure mode and special handling requirements. The coloured lanes show which quantities may be planned together.",
    input: "Forecast quantities by material and destination",
    output: "Five planning buckets",
    decision: "Which demand belongs to the same transport flow?",
  },
  {
    pitch: "Master data is checked before the forecast can enter capacity planning.",
    full: "The simulation checks dimensions, weight, logistics units, stackability, temperature requirements, route assignment and allowed transport-unit types. Incomplete records are blocked.",
    input: "Normalized demand records",
    output: "Released or blocked demand",
    decision: "Is the information complete enough to plan?",
  },
  {
    pitch: "Forecast quantities are converted into physical logistics units.",
    full: "The quantity is sequentially decomposed into full pallets, homogeneous layers, cartons and loose packs. This creates the physical building blocks for later loading.",
    input: "Released forecast quantities",
    output: "Pallets, layers, cartons and loose packs",
    decision: "How much physical handling capacity is required?",
  },
  {
    pitch: "Complete homogeneous layers are combined into mixed-layer pallets.",
    full: "Only compatible complete layers are combined. Destination, departure, transport mode and temperature requirements remain separated.",
    input: "Complete homogeneous layers",
    output: "Mixed-layer pallets (MPL)",
    decision: "Which layers can safely share one pallet?",
  },
  {
    pitch: "Cartons and loose packs are combined into mixed-material pallets.",
    full: "Remaining cartons and individual packs are arranged on compatible pallets. Cross-destination, cross-mode and cross-temperature combinations remain prohibited.",
    input: "Cartons and loose packs",
    output: "Mixed-material pallets (MPM)",
    decision: "How can the remaining volume be palletized?",
  },
  {
    pitch: "Long materials follow a dedicated handling and loading process.",
    full: "Materials exceeding the standard pallet footprint are placed on long-goods carriers and routed to suitable transport units.",
    input: "Overlength forecast demand",
    output: "Long-goods carriers",
    decision: "Which dedicated equipment is required?",
  },
  {
    pitch: "Pallets are converted into stable transport-ready stacks.",
    full: "Stackability, height, weight and special handling rules determine whether pallets can be stacked or must remain single.",
    input: "Finished pallets and carriers",
    output: "Transport-ready stacks",
    decision: "Which units may be stacked without risk?",
  },
  {
    pitch: "The first feasible transport unit is selected for every planning lane.",
    full: "Candidate transport units are evaluated against mode, temperature, dimensions, floor space and weight. Rejected and selected alternatives are shown as a decision sequence.",
    input: "Transport-ready stacks",
    output: "Selected transport-unit type per lane",
    decision: "Which vehicle can carry the planned load?",
  },
  {
    pitch: "The selected transport units make the forecasted capacity requirement tangible.",
    full: "The final loading view shows one selected transport unit per lane together with floor, volume and weight utilization.",
    input: "Selected transport units and stacks",
    output: "Five planned transport units",
    decision: "How much transport capacity is required?",
  },
];

const DEMANDS = [
  { id: "D-01", lane: "AMB_VIE", material: "M-1001", qty: 1250, valid: true, color: 0x4f8ef7 },
  { id: "D-02", lane: "COOL_VIE", material: "M-2002", qty: 620, valid: true, color: 0x22d3ee },
  { id: "D-03", lane: "AIR_PAR", material: "M-3003", qty: 340, valid: true, color: 0xc084fc },
  { id: "D-04", lane: "AMB_ZRH", material: "M-4004", qty: 900, valid: true, color: 0xef4444 },
  { id: "D-05", lane: "AMB_ZRH", material: "M-5005", qty: 260, valid: true, color: 0x34d399 },
  { id: "D-06", lane: "LONG_PAR", material: "M-6006", qty: 180, valid: true, color: 0xf59e0b },
  { id: "D-07", lane: "AMB_VIE", material: "M-7007", qty: 95, valid: false, color: 0x94a3b8 },
];

const TU_DECISIONS = [
  { lane: "AMB_VIE", rejected: "Small Box Truck", selected: "Standard Trailer", reason: "Capacity insufficient", kind: "standard" },
  { lane: "COOL_VIE", rejected: null, selected: "Temperature-Controlled Truck", reason: "2–8 °C required", kind: "temp" },
  { lane: "AIR_PAR", rejected: "Road Trailer", selected: "Air-Freight Unit", reason: "Air mode mandatory", kind: "air" },
  { lane: "AMB_ZRH", rejected: "Small Box Truck", selected: "Standard Trailer", reason: "Heavy and overhang positions", kind: "standard" },
  { lane: "LONG_PAR", rejected: "Standard Trailer", selected: "Long-Goods Trailer", reason: "4.2 m material length", kind: "long" },
];

const FINAL_TUS = [
  { id: "TU 1", lane: "AMB_VIE", type: "Standard Trailer", floor: 58, volume: 46, weight: 39, kind: "standard" },
  { id: "TU 2", lane: "COOL_VIE", type: "Temperature-Controlled Truck", floor: 64, volume: 58, weight: 51, kind: "temp" },
  { id: "TU 3", lane: "AIR_PAR", type: "Air-Freight Unit", floor: 52, volume: 43, weight: 31, kind: "air" },
  { id: "TU 4", lane: "AMB_ZRH", type: "Standard Trailer", floor: 76, volume: 61, weight: 68, kind: "standard" },
  { id: "TU 5", lane: "LONG_PAR", type: "Long-Goods Trailer", floor: 48, volume: 39, weight: 35, kind: "long" },
];

function lane(key) {
  return LANES.find((l) => l.key === key);
}

function makeLabel(text, {
  size = 42,
  color = COLORS.text,
  background = "rgba(7,13,20,.82)",
  scale = 0.009,
} = {}) {
  const canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d");
  ctx.font = `600 ${size}px Segoe UI, Arial`;
  const width = Math.ceil(ctx.measureText(text).width + 34);
  canvas.width = Math.min(width, 1300);
  canvas.height = size + 28;

  ctx = canvas.getContext("2d");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `600 ${size}px Segoe UI, Arial`;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, 17, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  }));
  sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
  return sprite;
}

function edge(mesh, color = 0x0b1220) {
  const lines = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({ color })
  );
  lines.position.copy(mesh.position);
  return lines;
}

function pallet(color = 0x4f8ef7, height = 1.35) {
  const g = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: 0x8a6a45 });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.45), wood);
  deck.position.y = 0.28;
  g.add(deck);

  [-0.75, 0, 0.75].forEach((x) => {
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 1.45), wood);
    block.position.set(x, 0.11, 0);
    g.add(block);
  });

  const load = new THREE.Mesh(
    new THREE.BoxGeometry(2.08, height, 1.34),
    new THREE.MeshLambertMaterial({ color })
  );
  load.position.y = 0.34 + height / 2;
  g.add(load);
  g.add(edge(load));
  return g;
}

function layerPallet(colors) {
  const g = new THREE.Group();
  const base = pallet(0x64748b, 0.02);
  base.children.slice(4).forEach((c) => c.visible = false);
  g.add(base);

  colors.forEach((color, i) => {
    const layerMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.08, 0.38, 1.34),
      new THREE.MeshLambertMaterial({ color })
    );
    layerMesh.position.y = 0.42 + i * 0.42;
    g.add(layerMesh);
    g.add(edge(layerMesh));
  });
  return g;
}

function mixedPallet(colors) {
  const g = new THREE.Group();
  const base = pallet(0x64748b, 0.02);
  base.children.slice(4).forEach((c) => c.visible = false);
  g.add(base);

  const positions = [
    [-0.52, 0.60, -0.32], [0.52, 0.60, -0.32],
    [-0.52, 0.60, 0.32], [0.52, 0.60, 0.32],
    [-0.52, 1.10, -0.32], [0.52, 1.10, -0.32],
  ];
  positions.forEach((p, i) => {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.42, 0.55),
      new THREE.MeshLambertMaterial({ color: colors[i % colors.length] })
    );
    box.position.set(...p);
    g.add(box);
    g.add(edge(box));
  });
  return g;
}

function longCarrier(color = 0xf59e0b) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(6.5, 0.22, 1.3),
    new THREE.MeshLambertMaterial({ color: 0x64748b })
  );
  base.position.y = 0.11;
  g.add(base);
  g.add(edge(base, 0x94a3b8));

  for (let i = 0; i < 6; i += 1) {
    const profile = new THREE.Mesh(
      new THREE.BoxGeometry(6.9, 0.13, 0.13),
      new THREE.MeshLambertMaterial({ color })
    );
    profile.position.set(0, 0.32 + Math.floor(i / 3) * 0.18, -0.34 + (i % 3) * 0.34);
    g.add(profile);
  }
  return g;
}

function truck(kind = "standard") {
  const cfg = {
    standard: { length: 10, height: 3.1, width: 3, color: 0x9aa7b5 },
    temp: { length: 9.2, height: 3.0, width: 3, color: 0x60a5fa },
    air: { length: 6.5, height: 2.7, width: 2.8, color: 0xc084fc },
    long: { length: 12, height: 3.0, width: 3, color: 0xfbbf24 },
    small: { length: 6, height: 2.5, width: 2.7, color: 0x84cc16 },
  }[kind];

  const g = new THREE.Group();
  const floorY = 0.72;

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(cfg.length, cfg.height, cfg.width),
    new THREE.MeshLambertMaterial({
      color: cfg.color,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    })
  );
  body.position.y = floorY + cfg.height / 2;
  g.add(body);
  g.add(edge(body, cfg.color));

  const loadingFloor = new THREE.Mesh(
    new THREE.BoxGeometry(cfg.length, 0.12, cfg.width),
    new THREE.MeshLambertMaterial({ color: 0x334155 })
  );
  loadingFloor.position.y = floorY;
  g.add(loadingFloor);

  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 2, cfg.width * 0.9),
    new THREE.MeshLambertMaterial({ color: 0x475569 })
  );
  cab.position.set(-cfg.length / 2 - 1.05, 1.65, 0);
  g.add(cab);
  g.add(edge(cab, 0x64748b));

  [-cfg.length / 2 + 1.4, cfg.length / 2 - 1.4, -cfg.length / 2 - 1.05].forEach((x) => {
    [-cfg.width / 2, cfg.width / 2].forEach((z) => {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.25, 14),
        new THREE.MeshLambertMaterial({ color: 0x17202c })
      );
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.42, z);
      g.add(wheel);
    });
  });

  g.userData.loadingFloorY = floorY + 0.08;
  return g;
}

function decisionCard(text, ok) {
  const g = new THREE.Group();
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 1.6, 0.15),
    new THREE.MeshLambertMaterial({ color: ok ? 0x123a2c : 0x4a2020 })
  );
  panel.position.y = 1.1;
  g.add(panel);
  g.add(edge(panel, ok ? 0x34d399 : 0xf87171));

  const label = makeLabel(`${ok ? "✓" : "✕"} ${text}`, {
    size: 28,
    color: ok ? "#9af1c9" : "#ffb2b2",
    scale: 0.0072,
  });
  label.position.set(0, 1.1, 0.12);
  g.add(label);
  return g;
}

function ring(color, radius = 2.3, opacity = 0.85) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(radius, radius + 0.15, 48),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.025;
  return mesh;
}

function addAt(group, object, x, y, z) {
  object.position.set(x, y, z);
  group.add(object);
  return object;
}

function phaseOpacity(sectionIndex, activePhase) {
  if (sectionIndex === activePhase) return 1;
  if (sectionIndex < activePhase) return 0.28;
  return 0.08;
}

function setGroupOpacity(root, opacity) {
  root.traverse((object) => {
    if (!object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (material.transparent || opacity < 1) {
        material.transparent = true;
        const base = material.userData.baseOpacity ?? material.opacity ?? 1;
        material.userData.baseOpacity = base;
        material.opacity = Math.min(base, opacity);
      }
    });
  });
}

export default function ForecastToTransportSimManagement() {
  const mountRef = useRef(null);
  const threeRef = useRef(null);
  const phaseRef = useRef(0);
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [simulationMode, setSimulationMode] = useState("pitch");

  const current = SECTIONS[phase];

  const managementInsights = useMemo(() => ([
    "Forecast demand is transformed into transport-ready loading units.",
    "Temperature-controlled, air-freight and long-goods flows remain separated.",
    "Five transport units are required in the illustrated planning scenario.",
  ]), []);

  useEffect(() => {
    phaseRef.current = phase;
    const world = threeRef.current;
    if (!world) return;

    world.phaseGroups.forEach((group, index) => {
      group.visible = index <= phase;
      setGroupOpacity(group, phaseOpacity(index, phase));
    });

    const s = SECTIONS[phase];
    world.flyCamera(s.cam, s.target);
  }, [phase]);

  useEffect(() => {
    if (!playing) return undefined;
    const id = window.setInterval(() => {
      setPhase((p) => {
        if (p >= SECTIONS.length - 1) {
          setPlaying(false);
          setShowResult(true);
          return p;
        }
        return p + 1;
      });
    }, 6500);
    return () => window.clearInterval(id);
  }, [playing]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.bg);
    scene.fog = new THREE.Fog(COLORS.bg, 130, 260);

    const camera = new THREE.PerspectiveCamera(
      48,
      mount.clientWidth / mount.clientHeight,
      0.1,
      500
    );

    scene.add(new THREE.AmbientLight(0xffffff, 0.58));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(40, 70, 45);
    scene.add(keyLight);

    const staticGroup = new THREE.Group();
    scene.add(staticGroup);

    const worldLeft = -98;
    const worldRight = 126;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(worldRight - worldLeft + 20, 42),
      new THREE.MeshLambertMaterial({ color: COLORS.floor })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.x = (worldLeft + worldRight) / 2;
    staticGroup.add(floor);

    const grid = new THREE.GridHelper(240, 96, COLORS.grid, 0x192636);
    grid.position.set(14, 0.012, 0);
    staticGroup.add(grid);

    LANES.forEach((ln) => {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(worldRight - worldLeft, 3.2),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(ln.color),
          transparent: true,
          opacity: 0.065,
        })
      );
      strip.rotation.x = -Math.PI / 2;
      strip.position.set((worldLeft + worldRight) / 2, 0.02, ln.z);
      staticGroup.add(strip);

      const label = makeLabel(ln.id, {
        size: 32,
        color: ln.color,
        scale: 0.008,
      });
      label.position.set(worldLeft + 5, 0.65, ln.z);
      staticGroup.add(label);
    });

    SECTIONS.forEach((s, index) => {
      const marker = makeLabel(`${String(s.n).padStart(2, "0")}  ${s.title.toUpperCase()}`, {
        size: 34,
        color: index === 0 ? "#bfe9ff" : "#71879b",
        scale: 0.0084,
      });
      marker.position.set(s.x, 0.55, 17.5);
      staticGroup.add(marker);

      if (index > 0) {
        const dividerX = (s.x + SECTIONS[index - 1].x) / 2;
        const divider = new THREE.Mesh(
          new THREE.PlaneGeometry(0.13, 33),
          new THREE.MeshBasicMaterial({
            color: 0x38506a,
            transparent: true,
            opacity: 0.46,
          })
        );
        divider.rotation.x = -Math.PI / 2;
        divider.position.set(dividerX, 0.025, 0);
        staticGroup.add(divider);
      }
    });

    const phaseGroups = SECTIONS.map(() => {
      const group = new THREE.Group();
      scene.add(group);
      return group;
    });

    // Phase 1 — Forecast Input
    {
      const g = phaseGroups[0];

      const inputTitle = makeLabel("FORECAST DEMAND → TRANSPORT PLANNING BUCKETS", {
        size: 36,
        color: "#bfe9ff",
        scale: 0.0082,
      });
      inputTitle.position.set(SECTIONS[0].x, 7.0, -16.4);
      g.add(inputTitle);

      const inputHint = makeLabel("Each card = one material forecast · Each coloured lane = one transport flow", {
        size: 27,
        color: "#c6d5e2",
        scale: 0.0072,
      });
      inputHint.position.set(SECTIONS[0].x, 5.9, -16.4);
      g.add(inputHint);

      LANES.forEach((ln) => {
        const laneHeader = makeLabel(`PLANNING BUCKET · ${ln.id}`, {
          size: 25,
          color: ln.color,
          scale: 0.0068,
        });
        laneHeader.position.set(SECTIONS[0].x - 4.7, 3.7, ln.z);
        g.add(laneHeader);
      });

      DEMANDS.forEach((d, index) => {
        const ln = lane(d.lane);
        const card = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(3.4, 2.0, 0.15),
          new THREE.MeshLambertMaterial({ color: d.valid ? 0x153047 : 0x47391b })
        );
        body.position.y = 1.25;
        card.add(body);
        card.add(edge(body, d.valid ? d.color : 0xfbbf24));
        const txt = makeLabel(`${d.material} · FORECAST ${d.qty.toLocaleString()} UNITS`, {
          size: 25,
          color: d.valid ? COLORS.text : "#ffe19a",
          scale: 0.0067,
        });
        txt.position.set(0, 1.42, 0.13);
        card.add(txt);

        const status = makeLabel(
          d.valid ? `${d.id} · ready for planning` : `${d.id} · incomplete master data`,
          {
            size: 21,
            color: d.valid ? "#9af1c9" : "#ffe19a",
            background: "rgba(0,0,0,0)",
            scale: 0.0058,
          }
        );
        status.position.set(0, 0.82, 0.13);
        card.add(status);

        addAt(g, card, SECTIONS[0].x + (index === 6 ? 4.2 : 0), 0, ln.z);
      });
    }

    // Phase 2 — Validation
    {
      const g = phaseGroups[1];
      LANES.forEach((ln) => {
        const gate = new THREE.Group();
        [-1.45, 1.45].forEach((z) => {
          const post = new THREE.Mesh(
            new THREE.BoxGeometry(0.42, 4.2, 0.42),
            new THREE.MeshLambertMaterial({ color: 0x2c3d50 })
          );
          post.position.set(0, 2.1, z);
          gate.add(post);
        });
        const top = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.42, 3.3),
          new THREE.MeshLambertMaterial({ color: 0x2c3d50 })
        );
        top.position.set(0, 4.0, 0);
        gate.add(top);
        addAt(g, gate, SECTIONS[1].x, 0, ln.z);

        const ok = decisionCard("Validated", true);
        ok.scale.set(0.62, 0.62, 0.62);
        addAt(g, ok, SECTIONS[1].x + 4.8, 0, ln.z);
      });

      const blocked = decisionCard("D-07 blocked", false);
      blocked.scale.set(0.7, 0.7, 0.7);
      addAt(g, blocked, SECTIONS[1].x + 4.8, 0, -16.2);
    }

    // Phase 3 — Decomposition
    {
      const g = phaseGroups[2];
      const x = SECTIONS[2].x;
      const layouts = [
        { lane: "AMB_VIE", pallets: 2, layers: 3, boxes: 2, color: 0x4f8ef7 },
        { lane: "COOL_VIE", pallets: 2, layers: 2, boxes: 1, color: 0x22d3ee },
        { lane: "AIR_PAR", pallets: 2, layers: 0, boxes: 2, color: 0xc084fc },
        { lane: "AMB_ZRH", pallets: 2, layers: 2, boxes: 1, color: 0xef4444 },
      ];

      layouts.forEach((item) => {
        const ln = lane(item.lane);
        let px = x - 6.5;
        for (let i = 0; i < item.pallets; i += 1) {
          const p = pallet(item.color);
          p.scale.setScalar(0.62);
          addAt(g, p, px, 0.03, ln.z);
          px += 2;
        }
        for (let i = 0; i < item.layers; i += 1) {
          const l = new THREE.Mesh(
            new THREE.BoxGeometry(1.45, 0.30, 0.9),
            new THREE.MeshLambertMaterial({ color: item.color })
          );
          l.position.y = 0.15;
          addAt(g, l, px, 0, ln.z);
          px += 1.65;
        }
        for (let i = 0; i < item.boxes; i += 1) {
          const b = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 0.5, 0.55),
            new THREE.MeshLambertMaterial({ color: item.color })
          );
          b.position.y = 0.25;
          addAt(g, b, px, 0, ln.z);
          px += 0.95;
        }
      });

      const lg = longCarrier();
      lg.scale.setScalar(0.52);
      addAt(g, lg, x, 0.12, lane("LONG_PAR").z);
    }

    // Phase 4 — MPL
    {
      const g = phaseGroups[3];
      [
        ["AMB_VIE", [0x4f8ef7, 0x4f8ef7, 0x4f8ef7], "Ambient MPL"],
        ["COOL_VIE", [0x22d3ee, 0x22d3ee], "Cool MPL"],
        ["AMB_ZRH", [0xef4444, 0xef4444], "Zurich MPL"],
      ].forEach(([laneKey, colors, title]) => {
        const ln = lane(laneKey);
        const p = layerPallet(colors);
        addAt(g, p, SECTIONS[3].x, 0.02, ln.z);
        const label = makeLabel(title, { size: 28, color: ln.color, scale: 0.007 });
        label.position.set(SECTIONS[3].x, 3.0, ln.z + 1.5);
        g.add(label);
      });
    }

    // Phase 5 — MPM
    {
      const g = phaseGroups[4];
      [
        ["AMB_VIE", [0x4f8ef7], "MPM · Ambient"],
        ["COOL_VIE", [0x22d3ee], "MPM · 2–8 °C"],
        ["AIR_PAR", [0xc084fc], "MPM · Air"],
      ].forEach(([laneKey, colors, title]) => {
        const ln = lane(laneKey);
        const p = mixedPallet(colors);
        addAt(g, p, SECTIONS[4].x, 0.02, ln.z);
        const label = makeLabel(title, { size: 28, color: ln.color, scale: 0.007 });
        label.position.set(SECTIONS[4].x, 3.0, ln.z + 1.5);
        g.add(label);
      });
    }

    // Phase 6 — Long Goods (separate section)
    {
      const g = phaseGroups[5];
      const ln = lane("LONG_PAR");
      const frame = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(10.4, 1.3, 3)),
        new THREE.LineBasicMaterial({ color: 0xfbbf24 })
      );
      frame.position.set(SECTIONS[5].x, 0.65, ln.z);
      g.add(frame);

      [-0.7, 0.7].forEach((zOffset) => {
        const carrier = longCarrier();
        carrier.scale.setScalar(0.72);
        addAt(g, carrier, SECTIONS[5].x, 0.14, ln.z + zOffset);
      });

      const label = makeLabel("Dedicated long-goods carrier", {
        size: 30,
        color: COLORS.amber,
        scale: 0.0076,
      });
      label.position.set(SECTIONS[5].x, 3.2, ln.z);
      g.add(label);
    }

    // Phase 7 — Stack Building
    {
      const g = phaseGroups[6];
      const stackDefs = [
        ["AMB_VIE", 0x4f8ef7, true, "2-pallet stack"],
        ["COOL_VIE", 0x22d3ee, true, "Cool stack"],
        ["AIR_PAR", 0xc084fc, false, "Single air stack"],
        ["AMB_ZRH", 0xef4444, false, "Heavy · no stacking"],
      ];
      stackDefs.forEach(([laneKey, color, double, title]) => {
        const ln = lane(laneKey);
        const stack = new THREE.Group();
        const p1 = pallet(color, 1.05);
        stack.add(p1);
        if (double) {
          const p2 = pallet(color, 0.82);
          p2.position.y = 1.52;
          stack.add(p2);
        }
        addAt(g, stack, SECTIONS[6].x, 0, ln.z);

        const label = makeLabel(title, {
          size: 28,
          color: double ? COLORS.green : COLORS.amber,
          scale: 0.007,
        });
        label.position.set(SECTIONS[6].x, double ? 4.0 : 2.9, ln.z + 1.6);
        g.add(label);
      });

      const longStack = longCarrier();
      longStack.scale.setScalar(0.72);
      addAt(g, longStack, SECTIONS[6].x, 0.14, lane("LONG_PAR").z);
    }

    // Phase 8 — Simplified TU selection
    {
      const g = phaseGroups[7];
      TU_DECISIONS.forEach((decision) => {
        const ln = lane(decision.lane);
        const x = SECTIONS[7].x;

        if (decision.rejected) {
          const rejected = decisionCard(decision.rejected, false);
          rejected.scale.set(0.72, 0.72, 0.72);
          addAt(g, rejected, x - 4.0, 0, ln.z);
        }

        const selected = decisionCard(decision.selected, true);
        selected.scale.set(0.72, 0.72, 0.72);
        addAt(g, selected, x + 4.0, 0, ln.z);

        const arrow = makeLabel("→", {
          size: 42,
          color: COLORS.muted,
          background: "rgba(0,0,0,0)",
          scale: 0.007,
        });
        arrow.position.set(x, 1.15, ln.z);
        g.add(arrow);

        const reason = makeLabel(decision.reason, {
          size: 23,
          color: "#b7c8d8",
          scale: 0.0063,
        });
        reason.position.set(x + 4.0, 2.8, ln.z);
        g.add(reason);
      });
    }

    // Phase 9 — One final truck per lane; comparison moved to UI
    {
      const g = phaseGroups[8];
      FINAL_TUS.forEach((tu) => {
        const ln = lane(tu.lane);
        const t = truck(tu.kind);
        t.scale.setScalar(tu.kind === "long" ? 0.56 : 0.62);
        addAt(g, t, SECTIONS[8].x, 0, ln.z);

        if (tu.kind === "long") {
          const load = longCarrier();
          load.scale.setScalar(0.42);
          addAt(g, load, SECTIONS[8].x + 0.5, 0.52, ln.z);
        } else {
          const loadCount = Math.max(1, Math.round(tu.floor / 28));
          const offsets = [-1.9, 0, 1.9];
          for (let i = 0; i < Math.min(3, loadCount); i += 1) {
            const load = pallet(ln.key === "COOL_VIE" ? 0x22d3ee : ln.key === "AIR_PAR" ? 0xc084fc : 0x4f8ef7, 0.9);
            load.scale.setScalar(0.40);
            addAt(g, load, SECTIONS[8].x + offsets[i], 0.50, ln.z);
          }
        }

        const selectedRing = ring(0x34d399, 3.2, 0.8);
        selectedRing.position.set(SECTIONS[8].x, 0.025, ln.z);
        g.add(selectedRing);

        const label = makeLabel(
          `${tu.id} · ${tu.type} · ${tu.floor}% floor`,
          { size: 27, color: COLORS.green, scale: 0.0069 }
        );
        label.position.set(SECTIONS[8].x, 4.0, ln.z);
        g.add(label);
      });
    }

    const cameraState = {
      target: new THREE.Vector3(...SECTIONS[0].target),
      theta: 0.88,
      phi: 1.05,
      distance: 52,
      animation: null,
    };

    function flyCamera(position, target) {
      const pos = new THREE.Vector3(...position);
      const tgt = new THREE.Vector3(...target);
      const offset = pos.clone().sub(tgt);
      cameraState.animation = {
        time: 0,
        duration: 1.25,
        fromTarget: cameraState.target.clone(),
        toTarget: tgt,
        fromDistance: cameraState.distance,
        toDistance: offset.length(),
        fromTheta: cameraState.theta,
        toTheta: Math.atan2(offset.x, offset.z),
        fromPhi: cameraState.phi,
        toPhi: Math.acos(Math.min(0.999, Math.max(0.02, offset.y / offset.length()))),
      };
    }

    threeRef.current = { scene, renderer, camera, phaseGroups, flyCamera };

    let drag = null;

    const pointerDown = (event) => {
      drag = {
        x: event.clientX,
        y: event.clientY,
        button: event.button,
      };
    };

    const pointerMove = (event) => {
      if (!drag) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;

      if (drag.button === 2 || event.shiftKey) {
        const right = new THREE.Vector3()
          .subVectors(camera.position, cameraState.target)
          .cross(new THREE.Vector3(0, 1, 0))
          .normalize();
        const forward = new THREE.Vector3()
          .subVectors(cameraState.target, camera.position);
        forward.y = 0;
        forward.normalize();
        cameraState.target.addScaledVector(right, dx * 0.03);
        cameraState.target.addScaledVector(forward, dy * 0.04);
      } else {
        cameraState.theta -= dx * 0.006;
        cameraState.phi = Math.max(0.18, Math.min(1.43, cameraState.phi - dy * 0.005));
      }

      cameraState.animation = null;
      drag.x = event.clientX;
      drag.y = event.clientY;
    };

    const pointerUp = () => {
      drag = null;
    };

    const wheel = (event) => {
      event.preventDefault();
      cameraState.distance = Math.max(
        10,
        Math.min(180, cameraState.distance * (1 + event.deltaY * 0.001))
      );
      cameraState.animation = null;
    };

    renderer.domElement.addEventListener("mousedown", pointerDown);
    renderer.domElement.addEventListener("wheel", wheel, { passive: false });
    renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("mousemove", pointerMove);
    window.addEventListener("mouseup", pointerUp);

    const resize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", resize);

    phaseGroups.forEach((group, index) => {
      group.visible = index === 0;
      setGroupOpacity(group, index === 0 ? 1 : 0.08);
    });

    flyCamera(SECTIONS[0].cam, SECTIONS[0].target);

    const clock = new THREE.Clock();
    let frameId;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, clock.getDelta());

      if (cameraState.animation) {
        const a = cameraState.animation;
        a.time += dt / a.duration;
        const p = Math.min(1, a.time);
        const eased = 1 - Math.pow(1 - p, 3);

        cameraState.target.lerpVectors(a.fromTarget, a.toTarget, eased);
        cameraState.distance = a.fromDistance + (a.toDistance - a.fromDistance) * eased;
        cameraState.theta = a.fromTheta + (a.toTheta - a.fromTheta) * eased;
        cameraState.phi = a.fromPhi + (a.toPhi - a.fromPhi) * eased;

        if (p >= 1) cameraState.animation = null;
      }

      const sinPhi = Math.sin(cameraState.phi);
      camera.position.set(
        cameraState.target.x + cameraState.distance * sinPhi * Math.sin(cameraState.theta),
        cameraState.target.y + cameraState.distance * Math.cos(cameraState.phi),
        cameraState.target.z + cameraState.distance * sinPhi * Math.cos(cameraState.theta)
      );
      camera.lookAt(cameraState.target);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", pointerMove);
      window.removeEventListener("mouseup", pointerUp);
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      threeRef.current = null;
    };
  }, []);

  const buttonStyle = {
    border: `1px solid ${COLORS.border}`,
    background: "#142130",
    color: COLORS.text,
    borderRadius: 8,
    padding: "7px 10px",
    cursor: "pointer",
    fontSize: 12,
  };

  const panelStyle = {
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    backdropFilter: "blur(7px)",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: "Segoe UI, system-ui, sans-serif",
      }}
    >
      <div ref={mountRef} style={{ position: "absolute", inset: 0 }} />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "12px 16px 18px",
          background: "linear-gradient(rgba(8,16,25,.96), rgba(8,16,25,0))",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 700 }}>Forecast-to-Transport Capacity Simulation</div>
        <div
          style={{
            display: "flex",
            padding: 3,
            gap: 3,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 9,
            background: "rgba(10,18,28,.86)",
          }}
        >
          {[
            ["pitch", "Pitch Simulation"],
            ["full", "Full Simulation"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSimulationMode(key)}
              style={{
                ...buttonStyle,
                padding: "5px 9px",
                border: "none",
                background: simulationMode === key ? "#0f5470" : "transparent",
                color: simulationMode === key ? "#e3f7ff" : COLORS.muted,
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ color: "#9fd8ff", fontSize: 13 }}>
          Phase {current.n} of 9 · {current.title}
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {SECTIONS.map((s, index) => (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setPlaying(false);
                setPhase(index);
              }}
              title={s.title}
              style={{
                ...buttonStyle,
                width: 27,
                height: 27,
                padding: 0,
                borderRadius: "50%",
                background: index === phase ? "#0f5470" : index < phase ? "#173344" : "#101923",
                color: index === phase ? "#d5f4ff" : COLORS.muted,
              }}
            >
              {s.n}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          ...panelStyle,
          position: "absolute",
          top: 66,
          left: 12,
          width: 185,
          padding: 12,
          display: "grid",
          gap: 7,
        }}
      >
        <div
          style={{
            padding: "7px 8px",
            borderRadius: 8,
            background: simulationMode === "pitch" ? "rgba(15,84,112,.34)" : "rgba(103,65,145,.28)",
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <div style={{ fontSize: 10, color: COLORS.muted, textTransform: "uppercase" }}>
            Active view
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>
            {simulationMode === "pitch" ? "Pitch Simulation" : "Full Simulation"}
          </div>
        </div>

        <button
          type="button"
          style={{ ...buttonStyle, background: playing ? "#3b2630" : "#0f4f67" }}
          onClick={() => setPlaying((value) => !value)}
        >
          {playing ? "Pause simulation" : "Play simulation"}
        </button>

        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            disabled={phase === 0}
            style={{ ...buttonStyle, flex: 1, opacity: phase === 0 ? 0.45 : 1 }}
            onClick={() => {
              setPlaying(false);
              setPhase((p) => Math.max(0, p - 1));
            }}
          >
            ◀ Previous
          </button>
          <button
            type="button"
            disabled={phase === 8}
            style={{ ...buttonStyle, flex: 1, opacity: phase === 8 ? 0.45 : 1 }}
            onClick={() => {
              setPlaying(false);
              setPhase((p) => Math.min(8, p + 1));
            }}
          >
            Next ▶
          </button>
        </div>

        <button
          type="button"
          style={buttonStyle}
          onClick={() => threeRef.current?.flyCamera(current.cam, current.target)}
        >
          Refocus current phase
        </button>

        <button
          type="button"
          style={buttonStyle}
          onClick={() => threeRef.current?.flyCamera([14, 86, 126], [14, 2, 0])}
        >
          Process overview
        </button>

        {phase === 8 && (
          <button
            type="button"
            style={{ ...buttonStyle, background: "#15563f", color: "#c8ffe6" }}
            onClick={() => setShowResult(true)}
          >
            Open management result
          </button>
        )}

        <div style={{ fontSize: 10.5, lineHeight: 1.5, color: COLORS.muted }}>
          Drag to orbit · Shift/right-drag to pan · Wheel to zoom
        </div>
      </div>

      <div
        style={{
          ...panelStyle,
          position: "absolute",
          top: 66,
          right: 12,
          width: simulationMode === "full" ? 340 : 310,
          padding: 14,
          maxHeight: "calc(100vh - 88px)",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            color: "#58cfff",
            fontSize: 11,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {simulationMode === "pitch" ? "Pitch explanation" : "Full process explanation"}
        </div>

        <div style={{ fontWeight: 700, fontSize: 17, marginTop: 4 }}>
          {String(current.n).padStart(2, "0")} · {current.title}
        </div>

        <div
          style={{
            marginTop: 10,
            padding: 11,
            borderRadius: 9,
            border: `1px solid ${COLORS.border}`,
            background: "rgba(15,29,42,.82)",
          }}
        >
          <div style={{ color: "#d9edf9", fontSize: 13, lineHeight: 1.55 }}>
            {simulationMode === "pitch"
              ? SECTION_DETAILS[phase].pitch
              : SECTION_DETAILS[phase].full}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 7,
            marginTop: 10,
          }}
        >
          {[
            ["Input", SECTION_DETAILS[phase].input],
            ["What happens", simulationMode === "pitch"
              ? SECTION_DETAILS[phase].pitch
              : SECTION_DETAILS[phase].full],
            ["Output", SECTION_DETAILS[phase].output],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                padding: "8px 9px",
                borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
                background: "rgba(9,17,26,.66)",
              }}
            >
              <div
                style={{
                  color: COLORS.muted,
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: .8,
                }}
              >
                {label}
              </div>
              <div style={{ marginTop: 3, color: "#d5e1eb", fontSize: 12, lineHeight: 1.45 }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 10,
            padding: 10,
            borderLeft: `3px solid ${COLORS.cyan}`,
            background: "rgba(20,47,62,.46)",
            borderRadius: 7,
          }}
        >
          <div style={{ color: COLORS.cyan, fontSize: 10.5, textTransform: "uppercase" }}>
            Key planning question
          </div>
          <div style={{ marginTop: 4, fontWeight: 700, fontSize: 12.5, lineHeight: 1.45 }}>
            {SECTION_DETAILS[phase].decision}
          </div>
        </div>

        {phase === 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ color: "#9fd8ff", fontWeight: 700, fontSize: 12 }}>
              How to read the Forecast Input
            </div>
            <div style={{ marginTop: 7, display: "grid", gap: 7 }}>
              {[
                ["Forecast card", "One material and its expected quantity."],
                ["Coloured lane", "One transport-planning bucket with the same destination, mode and handling requirements."],
                ["Multiple cards on one lane", "These forecasts may be planned within the same transport flow."],
                ["Yellow record", "Demand exists, but incomplete master data prevents reliable planning."],
              ].map(([title, description]) => (
                <div key={title} style={{ display: "grid", gridTemplateColumns: "94px 1fr", gap: 8 }}>
                  <div style={{ color: "#dbe9f3", fontWeight: 700, fontSize: 11 }}>{title}</div>
                  <div style={{ color: COLORS.muted, fontSize: 11, lineHeight: 1.4 }}>{description}</div>
                </div>
              ))}
            </div>

            {simulationMode === "full" && (
              <div
                style={{
                  marginTop: 10,
                  borderTop: `1px solid ${COLORS.border}`,
                  paddingTop: 9,
                  display: "grid",
                  gap: 5,
                }}
              >
                {DEMANDS.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      fontSize: 10.8,
                    }}
                  >
                    <span style={{ color: d.valid ? lane(d.lane).color : COLORS.amber }}>
                      {d.id} · {d.material}
                    </span>
                    <span style={{ color: "#dbe7f0" }}>{d.qty.toLocaleString()} units</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {simulationMode === "full" && phase !== 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ color: "#9fd8ff", fontWeight: 700, fontSize: 12 }}>
              Planning lanes
            </div>
            <div style={{ marginTop: 7, display: "grid", gap: 5 }}>
              {LANES.map((ln) => (
                <div
                  key={ln.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11,
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 2,
                      background: ln.color,
                      display: "inline-block",
                    }}
                  />
                  {ln.id}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showResult && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(3,7,12,.76)",
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            style={{
              ...panelStyle,
              width: "min(900px, 95vw)",
              maxHeight: "92vh",
              overflowY: "auto",
              padding: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ color: "#58cfff", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
                  Management result
                </div>
                <div style={{ fontWeight: 700, fontSize: 20, marginTop: 3 }}>
                  Forecast converted into five transport units
                </div>
              </div>
              <button type="button" style={buttonStyle} onClick={() => setShowResult(false)}>
                Close
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 10,
                marginTop: 16,
              }}
            >
              {[
                ["Planned transport units", "5"],
                ["Main separation drivers", "Temperature · Air · Long goods"],
                ["Blocked forecast quantity", "95 units"],
                ["Recommended storyline", "Capacity becomes tangible"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    background: "#111c28",
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div style={{ color: COLORS.muted, fontSize: 11 }}>{label}</div>
                  <div style={{ marginTop: 5, fontWeight: 700, fontSize: 17 }}>{value}</div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: 10,
                marginTop: 14,
              }}
            >
              {FINAL_TUS.map((tu) => {
                const ln = lane(tu.lane);
                return (
                  <div
                    key={tu.id}
                    style={{
                      border: `1px solid ${COLORS.border}`,
                      borderLeft: `4px solid ${ln.color}`,
                      borderRadius: 10,
                      padding: 12,
                      background: "#101a25",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{tu.id} · {tu.type}</div>
                    <div style={{ marginTop: 4, color: ln.color, fontSize: 11.5 }}>{ln.id}</div>
                    <div style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.7, color: "#c5d3df" }}>
                      Floor utilization: {tu.floor}%<br />
                      Volume utilization: {tu.volume}%<br />
                      Weight utilization: {tu.weight}%
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 700, color: COLORS.cyan }}>Pitch message</div>
              <ul style={{ margin: "8px 0 0 18px", padding: 0, lineHeight: 1.7, color: "#c8d6e2" }}>
                {managementInsights.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
