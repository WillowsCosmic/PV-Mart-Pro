
import { useEffect } from 'react';
import NavBar from '../../components/common/NavBar';
import { useSolarStore } from '../../solar3d/useSolarStore';
import { drawAll2D } from '../../services/diagrams';

const DiagramsPage = () => {
  const G = useSolarStore((s) => s.G);
  const sunHour = useSolarStore((s) => s.sunHour);
  const sunMonth = useSolarStore((s) => s.sunMonth);

  // Redraw canvases whenever site data, panel selections, or sun times change
  useEffect(() => {
    if (G.panel) {
      drawAll2D(G);
    }
  }, [G, sunHour, sunMonth]);

  const handleConfirmDiagrams = () => {
    // Set tag done
    const tag = document.getElementById("t4");
    if (tag) {
      tag.textContent = "✅ Done";
      tag.classList.add("done");
    }
    // Scroll to next step: Simulation
    document.getElementById("s-sim")?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div>
      <NavBar progress={65} />
      <section className="sw" id="s4">
        <div className="shdr">
          <span className="sno">05</span>
          <div>
            <h2>2D Wiring &amp; Layout Diagrams</h2>
            <p>Panel layout, series/parallel wiring, tilt cross-section &amp; obstacle shadow map.</p>
          </div>
          <span className="stag" id="t4">⏳</span>
        </div>
        <div className="diagrams-grid">
          <div className="diag-card">
            <div className="diag-title">Panel Layout (Top View)</div>
            <canvas id="d-layout" width="520" height="340"></canvas>
          </div>
          <div className="diag-card">
            <div className="diag-title">Wiring Diagram (Series / Parallel)</div>
            <canvas id="d-wiring" width="520" height="200"></canvas>
            <div style={{ marginTop: '6px', borderTop: '1px solid #EDE8DC', paddingTop: '6px' }}>
              <div className="diag-title" style={{ fontSize: '.78rem', marginBottom: '4px' }}>
                ☀️ Iso-Shading Diagram (Sun Path)
              </div>
              <canvas id="d-isoshade" width="520" height="128"></canvas>
            </div>
          </div>
          <div className="diag-card">
            <div className="diag-title">Tilt Angle Cross-Section</div>
            <canvas id="d-tilt" width="520" height="340"></canvas>
          </div>
          <div className="diag-card">
            <div className="diag-title">Obstacle Shadow Map</div>
            <canvas id="d-shadow" width="520" height="340"></canvas>
          </div>
        </div>

        <button className="btn-or w100 mt1" onClick={handleConfirmDiagrams}>
          ✅ Confirm Diagrams → Run Simulation
        </button>
      </section>
    </div>
  );
};

export default DiagramsPage;