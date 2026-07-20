import React, { useState } from "react";
import SupplyChainSim from "./SupplyChainSim";
import ForecastToTransportSim from "./ForecastToTransportSim";

const theme = {
  bg: "#0a1017",
  panel: "#141b25",
  panel2: "#1a2331",
  line: "#26313f",
  text: "#e8edf4",
  dim: "#8fa0b5",
  blue: "#4da3ff",
  green: "#34d399",
  purple: "#c084fc",
};

function Hub({ open }) {
  const card = (accent) => ({
    minHeight: 250,
    padding: 24,
    borderRadius: 18,
    border: `1px solid ${accent}`,
    background: "rgba(20,27,37,0.96)",
    color: theme.text,
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 16px 40px rgba(0,0,0,.25)",
  });

  return (
    <main className="hub-shell">
      <section className="hub-content">
        <div className="hub-eyebrow">3D LOGISTICS DIGITAL TWIN</div>
        <h1>Operational process simulation and forecast-based transport capacity planning</h1>
        <p className="hub-intro">
          Select the operational supply-chain world or the forecast-to-transport model. Both simulations run independently within the same application.
        </p>
        <div className="hub-grid">
          <button type="button" onClick={() => open("operations")} style={card(theme.blue)}>
            <div className="card-index" style={{ color: theme.blue }}>01 · OPERATIONAL 3D WORLD</div>
            <h2>Inbound, storage, picking, packing and shipping</h2>
            <p>Explore the full end-to-end warehouse flow and compare six label-process scenarios, including automated HU buffering and sequencing.</p>
            <strong style={{ color: theme.blue }}>Open operational simulation →</strong>
          </button>
          <button type="button" onClick={() => open("forecast")} style={card(theme.purple)}>
            <div className="card-index" style={{ color: theme.purple }}>02 · FORECASTING & CAPACITY</div>
            <h2>Forecast-to-Transport Capacity Simulation</h2>
            <p>Transform demand into pallets, stacks and transport units across nine phases, including validation, MPL/MPM, long goods and loading.</p>
            <strong style={{ color: theme.purple }}>Open forecasting simulation →</strong>
          </button>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [module, setModule] = useState("hub");

  if (module === "operations") {
    return <SupplyChainSim onBackToHub={() => setModule("hub")} />;
  }

  if (module === "forecast") {
    return (
      <div className="module-shell">
        <ForecastToTransportSim />
        <button className="global-home" type="button" onClick={() => setModule("hub")}>⌂ Main Home</button>
      </div>
    );
  }

  return <Hub open={setModule} />;
}
