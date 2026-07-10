import Solar3DCanvas from "../../solar3d/Solar3DCanvas";
import ThemeBar from "../../solar3d/ThemeBar";
import { useSolarStore } from "../../solar3d/useSolarStore";
import { useEffect } from "react";

const Model3DPage = () => {
  const G = useSolarStore((s) => s.G);
  const updateG = useSolarStore((s) => s.updateG);

  const sunHour = useSolarStore((s) => s.sunHour);
  const sunMonth = useSolarStore((s) => s.sunMonth);
  const setSunHour = useSolarStore((s) => s.setSunHour);
  const setSunMonth = useSolarStore((s) => s.setSunMonth);
  const wiringMode = useSolarStore((s) => s.wiringMode);
  const setWiringMode = useSolarStore((s) => s.setWiringMode);
  const sunHoursText = useSolarStore((s) => s.sunHoursText);

  // Compute wiring stats dynamically
  const p = G.panel;
  const inv = G.inverter;
  const n = G.numPanels || 0;

  let wsVoltage = "—";
  let wsAmps = "—";
  let wsStrings = "—";

  if (p) {
    const perStr = inv
      ? Math.floor((inv.maxVdc * 0.9) / p.voc)
      : Math.ceil(n / 3) || 1;
    const numStr = Math.ceil(n / perStr) || 1;

    if (wiringMode === "series") {
      wsVoltage = (p.vmp * perStr).toFixed(0);
      wsAmps = p.imp.toFixed(1);
      wsStrings = numStr;
    } else if (wiringMode === "parallel") {
      wsVoltage = p.vmp.toFixed(0);
      wsAmps = (p.imp * n).toFixed(1);
      wsStrings = 1;
    } else {
      wsVoltage = (p.vmp * perStr).toFixed(0);
      wsAmps = (p.imp * numStr).toFixed(1);
      wsStrings = numStr;
    }
  }

  // Format sunTime slider value (e.g. 12.5 -> 12:30 PM)
  const formatSunTime = (hr) => {
    const h = Math.floor(hr);
    const m = Math.round((hr - h) * 60);
    const ap = hr >= 12 ? "PM" : "AM";
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
  };

  const applyOptimalTilt = () => {
    if (G.optTilt) {
      updateG({ tilt: G.optTilt });
    }
  };

  const handleConfirm3D = () => {
    // Set tag done
    const tag = document.getElementById("t3");
    if (tag) {
      tag.textContent = "✅ Done";
      tag.classList.add("done");
    }
    // Scroll to next step: Diagrams
    document.getElementById("s4")?.scrollIntoView({ behavior: "smooth" });
  };

  // Automatically update 3D numbers done
  useEffect(() => {
    if (G.panel && G.numPanels) {
      const tag = document.getElementById("t3");
      if (tag && tag.textContent === "⏳") {
        tag.textContent = "✅ Active";
        tag.classList.add("done");
      }
    }
  }, [G.panel, G.numPanels]);

  // Compute live value overlays
  const dcKwpStr = G.systemKW ? `${G.systemKW.toFixed(2)} kWp` : "— kWp";
  const invBrandStr = G.inverter ? `${G.inverter.brand} ${G.inverter.kw}kW` : "Not selected";
  const batBrandStr = G.battery 
    ? `${G.battery.brand} ${G.battery.kwh}kWh` 
    : G.gridType === "on-grid" 
      ? "Not needed" 
      : "Not selected";
  const prPctStr = G.analysis ? `${G.analysis.avgPR}%` : "Run analysis";

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <section className="sw dark-sw" id="s3" style={{ background: "#111827", color: "#fff" }}>
      <div className="shdr light">
        <span className="sno">04</span>
        <div>
          <h2>3D Solar Model</h2>
          <p>Panels on roof with mounting stands. Inverter &amp; battery shown. Each panel individually movable.</p>
        </div>
        <span className="stag light" id="t3">⏳</span>
      </div>

      <div className="three-wrap">
        {/* Sidebar Controls */}
        <div className="ctrl-col">
          <div className="cp">
            <div className="cpt">⏰ Sun Time</div>
            <label className="cl">Time of Day</label>
            <input 
              type="range" 
              min="5" 
              max="19" 
              step="0.5" 
              value={sunHour} 
              onChange={(e) => setSunHour(parseFloat(e.target.value))} 
            />
            <span className="rv" id="chr-v" style={{ display: "block", color: "#F5A040", fontWeight: "bold", fontSize: "0.85rem", marginTop: "2px" }}>
              {formatSunTime(sunHour)}
            </span>
            
            <label className="cl mt1">Month</label>
            <select 
              value={sunMonth} 
              onChange={(e) => setSunMonth(parseInt(e.target.value))}
            >
              {months.map((m, idx) => (
                <option key={idx} value={idx + 1}>{m}</option>
              ))}
            </select>
          </div>

          <div className="cp">
            <div className="cpt">📐 Tilt Control</div>
            <label className="cl">Panel Tilt (°)</label>
            <input 
              type="range" 
              min="5" 
              max="45" 
              value={G.tilt || 15} 
              onChange={(e) => updateG({ tilt: parseInt(e.target.value) || 15 })} 
            />
            <span className="rv" id="ctilt-v" style={{ display: "block", color: "#F5A040", fontWeight: "bold", fontSize: "0.85rem", marginTop: "2px" }}>
              {G.tilt || 15}°
            </span>
            <button className="btn-sm-or mt1 w100" onClick={applyOptimalTilt}>
              ⟳ Use Optimal
            </button>
            <div className="opt-box mt1" id="opt-box" style={{ marginTop: "8px" }}>
              Optimal: <b>{G.optTilt ? `${G.optTilt.toFixed(1)}°` : "—"}</b>
            </div>
          </div>

          <div className="cp">
            <div className="cpt">🔌 Wiring Mode</div>
            <div className="wbg">
              <button 
                className={`wb ${wiringMode === "series" ? "active" : ""}`} 
                onClick={() => setWiringMode("series")}
              >
                Series
              </button>
              <button 
                className={`wb ${wiringMode === "parallel" ? "active" : ""}`} 
                onClick={() => setWiringMode("parallel")}
              >
                Parallel
              </button>
              <button 
                className={`wb ${wiringMode === "series-parallel" ? "active" : ""}`} 
                onClick={() => setWiringMode("series-parallel")}
              >
                S+P
              </button>
            </div>
            <div className="wstats">
              <div className="wsr"><span>String V</span><b id="ws-v">{wsVoltage}V</b></div>
              <div className="wsr"><span>Current A</span><b id="ws-a">{wsAmps}A</b></div>
              <div className="wsr"><span>Strings</span><b id="ws-s">{wsStrings}</b></div>
            </div>
          </div>

          <div className="cp">
            <div className="cpt">🌐 Grid Type</div>
            <div className="gbg">
              <button 
                className={`gb ${G.gridType === "on-grid" ? "active" : ""}`} 
                onClick={() => updateG({ gridType: "on-grid" })}
              >
                On-Grid
              </button>
              <button 
                className={`gb ${G.gridType === "hybrid" ? "active" : ""}`} 
                onClick={() => updateG({ gridType: "hybrid" })}
              >
                Hybrid
              </button>
              <button 
                className={`gb ${G.gridType === "off-grid" ? "active" : ""}`} 
                onClick={() => updateG({ gridType: "off-grid" })}
              >
                Off-Grid
              </button>
            </div>
          </div>

          <div className="cp">
            <div className="cpt">📊 Sun Data</div>
            <div className="shr"><span>Sunrise</span><b id="sh1">05:30</b></div>
            <div className="shr"><span>Sunset</span><b id="sh2">18:15</b></div>
            <div className="shr"><span>Peak Hours</span><b id="sh3">{sunHoursText}</b></div>
          </div>
        </div>

        {/* 3D Canvas Box */}
        <div className="cv-wrap" style={{ height: "560px", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <Solar3DCanvas G={G} />

            {/* Overlays */}
            <div className="ov">
              <span id="ov-lbl" className="ov-lbl-chip">
                {`${G.numPanels} Panels · ${G.systemKW ? G.systemKW.toFixed(2) : "—"} kWp DC · ${(G.gridType || "on-grid").toUpperCase()} · Tilt ${G.tilt || 15}°`}
              </span>
              <span className="ov-hint">Drag to rotate · Scroll to zoom · Move Mode to drag panels</span>
            </div>

            <div className="ov3d-values" id="ov3d-values" style={{
              position: "absolute",
              top: "0.9rem",
              right: "0.9rem",
              background: "rgba(0,0,0,.65)",
              padding: "8px 12px",
              borderRadius: "8px",
              fontSize: "0.78rem",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              pointerEvents: "none"
            }}>
              <div className="ov3d-item" id="ov3d-dc">DC: {dcKwpStr}</div>
              <div className="ov3d-item" id="ov3d-inv">INV: {invBrandStr}</div>
              <div className="ov3d-item" id="ov3d-bat">BAT: {batBrandStr}</div>
              <div className="ov3d-item" id="ov3d-pr">PR: {prPctStr}</div>
            </div>

            <div className="leg">
              <span><span className="ld bl"></span>Active</span>
              <span><span class="ld or"></span>Shaded</span>
              <span><span class="ld gr"></span>Stand</span>
              <span><span class="ld ye"></span>Row Gap</span>
              <span><span class="ld gn"></span>Wiring</span>
            </div>
          </div>
        </div>
      </div>
      
      <button className="btn-or w100 mt1" onClick={handleConfirm3D}>
        ⚡ Confirm 3D Layout → Generate 2D Diagrams
      </button>
    </section>
  );
};

export default Model3DPage;

