00:28:47.111 Running build in Washington, D.C., USA (East) – iad1
00:28:47.112 Build machine configuration: 2 cores, 8 GB
00:28:47.224 Cloning github.com/Buddger/3D_Log_Simulation (Branch: main, Commit: 6cfc5e6)
00:28:47.550 Cloning completed: 325.000ms
00:28:47.853 Restored build cache from previous deployment (Fw7anoczsTeAjXu3bnTHsLv14VCZ)
00:28:48.165 Running "vercel build"
00:28:48.219 Vercel CLI 56.2.0
00:28:48.853 Installing dependencies...
00:28:49.469 
00:28:49.470 up to date in 496ms
00:28:49.608 
00:28:49.609 > 3d-logistics-simulations@1.0.0 build
00:28:49.609 > vite build
00:28:49.609 
00:28:49.842 vite v5.4.14 building for production...
00:28:49.895 transforming...
00:28:50.248 ✓ 18 modules transformed.
00:28:50.297 x Build failed in 429ms
00:28:50.298 error during build:
00:28:50.298 [vite:esbuild] Transform failed with 37 errors:
00:28:50.298 /vercel/path0/src/ForecastToTransportSim.jsx:1225:7: ERROR: The symbol "React" has already been declared
00:28:50.298 /vercel/path0/src/ForecastToTransportSim.jsx:1225:16: ERROR: The symbol "useRef" has already been declared
00:28:50.298 /vercel/path0/src/ForecastToTransportSim.jsx:1225:24: ERROR: The symbol "useEffect" has already been declared
00:28:50.299 /vercel/path0/src/ForecastToTransportSim.jsx:1225:35: ERROR: The symbol "useState" has already been declared
00:28:50.299 /vercel/path0/src/ForecastToTransportSim.jsx:1225:45: ERROR: The symbol "useCallback" has already been declared
00:28:50.299 ...
00:28:50.299 file: /vercel/path0/src/ForecastToTransportSim.jsx:1225:7
00:28:50.299 
00:28:50.299 The symbol "React" has already been declared
00:28:50.299 1223|    );
00:28:50.299 1224|  }
00:28:50.299 1225|  import React, { useRef, useEffect, useState, useCallback } from "react";
00:28:50.299    |         ^
00:28:50.299 1226|  import * as THREE from "three";
00:28:50.299 1227|  
00:28:50.300 
00:28:50.300 The symbol "useRef" has already been declared
00:28:50.300 1223|    );
00:28:50.300 1224|  }
00:28:50.300 1225|  import React, { useRef, useEffect, useState, useCallback } from "react";
00:28:50.300    |                  ^
00:28:50.300 1226|  import * as THREE from "three";
00:28:50.300 1227|  
00:28:50.300 
00:28:50.300 The symbol "useEffect" has already been declared
00:28:50.300 1223|    );
00:28:50.300 1224|  }
00:28:50.300 1225|  import React, { useRef, useEffect, useState, useCallback } from "react";
00:28:50.300    |                          ^
00:28:50.300 1226|  import * as THREE from "three";
00:28:50.300 1227|  
00:28:50.301 
00:28:50.301 The symbol "useState" has already been declared
00:28:50.301 1223|    );
00:28:50.301 1224|  }
00:28:50.301 1225|  import React, { useRef, useEffect, useState, useCallback } from "react";
00:28:50.301    |                                     ^
00:28:50.301 1226|  import * as THREE from "three";
00:28:50.301 1227|  
00:28:50.301 
00:28:50.301 The symbol "useCallback" has already been declared
00:28:50.301 1223|    );
00:28:50.301 1224|  }
00:28:50.301 1225|  import React, { useRef, useEffect, useState, useCallback } from "react";
00:28:50.301    |                                               ^
00:28:50.301 1226|  import * as THREE from "three";
00:28:50.301 1227|  
00:28:50.301 
00:28:50.301 The symbol "THREE" has already been declared
00:28:50.302 1224|  }
00:28:50.302 1225|  import React, { useRef, useEffect, useState, useCallback } from "react";
00:28:50.302 1226|  import * as THREE from "three";
00:28:50.302    |              ^
00:28:50.302 1227|  
00:28:50.302 1228|  /* =====================================================================
00:28:50.302 
00:28:50.302 The symbol "C" has already been declared
00:28:50.302 1233|     ===================================================================== */
00:28:50.302 1234|  
00:28:50.302 1235|  const C = {
00:28:50.302    |        ^
00:28:50.302 1236|    bg: "#0a1017",
00:28:50.302 1237|    green: "#34d399", amber: "#fbbf24", red: "#f87171",
00:28:50.302 
00:28:50.302 The symbol "MAT_COLORS" has already been declared
00:28:50.303 1240|    panel: "rgba(12,19,27,0.93)", border: "rgba(130,160,190,0.16)",
00:28:50.303 1241|  };
00:28:50.303 1242|  const MAT_COLORS = [0x4f8ef7, 0x34d399, 0xf59e0b, 0xef4444, 0xc084fc, 0x22d3ee, 0x94a3b8];
00:28:50.303    |        ^
00:28:50.303 1243|  
00:28:50.303 1244|  const BUCKETS = {
00:28:50.303 
00:28:50.304 The symbol "BUCKETS" has already been declared
00:28:50.304 1242|  const MAT_COLORS = [0x4f8ef7, 0x34d399, 0xf59e0b, 0xef4444, 0xc084fc, 0x22d3ee, 0x94a3b8];
00:28:50.304 1243|  
00:28:50.304 1244|  const BUCKETS = {
00:28:50.304    |        ^
00:28:50.304 1245|    AMB_VIE: { id: "BKT-VIE-ROAD-AMBIENT", source: "Oberhausen", destination: "Vienna", departure: "CW31 · Tue", mode: "Road", temperature: "Ambient", color: "#60a5fa" },
00:28:50.304 1246|    COOL_VIE: { id: "BKT-VIE-ROAD-COOL", source: "Oberhausen", destination: "Vienna", departure: "CW31 · Tue", mode: "Road", temperature: "2–8 °C", color: "#22d3ee" },
00:28:50.305 
00:28:50.305 The symbol "DEMANDS" has already been declared
00:28:50.305 1250|  };
00:28:50.305 1251|  
00:28:50.305 1252|  const DEMANDS = [
00:28:50.305    |        ^
00:28:50.305 1253|    { id:"D-01", mat:"M-1001 Standard Cartoned Goods", short:"M-1001", qty:1250, bucketId:BUCKETS.AMB_VIE.id, lane:"Oberhausen → Vienna", bucket:"CW31 · Tue", mode:"Road", temp:"Ambient", special:"—", color:0, valid:true,
00:28:50.305 1254|      fullPalletQty:480, layerQty:96, cartonQty:24, packQty:1, unitVolume:0.0048, unitWeight:1.8, materialLength:0.40, materialWidth:0.30, materialHeight:0.20, stackable:true, maxTopLoad:420, overhang:0, temperatureCompatibility:["Ambient"], assignedLane:"OBH-VIE-RD", allowedTUTypes:["Small Box Truck","Standard Trailer","High-Cube Trailer"] },
00:28:50.305 
00:28:50.305 The symbol "PHASES" has already been declared
00:28:50.305 1267|  ];
00:28:50.305 1268|  
00:28:50.305 1269|  const PHASES = [
00:28:50.305    |        ^
00:28:50.306 1270|    { n:1, name:"Normalized Demand", zone:"Forecast Input", cam:[-62,15,24], tgt:[-62,2.5,0], info:"Demand is separated into strict planning buckets. Source, destination, departure, TU mode, temperature and special transport characteristics remain attached to every object." },
00:28:50.306 1271|    { n:2, name:"Master Data Validation", zone:"Validation Gate", cam:[-45,14,23], tgt:[-45,3,0], info:"Illustrative logistics master data is validated before decomposition: UOM quantities, dimensions, weight, stackability, temperature rules, assigned lane and allowed TU types." },
00:28:50.306 
00:28:50.306 The symbol "decompose" has already been declared
00:28:50.306 1279|  ];
00:28:50.306 1280|  
00:28:50.306 1281|  function decompose(d) {
00:28:50.306    |           ^
00:28:50.306 1282|    if (!d.valid) return { demand:d, fullPallets:0, fullPalletUnits:0, layers:0, layerUnits:0, cartons:0, cartonUnits:0, loosePacks:0, remainingSteps:[d.qty] };
00:28:50.306 1283|    let remaining=d.qty;
00:28:50.306 
00:28:50.306 The symbol "DECOMPOSITIONS" has already been declared
00:28:50.306 1291|    return { demand:d, fullPallets, fullPalletUnits, layers, layerUnits, cartons, cartonUnits, loosePacks, remainingSteps:[d.qty,afterPallets,afterLayers,afterCartons,0] };
00:28:50.306 1292|  }
00:28:50.307 1293|  const DECOMPOSITIONS=DEMANDS.map(decompose);
00:28:50.307    |        ^
00:28:50.307 1294|  const validDecomp=DECOMPOSITIONS.filter(x=>x.demand.valid);
00:28:50.307 1295|  const sum=(key)=>validDecomp.reduce((a,x)=>a+(x[key]||0),0);
00:28:50.307 
00:28:50.307 The symbol "validDecomp" has already been declared
00:28:50.307 1292|  }
00:28:50.307 1293|  const DECOMPOSITIONS=DEMANDS.map(decompose);
00:28:50.307 1294|  const validDecomp=DECOMPOSITIONS.filter(x=>x.demand.valid);
00:28:50.307    |        ^
00:28:50.307 1295|  const sum=(key)=>validDecomp.reduce((a,x)=>a+(x[key]||0),0);
00:28:50.307 1296|  
00:28:50.307 
00:28:50.307 The symbol "sum" has already been declared
00:28:50.307 1293|  const DECOMPOSITIONS=DEMANDS.map(decompose);
00:28:50.308 1294|  const validDecomp=DECOMPOSITIONS.filter(x=>x.demand.valid);
00:28:50.308 1295|  const sum=(key)=>validDecomp.reduce((a,x)=>a+(x[key]||0),0);
00:28:50.308    |        ^
00:28:50.308 1296|  
00:28:50.308 1297|  const PALLET_PLAN = {
00:28:50.308 
00:28:50.308 The symbol "PALLET_PLAN" has already been declared
00:28:50.308 1295|  const sum=(key)=>validDecomp.reduce((a,x)=>a+(x[key]||0),0);
00:28:50.308 1296|  
00:28:50.308 1297|  const PALLET_PLAN = {
00:28:50.308    |        ^
00:28:50.308 1298|    mpl:[
00:28:50.308 1299|      {id:"MPL-01",bucketId:BUCKETS.AMB_VIE.id,materials:"M-1001 · 3 ambient layers",layers:3,height:1.30,weight:285,temp:"Ambient"},
00:28:50.308 
00:28:50.308 The symbol "TU_RESULTS" has already been declared
00:28:50.308 1311|  };
00:28:50.308 1312|  
00:28:50.308 1313|  const TU_RESULTS=[
00:28:50.308    |        ^
00:28:50.309 1314|    {id:"TU 1",bucketId:BUCKETS.AMB_VIE.id,type:"Standard Trailer",stacks:2,pallets:3,floor:58,vol:46,weight:39,status:"Selected after Small Box Truck capacity rejection",color:C.cyan},
00:28:50.309 1315|    {id:"TU 2",bucketId:BUCKETS.COOL_VIE.id,type:"Temperature-Controlled Box Truck",stacks:2,pallets:3,floor:64,vol:58,weight:51,status:"Selected · 2–8 °C capable",color:C.blue},
00:28:50.309 
00:28:50.309 The symbol "avg" has already been declared
00:28:50.309 1318|    {id:"TU 5",bucketId:BUCKETS.LONG_PAR.id,type:"Long-Goods Trailer",stacks:2,pallets:2,floor:48,vol:39,weight:35,status:"Selected · 4.2 m material length",color:C.amber},
00:28:50.309 1319|  ];
00:28:50.309 1320|  const avg=(k)=>Math.round(TU_RESULTS.reduce((a,t)=>a+t[k],0)/TU_RESULTS.length);
00:28:50.309    |        ^
00:28:50.309 1321|  const SUMMARY={
00:28:50.309 1322|    forecastQty:DEMANDS.reduce((a,d)=>a+d.qty,0), materials:DEMANDS.length,
00:28:50.309 
00:28:50.309 The symbol "SUMMARY" has already been declared
00:28:50.309 1319|  ];
00:28:50.309 1320|  const avg=(k)=>Math.round(TU_RESULTS.reduce((a,t)=>a+t[k],0)/TU_RESULTS.length);
00:28:50.309 1321|  const SUMMARY={
00:28:50.309    |        ^
00:28:50.309 1322|    forecastQty:DEMANDS.reduce((a,d)=>a+d.qty,0), materials:DEMANDS.length,
00:28:50.310 1323|    fullPalletQty:sum("fullPalletUnits"), fullPallets:sum("fullPallets"), layers:sum("layers"), cartons:sum("cartons"), loosePacks:sum("loosePacks"),
00:28:50.310 
00:28:50.310 The symbol "makeLabel" has already been declared
00:28:50.310 1339|  
00:28:50.310 1340|  /* --------------------------- 3D helpers --------------------------- */
00:28:50.310 1341|  function makeLabel(text, opts = {}) {
00:28:50.310    |           ^
00:28:50.310 1342|    const { size = 40, color = "#e6edf3", bg = "rgba(10,16,23,0.78)", pad = 16 } = opts;
00:28:50.310 1343|    const cv = document.createElement("canvas");
00:28:50.310 
00:28:50.310 The symbol "palletBase" has already been declared
00:28:50.310 1361|    return sp;
00:28:50.310 1362|  }
00:28:50.310 1363|  function palletBase() {
00:28:50.310    |           ^
00:28:50.310 1364|    const g = new THREE.Group();
00:28:50.310 1365|    const wood = new THREE.MeshLambertMaterial({ color: 0x8a6a45 });
00:28:50.310 
00:28:50.310 The symbol "edged" has already been declared
00:28:50.310 1372|    return g;
00:28:50.311 1373|  }
00:28:50.311 1374|  function edged(mesh, color = 0x0b1220) {
00:28:50.311    |           ^
00:28:50.311 1375|    const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color }));
00:28:50.311 1376|    e.position.copy(mesh.position); e.rotation.copy(mesh.rotation);
00:28:50.311 
00:28:50.311 The symbol "fullPallet" has already been declared
00:28:50.311 1377|    return e;
00:28:50.311 1378|  }
00:28:50.311 1379|  function fullPallet(ci) {
00:28:50.311    |           ^
00:28:50.311 1380|    const g = palletBase();
00:28:50.311 1381|    const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.5, 1.5), new THREE.MeshLambertMaterial({ color: MAT_COLORS[ci] }));
00:28:50.311 
00:28:50.311 The symbol "layerUnit" has already been declared
00:28:50.311 1383|    return g;
00:28:50.311 1384|  }
00:28:50.311 1385|  function layerUnit(ci, overhang = false) {
00:28:50.312    |           ^
00:28:50.312 1386|    const g = new THREE.Group();
00:28:50.312 1387|    const w = overhang ? 2.7 : 2.3;
00:28:50.312 
00:28:50.312 The symbol "mplPallet" has already been declared
00:28:50.312 1390|    return g;
00:28:50.312 1391|  }
00:28:50.312 1392|  function mplPallet(cis, overhangTop = false) {
00:28:50.312    |           ^
00:28:50.312 1393|    const g = palletBase();
00:28:50.312 1394|    cis.forEach((ci, i) => {
00:28:50.312 
00:28:50.312 The symbol "mpmPallet" has already been declared
00:28:50.312 1399|    return g;
00:28:50.312 1400|  }
00:28:50.312 1401|  function mpmPallet(cis, h = 1.4, seed = 1) {
00:28:50.312    |           ^
00:28:50.312 1402|    const g = palletBase();
00:28:50.312 1403|    let s = seed;
00:28:50.313 
00:28:50.313 The symbol "longCarrier" has already been declared
00:28:50.313 1417|    return g;
00:28:50.313 1418|  }
00:28:50.313 1419|  function longCarrier(ci) {
00:28:50.313    |           ^
00:28:50.313 1420|    const g = new THREE.Group();
00:28:50.313 1421|    const base = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.25, 1.2), new THREE.MeshLambertMaterial({ color: 0x64748b }));
00:28:50.313 
00:28:50.313 The symbol "cartonBox" has already been declared
00:28:50.313 1428|    return g;
00:28:50.313 1429|  }
00:28:50.313 1430|  function cartonBox(ci, s = 0.7) {
00:28:50.313    |           ^
00:28:50.313 1431|    const g = new THREE.Group();
00:28:50.313 1432|    const m = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.75, s * 0.85), new THREE.MeshLambertMaterial({ color: MAT_COLORS[ci] }));
00:28:50.313 
00:28:50.313 The symbol "truckUnit" has already been declared
00:28:50.313 1434|    return g;
00:28:50.313 1435|  }
00:28:50.314 1436|  function truckUnit(kind) {
00:28:50.314    |           ^
00:28:50.314 1437|    const g = new THREE.Group();
00:28:50.314 1438|    const cfg = {
00:28:50.314 
00:28:50.314 The symbol "stackBracket" has already been declared
00:28:50.314 1466|    return g;
00:28:50.314 1467|  }
00:28:50.314 1468|  function stackBracket(h, col = 0x22d3ee) {
00:28:50.314    |           ^
00:28:50.314 1469|    const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.9, h, 2.0)),
00:28:50.314 1470|      new THREE.LineBasicMaterial({ color: col }));
00:28:50.314 
00:28:50.314 The symbol "ring" has already been declared
00:28:50.314 1472|    return box;
00:28:50.314 1473|  }
00:28:50.314 1474|  function ring(colorHex, r = 1.9) {
00:28:50.314    |           ^
00:28:50.315 1475|    const m = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.16, 40),
00:28:50.315 1476|      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
00:28:50.315 
00:28:50.315 The symbol "conveyorSeg" has already been declared
00:28:50.315 1478|    return m;
00:28:50.315 1479|  }
00:28:50.315 1480|  function conveyorSeg(len, x, z, rotY = 0) {
00:28:50.315    |           ^
00:28:50.315 1481|    const g = new THREE.Group();
00:28:50.315 1482|    const belt = new THREE.Mesh(new THREE.BoxGeometry(len, 0.18, 1.7), new THREE.MeshLambertMaterial({ color: 0x243244 }));
00:28:50.315 
00:28:50.315 The symbol "floorArrow" has already been declared
00:28:50.315 1489|    return g;
00:28:50.315 1490|  }
00:28:50.315 1491|  function floorArrow(x, z) {
00:28:50.315    |           ^
00:28:50.315 1492|    const shape = new THREE.Shape();
00:28:50.315 1493|    shape.moveTo(0, 0.8); shape.lineTo(1.5, 0); shape.lineTo(0, -0.8); shape.lineTo(0.45, 0); shape.closePath();
00:28:50.315 
00:28:50.316 The symbol "disposeObject3D" has already been declared
00:28:50.316 1497|  }
00:28:50.316 1498|  
00:28:50.316 1499|  function disposeObject3D(root) {
00:28:50.316    |           ^
00:28:50.316 1500|    if (!root) return;
00:28:50.316 1501|    root.traverse((obj) => {
00:28:50.316 
00:28:50.316 The symbol "clearGroup" has already been declared
00:28:50.316 1508|    });
00:28:50.316 1509|  }
00:28:50.316 1510|  function clearGroup(group) {
00:28:50.316    |           ^
00:28:50.316 1511|    if (!group) return;
00:28:50.317 1512|    while (group.children.length > 0) {
00:28:50.317 
00:28:50.317 Multiple exports with the same name "default"
00:28:50.317 1518|  
00:28:50.317 1519|  /* ============================ component ============================ */
00:28:50.317 1520|  export default function ForecastToTransportSim() {
00:28:50.318    |         ^
00:28:50.318 1521|    const mountRef = useRef(null);
00:28:50.318 1522|    const threeRef = useRef(null);          // { scene, camera, renderer, dynamic, tweens, pulses }
00:28:50.318 
00:28:50.318 The symbol "ForecastToTransportSim" has already been declared
00:28:50.318 1518|  
00:28:50.318 1519|  /* ============================ component ============================ */
00:28:50.318 1520|  export default function ForecastToTransportSim() {
00:28:50.319    |                          ^
00:28:50.319 1521|    const mountRef = useRef(null);
00:28:50.319 1522|    const threeRef = useRef(null);          // { scene, camera, renderer, dynamic, tweens, pulses }
00:28:50.319 
00:28:50.319     at failureErrorWithLog (/vercel/path0/node_modules/esbuild/lib/main.js:1472:15)
00:28:50.319     at /vercel/path0/node_modules/esbuild/lib/main.js:755:50
00:28:50.319     at responseCallbacks.<computed> (/vercel/path0/node_modules/esbuild/lib/main.js:622:9)
00:28:50.319     at handleIncomingPacket (/vercel/path0/node_modules/esbuild/lib/main.js:677:12)
00:28:50.319     at Socket.readFromStdout (/vercel/path0/node_modules/esbuild/lib/main.js:600:7)
00:28:50.319     at Socket.emit (node:events:509:28)
00:28:50.319     at addChunk (node:internal/streams/readable:563:12)
00:28:50.319     at readableAddChunkPushByteMode (node:internal/streams/readable:514:3)
00:28:50.319     at Readable.push (node:internal/streams/readable:394:5)
00:28:50.320     at Pipe.onStreamRead (node:internal/stream_base_commons:189:23)
00:28:50.525 Error: Command "npm run build" exited with 100:28:47.111 Running build in Washington, D.C., USA (East) – iad1
00:28:47.112 Build machine configuration: 2 cores, 8 GB
00:28:47.224 Cloning github.com/Buddger/3D_Log_Simulation (Branch: main, Commit: 6cfc5e6)
00:28:47.550 Cloning completed: 325.000ms
00:28:47.853 Restored build cache from previous deployment (Fw7anoczsTeAjXu3bnTHsLv14VCZ)
00:28:48.165 Running "vercel build"
00:28:48.219 Vercel CLI 56.2.0
00:28:48.853 Installing dependencies...
00:28:49.469 
00:28:49.470 up to date in 496ms
00:28:49.608 
00:28:49.609 > 3d-logistics-simulations@1.0.0 build
00:28:49.609 > vite build
00:28:49.609 
00:28:49.842 vite v5.4.14 building for production...
00:28:49.895 transforming...
00:28:50.248 ✓ 18 modules transformed.
00:28:50.297 x Build failed in 429ms
00:28:50.298 error during build:
00:28:50.298 [vite:esbuild] Transform failed with 37 errors:
00:28:50.298 /vercel/path0/src/ForecastToTransportSim.jsx:1225:7: ERROR: The symbol "React" has already been declared
00:28:50.298 /vercel/path0/src/ForecastToTransportSim.jsx:1225:16: ERROR: The symbol "useRef" has already been declared
00:28:50.298 /vercel/path0/src/ForecastToTransportSim.jsx:1225:24: ERROR: The symbol "useEffect" has already been declared
00:28:50.299 /vercel/path0/src/ForecastToTransportSim.jsx:1225:35: ERROR: The symbol "useState" has already been declared
00:28:50.299 /vercel/path0/src/ForecastToTransportSim.jsx:1225:45: ERROR: The symbol "useCallback" has already been declared
00:28:50.299 ...
00:28:50.299 file: /vercel/path0/src/ForecastToTransportSim.jsx:1225:7
00:28:50.299 
00:28:50.299 The symbol "React" has already been declared
00:28:50.299 1223|    );
00:28:50.299 1224|  }
00:28:50.299 1225|  import React, { useRef, useEffect, useState, useCallback } from "react";
00:28:50.299    |         ^
00:28:50.299 1226|  import * as THREE from "three";
00:28:50.299 1227|  
00:28:50.300 
00:28:50.300 The symbol "useRef" has already been declared
00:28:50.300 1223|    );
00:28:50.300 1224|  }
00:28:50.300 1225|  import React, { useRef, useEffect, useState, useCallback } from "react";
00:28:50.300    |                  ^
00:28:50.300 1226|  import * as THREE from "three";
00:28:50.300 1227|  
00:28:50.300 
00:28:50.300 The symbol "useEffect" has already been declared
00:28:50.300 1223|    );
00:28:50.300 1224|  }
00:28:50.300 1225|  import React, { useRef, useEffect, useState, useCallback } from "react";
00:28:50.300    |                          ^
00:28:50.300 1226|  import * as THREE from "three";
00:28:50.300 1227|  
00:28:50.301 
00:28:50.301 The symbol "useState" has already been declared
00:28:50.301 1223|    );
00:28:50.301 1224|  }
00:28:50.301 1225|  import React, { useRef, useEffect, useState, useCallback } from "react";
00:28:50.301    |                                     ^
00:28:50.301 1226|  import * as THREE from "three";
00:28:50.301 1227|  
00:28:50.301 
00:28:50.301 The symbol "useCallback" has already been declared
00:28:50.301 1223|    );
00:28:50.301 1224|  }
00:28:50.301 1225|  import React, { useRef, useEffect, useState, useCallback } from "react";
00:28:50.301    |                                               ^
00:28:50.301 1226|  import * as THREE from "three";
00:28:50.301 1227|  
00:28:50.301 
00:28:50.301 The symbol "THREE" has already been declared
00:28:50.302 1224|  }
00:28:50.302 1225|  import React, { useRef, useEffect, useState, useCallback } from "react";
00:28:50.302 1226|  import * as THREE from "three";
00:28:50.302    |              ^
00:28:50.302 1227|  
00:28:50.302 1228|  /* =====================================================================
00:28:50.302 
00:28:50.302 The symbol "C" has already been declared
00:28:50.302 1233|     ===================================================================== */
00:28:50.302 1234|  
00:28:50.302 1235|  const C = {
00:28:50.302    |        ^
00:28:50.302 1236|    bg: "#0a1017",
00:28:50.302 1237|    green: "#34d399", amber: "#fbbf24", red: "#f87171",
00:28:50.302 
00:28:50.302 The symbol "MAT_COLORS" has already been declared
00:28:50.303 1240|    panel: "rgba(12,19,27,0.93)", border: "rgba(130,160,190,0.16)",
00:28:50.303 1241|  };
00:28:50.303 1242|  const MAT_COLORS = [0x4f8ef7, 0x34d399, 0xf59e0b, 0xef4444, 0xc084fc, 0x22d3ee, 0x94a3b8];
00:28:50.303    |        ^
00:28:50.303 1243|  
00:28:50.303 1244|  const BUCKETS = {
00:28:50.303 
00:28:50.304 The symbol "BUCKETS" has already been declared
00:28:50.304 1242|  const MAT_COLORS = [0x4f8ef7, 0x34d399, 0xf59e0b, 0xef4444, 0xc084fc, 0x22d3ee, 0x94a3b8];
00:28:50.304 1243|  
00:28:50.304 1244|  const BUCKETS = {
00:28:50.304    |        ^
00:28:50.304 1245|    AMB_VIE: { id: "BKT-VIE-ROAD-AMBIENT", source: "Oberhausen", destination: "Vienna", departure: "CW31 · Tue", mode: "Road", temperature: "Ambient", color: "#60a5fa" },
00:28:50.304 1246|    COOL_VIE: { id: "BKT-VIE-ROAD-COOL", source: "Oberhausen", destination: "Vienna", departure: "CW31 · Tue", mode: "Road", temperature: "2–8 °C", color: "#22d3ee" },
00:28:50.305 
00:28:50.305 The symbol "DEMANDS" has already been declared
00:28:50.305 1250|  };
00:28:50.305 1251|  
00:28:50.305 1252|  const DEMANDS = [
00:28:50.305    |        ^
00:28:50.305 1253|    { id:"D-01", mat:"M-1001 Standard Cartoned Goods", short:"M-1001", qty:1250, bucketId:BUCKETS.AMB_VIE.id, lane:"Oberhausen → Vienna", bucket:"CW31 · Tue", mode:"Road", temp:"Ambient", special:"—", color:0, valid:true,
00:28:50.305 1254|      fullPalletQty:480, layerQty:96, cartonQty:24, packQty:1, unitVolume:0.0048, unitWeight:1.8, materialLength:0.40, materialWidth:0.30, materialHeight:0.20, stackable:true, maxTopLoad:420, overhang:0, temperatureCompatibility:["Ambient"], assignedLane:"OBH-VIE-RD", allowedTUTypes:["Small Box Truck","Standard Trailer","High-Cube Trailer"] },
00:28:50.305 
00:28:50.305 The symbol "PHASES" has already been declared
00:28:50.305 1267|  ];
00:28:50.305 1268|  
00:28:50.305 1269|  const PHASES = [
00:28:50.305    |        ^
00:28:50.306 1270|    { n:1, name:"Normalized Demand", zone:"Forecast Input", cam:[-62,15,24], tgt:[-62,2.5,0], info:"Demand is separated into strict planning buckets. Source, destination, departure, TU mode, temperature and special transport characteristics remain attached to every object." },
00:28:50.306 1271|    { n:2, name:"Master Data Validation", zone:"Validation Gate", cam:[-45,14,23], tgt:[-45,3,0], info:"Illustrative logistics master data is validated before decomposition: UOM quantities, dimensions, weight, stackability, temperature rules, assigned lane and allowed TU types." },
00:28:50.306 
00:28:50.306 The symbol "decompose" has already been declared
00:28:50.306 1279|  ];
00:28:50.306 1280|  
00:28:50.306 1281|  function decompose(d) {
00:28:50.306    |           ^
00:28:50.306 1282|    if (!d.valid) return { demand:d, fullPallets:0, fullPalletUnits:0, layers:0, layerUnits:0, cartons:0, cartonUnits:0, loosePacks:0, remainingSteps:[d.qty] };
00:28:50.306 1283|    let remaining=d.qty;
00:28:50.306 
00:28:50.306 The symbol "DECOMPOSITIONS" has already been declared
00:28:50.306 1291|    return { demand:d, fullPallets, fullPalletUnits, layers, layerUnits, cartons, cartonUnits, loosePacks, remainingSteps:[d.qty,afterPallets,afterLayers,afterCartons,0] };
00:28:50.306 1292|  }
00:28:50.307 1293|  const DECOMPOSITIONS=DEMANDS.map(decompose);
00:28:50.307    |        ^
00:28:50.307 1294|  const validDecomp=DECOMPOSITIONS.filter(x=>x.demand.valid);
00:28:50.307 1295|  const sum=(key)=>validDecomp.reduce((a,x)=>a+(x[key]||0),0);
00:28:50.307 
00:28:50.307 The symbol "validDecomp" has already been declared
00:28:50.307 1292|  }
00:28:50.307 1293|  const DECOMPOSITIONS=DEMANDS.map(decompose);
00:28:50.307 1294|  const validDecomp=DECOMPOSITIONS.filter(x=>x.demand.valid);
00:28:50.307    |        ^
00:28:50.307 1295|  const sum=(key)=>validDecomp.reduce((a,x)=>a+(x[key]||0),0);
00:28:50.307 1296|  
00:28:50.307 
00:28:50.307 The symbol "sum" has already been declared
00:28:50.307 1293|  const DECOMPOSITIONS=DEMANDS.map(decompose);
00:28:50.308 1294|  const validDecomp=DECOMPOSITIONS.filter(x=>x.demand.valid);
00:28:50.308 1295|  const sum=(key)=>validDecomp.reduce((a,x)=>a+(x[key]||0),0);
00:28:50.308    |        ^
00:28:50.308 1296|  
00:28:50.308 1297|  const PALLET_PLAN = {
00:28:50.308 
00:28:50.308 The symbol "PALLET_PLAN" has already been declared
00:28:50.308 1295|  const sum=(key)=>validDecomp.reduce((a,x)=>a+(x[key]||0),0);
00:28:50.308 1296|  
00:28:50.308 1297|  const PALLET_PLAN = {
00:28:50.308    |        ^
00:28:50.308 1298|    mpl:[
00:28:50.308 1299|      {id:"MPL-01",bucketId:BUCKETS.AMB_VIE.id,materials:"M-1001 · 3 ambient layers",layers:3,height:1.30,weight:285,temp:"Ambient"},
00:28:50.308 
00:28:50.308 The symbol "TU_RESULTS" has already been declared
00:28:50.308 1311|  };
00:28:50.308 1312|  
00:28:50.308 1313|  const TU_RESULTS=[
00:28:50.308    |        ^
00:28:50.309 1314|    {id:"TU 1",bucketId:BUCKETS.AMB_VIE.id,type:"Standard Trailer",stacks:2,pallets:3,floor:58,vol:46,weight:39,status:"Selected after Small Box Truck capacity rejection",color:C.cyan},
00:28:50.309 1315|    {id:"TU 2",bucketId:BUCKETS.COOL_VIE.id,type:"Temperature-Controlled Box Truck",stacks:2,pallets:3,floor:64,vol:58,weight:51,status:"Selected · 2–8 °C capable",color:C.blue},
00:28:50.309 
00:28:50.309 The symbol "avg" has already been declared
00:28:50.309 1318|    {id:"TU 5",bucketId:BUCKETS.LONG_PAR.id,type:"Long-Goods Trailer",stacks:2,pallets:2,floor:48,vol:39,weight:35,status:"Selected · 4.2 m material length",color:C.amber},
00:28:50.309 1319|  ];
00:28:50.309 1320|  const avg=(k)=>Math.round(TU_RESULTS.reduce((a,t)=>a+t[k],0)/TU_RESULTS.length);
00:28:50.309    |        ^
00:28:50.309 1321|  const SUMMARY={
00:28:50.309 1322|    forecastQty:DEMANDS.reduce((a,d)=>a+d.qty,0), materials:DEMANDS.length,
00:28:50.309 
00:28:50.309 The symbol "SUMMARY" has already been declared
00:28:50.309 1319|  ];
00:28:50.309 1320|  const avg=(k)=>Math.round(TU_RESULTS.reduce((a,t)=>a+t[k],0)/TU_RESULTS.length);
00:28:50.309 1321|  const SUMMARY={
00:28:50.309    |        ^
00:28:50.309 1322|    forecastQty:DEMANDS.reduce((a,d)=>a+d.qty,0), materials:DEMANDS.length,
00:28:50.310 1323|    fullPalletQty:sum("fullPalletUnits"), fullPallets:sum("fullPallets"), layers:sum("layers"), cartons:sum("cartons"), loosePacks:sum("loosePacks"),
00:28:50.310 
00:28:50.310 The symbol "makeLabel" has already been declared
00:28:50.310 1339|  
00:28:50.310 1340|  /* --------------------------- 3D helpers --------------------------- */
00:28:50.310 1341|  function makeLabel(text, opts = {}) {
00:28:50.310    |           ^
00:28:50.310 1342|    const { size = 40, color = "#e6edf3", bg = "rgba(10,16,23,0.78)", pad = 16 } = opts;
00:28:50.310 1343|    const cv = document.createElement("canvas");
00:28:50.310 
00:28:50.310 The symbol "palletBase" has already been declared
00:28:50.310 1361|    return sp;
00:28:50.310 1362|  }
00:28:50.310 1363|  function palletBase() {
00:28:50.310    |           ^
00:28:50.310 1364|    const g = new THREE.Group();
00:28:50.310 1365|    const wood = new THREE.MeshLambertMaterial({ color: 0x8a6a45 });
00:28:50.310 
00:28:50.310 The symbol "edged" has already been declared
00:28:50.310 1372|    return g;
00:28:50.311 1373|  }
00:28:50.311 1374|  function edged(mesh, color = 0x0b1220) {
00:28:50.311    |           ^
00:28:50.311 1375|    const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color }));
00:28:50.311 1376|    e.position.copy(mesh.position); e.rotation.copy(mesh.rotation);
00:28:50.311 
00:28:50.311 The symbol "fullPallet" has already been declared
00:28:50.311 1377|    return e;
00:28:50.311 1378|  }
00:28:50.311 1379|  function fullPallet(ci) {
00:28:50.311    |           ^
00:28:50.311 1380|    const g = palletBase();
00:28:50.311 1381|    const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.5, 1.5), new THREE.MeshLambertMaterial({ color: MAT_COLORS[ci] }));
00:28:50.311 
00:28:50.311 The symbol "layerUnit" has already been declared
00:28:50.311 1383|    return g;
00:28:50.311 1384|  }
00:28:50.311 1385|  function layerUnit(ci, overhang = false) {
00:28:50.312    |           ^
00:28:50.312 1386|    const g = new THREE.Group();
00:28:50.312 1387|    const w = overhang ? 2.7 : 2.3;
00:28:50.312 
00:28:50.312 The symbol "mplPallet" has already been declared
00:28:50.312 1390|    return g;
00:28:50.312 1391|  }
00:28:50.312 1392|  function mplPallet(cis, overhangTop = false) {
00:28:50.312    |           ^
00:28:50.312 1393|    const g = palletBase();
00:28:50.312 1394|    cis.forEach((ci, i) => {
00:28:50.312 
00:28:50.312 The symbol "mpmPallet" has already been declared
00:28:50.312 1399|    return g;
00:28:50.312 1400|  }
00:28:50.312 1401|  function mpmPallet(cis, h = 1.4, seed = 1) {
00:28:50.312    |           ^
00:28:50.312 1402|    const g = palletBase();
00:28:50.312 1403|    let s = seed;
00:28:50.313 
00:28:50.313 The symbol "longCarrier" has already been declared
00:28:50.313 1417|    return g;
00:28:50.313 1418|  }
00:28:50.313 1419|  function longCarrier(ci) {
00:28:50.313    |           ^
00:28:50.313 1420|    const g = new THREE.Group();
00:28:50.313 1421|    const base = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.25, 1.2), new THREE.MeshLambertMaterial({ color: 0x64748b }));
00:28:50.313 
00:28:50.313 The symbol "cartonBox" has already been declared
00:28:50.313 1428|    return g;
00:28:50.313 1429|  }
00:28:50.313 1430|  function cartonBox(ci, s = 0.7) {
00:28:50.313    |           ^
00:28:50.313 1431|    const g = new THREE.Group();
00:28:50.313 1432|    const m = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.75, s * 0.85), new THREE.MeshLambertMaterial({ color: MAT_COLORS[ci] }));
00:28:50.313 
00:28:50.313 The symbol "truckUnit" has already been declared
00:28:50.313 1434|    return g;
00:28:50.313 1435|  }
00:28:50.314 1436|  function truckUnit(kind) {
00:28:50.314    |           ^
00:28:50.314 1437|    const g = new THREE.Group();
00:28:50.314 1438|    const cfg = {
00:28:50.314 
00:28:50.314 The symbol "stackBracket" has already been declared
00:28:50.314 1466|    return g;
00:28:50.314 1467|  }
00:28:50.314 1468|  function stackBracket(h, col = 0x22d3ee) {
00:28:50.314    |           ^
00:28:50.314 1469|    const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.9, h, 2.0)),
00:28:50.314 1470|      new THREE.LineBasicMaterial({ color: col }));
00:28:50.314 
00:28:50.314 The symbol "ring" has already been declared
00:28:50.314 1472|    return box;
00:28:50.314 1473|  }
00:28:50.314 1474|  function ring(colorHex, r = 1.9) {
00:28:50.314    |           ^
00:28:50.315 1475|    const m = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.16, 40),
00:28:50.315 1476|      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
00:28:50.315 
00:28:50.315 The symbol "conveyorSeg" has already been declared
00:28:50.315 1478|    return m;
00:28:50.315 1479|  }
00:28:50.315 1480|  function conveyorSeg(len, x, z, rotY = 0) {
00:28:50.315    |           ^
00:28:50.315 1481|    const g = new THREE.Group();
00:28:50.315 1482|    const belt = new THREE.Mesh(new THREE.BoxGeometry(len, 0.18, 1.7), new THREE.MeshLambertMaterial({ color: 0x243244 }));
00:28:50.315 
00:28:50.315 The symbol "floorArrow" has already been declared
00:28:50.315 1489|    return g;
00:28:50.315 1490|  }
00:28:50.315 1491|  function floorArrow(x, z) {
00:28:50.315    |           ^
00:28:50.315 1492|    const shape = new THREE.Shape();
00:28:50.315 1493|    shape.moveTo(0, 0.8); shape.lineTo(1.5, 0); shape.lineTo(0, -0.8); shape.lineTo(0.45, 0); shape.closePath();
00:28:50.315 
00:28:50.316 The symbol "disposeObject3D" has already been declared
00:28:50.316 1497|  }
00:28:50.316 1498|  
00:28:50.316 1499|  function disposeObject3D(root) {
00:28:50.316    |           ^
00:28:50.316 1500|    if (!root) return;
00:28:50.316 1501|    root.traverse((obj) => {
00:28:50.316 
00:28:50.316 The symbol "clearGroup" has already been declared
00:28:50.316 1508|    });
00:28:50.316 1509|  }
00:28:50.316 1510|  function clearGroup(group) {
00:28:50.316    |           ^
00:28:50.316 1511|    if (!group) return;
00:28:50.317 1512|    while (group.children.length > 0) {
00:28:50.317 
00:28:50.317 Multiple exports with the same name "default"
00:28:50.317 1518|  
00:28:50.317 1519|  /* ============================ component ============================ */
00:28:50.317 1520|  export default function ForecastToTransportSim() {
00:28:50.318    |         ^
00:28:50.318 1521|    const mountRef = useRef(null);
00:28:50.318 1522|    const threeRef = useRef(null);          // { scene, camera, renderer, dynamic, tweens, pulses }
00:28:50.318 
00:28:50.318 The symbol "ForecastToTransportSim" has already been declared
00:28:50.318 1518|  
00:28:50.318 1519|  /* ============================ component ============================ */
00:28:50.318 1520|  export default function ForecastToTransportSim() {
00:28:50.319    |                          ^
00:28:50.319 1521|    const mountRef = useRef(null);
00:28:50.319 1522|    const threeRef = useRef(null);          // { scene, camera, renderer, dynamic, tweens, pulses }
00:28:50.319 
00:28:50.319     at failureErrorWithLog (/vercel/path0/node_modules/esbuild/lib/main.js:1472:15)
00:28:50.319     at /vercel/path0/node_modules/esbuild/lib/main.js:755:50
00:28:50.319     at responseCallbacks.<computed> (/vercel/path0/node_modules/esbuild/lib/main.js:622:9)
00:28:50.319     at handleIncomingPacket (/vercel/path0/node_modules/esbuild/lib/main.js:677:12)
00:28:50.319     at Socket.readFromStdout (/vercel/path0/node_modules/esbuild/lib/main.js:600:7)
00:28:50.319     at Socket.emit (node:events:509:28)
00:28:50.319     at addChunk (node:internal/streams/readable:563:12)
00:28:50.319     at readableAddChunkPushByteMode (node:internal/streams/readable:514:3)
00:28:50.319     at Readable.push (node:internal/streams/readable:394:5)
00:28:50.320     at Pipe.onStreamRead (node:internal/stream_base_commons:189:23)
00:28:50.525 Error: Command "npm run build" exited with 1
