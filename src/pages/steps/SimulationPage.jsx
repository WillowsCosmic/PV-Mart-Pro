import { useEffect, useState, useRef } from 'react';
import NavBar from '../../components/common/NavBar';
import { useSolarStore } from '../../solar3d/useSolarStore';
import { getGHI, getAmbientTemp } from '../../services/solarPhysics';
import Chart from 'chart.js/auto';

const SimulationPage = () => {
  const G = useSolarStore((s) => s.G);
  const updateG = useSolarStore((s) => s.updateG);

  const [avgLoadKW, setAvgLoadKW] = useState(2.0);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const runSimulation = () => {
    const p = G.panel;
    const inv = G.inverter;
    const bat = G.battery;
    const n = G.numPanels || 0;
    const lat = G.lat || 22.5726;

    if (!p || n === 0) return;

    const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const LOAD = [
      0.3, 0.3, 0.3, 0.3, 0.4, 0.6, 0.8, 0.9, 1.0, 0.9, 0.8, 0.8,
      0.9, 0.9, 0.9, 0.9, 1.0, 1.0, 1.2, 1.4, 1.3, 1.1, 0.8, 0.5
    ];

    const invKW = inv?.kw || G.systemKW || (n * p.watt / 1000);
    const invEff = inv?.eff || 0.96;
    const batDod = bat?.dod || 0;
    const batKwh = bat ? bat.kwh * batDod : 0;
    const batPow = batKwh / 2; // 0.5C charge/discharge rate

    let totalGen = 0, selfConsume = 0, gridExport = 0, gridImport = 0;
    let batSOC = batKwh * 0.5;
    const hourlyGen = Array(24).fill(0);
    const hourlyLoad = Array(24).fill(0);
    const hourlySelf = Array(24).fill(0);

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    MONTHS.forEach((mo, mi) => {
      const days = DAYS[mi];
      const ghiDay = (G.nasaData?.ghi?.[mi] || getGHI(lat)[mi]) || 5;
      const tamb = (G.nasaData?.temp?.[mi] || getAmbientTemp(lat)[mi]) || 30;

      for (let h = 0; h < 24; h++) {
        // Hourly irradiance (W/m²) using sine bell curve
        const sinF = (h >= 6 && h <= 18) ? Math.sin(Math.PI * (h - 6) / 12) : 0;
        const gHr = ghiDay * 1000 * Math.PI / (2 * 12) * sinF;
        const beta = (G.tilt || 15) * Math.PI / 180;
        const gtilt = gHr * (1 + 0.1 * Math.sin(beta));

        // Cell temperature & temp factor
        const tcell = tamb + ((p.noct || 45) - 20) / 800 * gtilt;
        const tf = Math.max(0.5, 1 + (p.gamma || -0.004) * (tcell - 25));

        // Hourly AC generation
        const pdcKW = (n * p.watt / 1000) * (gtilt / 1000);
        // soiling factor varies: 3% avg soiling (monsoon less, dry more)
        const soilingLoss = [0.07,0.07,0.06,0.06,0.06,0.03,0.02,0.02,0.03,0.06,0.07,0.07][mi] || 0.05;
        const genH = Math.max(0, pdcKW * tf * (1 - soilingLoss) * (1 - 0.04) * invEff);
        const finalGen = Math.max(0, Math.min(genH, invKW));

        const loadH = avgLoadKW * LOAD[h];
        const dayW = days;

        totalGen += finalGen * dayW;
        hourlyGen[h] += finalGen * dayW;
        hourlyLoad[h] += loadH * dayW;

        // self-consume -> battery -> grid
        let surplus = finalGen - loadH;
        const self = Math.min(finalGen, loadH);
        selfConsume += self * dayW;
        hourlySelf[h] += self * dayW;

        if (surplus > 0) {
          if (bat && batSOC < batKwh) {
            const charge = Math.min(surplus, batPow, batKwh - batSOC);
            batSOC += charge * (bat.eff || 0.95);
            surplus -= charge;
          }
          gridExport += Math.max(0, surplus) * dayW;
        } else {
          const deficit = -surplus;
          if (bat && batSOC > 0) {
            const disc = Math.min(deficit, batPow, batSOC);
            batSOC -= disc;
            gridImport += Math.max(0, deficit - disc) * dayW;
          } else {
            gridImport += deficit * dayW;
          }
        }
      }
    });

    const selfRatio = totalGen > 0 ? (selfConsume / totalGen * 100).toFixed(1) : '0';
    const peakHour = hourlyGen.indexOf(Math.max(...hourlyGen));
    const backupHrs = bat ? (bat.kwh * bat.dod / Math.max(0.1, avgLoadKW)).toFixed(1) : '0';

    const simResult = {
      totalGen: totalGen.toFixed(0),
      selfConsume: selfConsume.toFixed(0),
      gridExport: gridExport.toFixed(0),
      gridImport: gridImport.toFixed(0),
      selfRatio,
      peakHour,
      backupHrs,
      hourlyGen: hourlyGen.map(v => +(v / 365).toFixed(2)),
      hourlyLoad: hourlyLoad.map(v => +(v / 365).toFixed(2)),
      hourlySelf: hourlySelf.map(v => +(v / 365).toFixed(2))
    };

    updateG({ simulation: simResult });
  };

  // Run simulation reactively when state changes
  useEffect(() => {
    runSimulation();
  }, [G.panel, G.inverter, G.battery, G.numPanels, G.tilt, G.lat, G.nasaData, avgLoadKW]);

  // Render/Update Chart.js line graph
  useEffect(() => {
    const s = G.simulation;
    if (!s || !chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    const hrs = Array.from({ length: 24 }, (_, i) => `${i}h`);

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: hrs,
        datasets: [
          { label: 'Generation', data: s.hourlyGen, borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,.15)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0 },
          { label: 'Load', data: s.hourlyLoad, borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,.1)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0 },
          { label: 'Self-use', data: s.hourlySelf, borderColor: '#22C55E', backgroundColor: 'transparent', fill: false, tension: 0.4, borderWidth: 1.5, pointRadius: 0, borderDash: [4, 2] }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: 'rgba(255,255,255,.65)', font: { size: 9 }, boxWidth: 8, padding: 6 } },
          title: { display: true, text: 'Hourly Energy Flow — daily average (kWh)', color: 'rgba(255,255,255,.8)', font: { size: 10 } }
        },
        scales: {
          x: { ticks: { color: 'rgba(255,255,255,.4)', font: { size: 8 }, maxTicksLimit: 12 }, grid: { color: 'rgba(255,255,255,.04)' } },
          y: { 
            ticks: { color: 'rgba(255,255,255,.4)', font: { size: 8 } }, 
            grid: { color: 'rgba(255,255,255,.06)' },
            title: { display: true, text: 'kWh/day avg', color: 'rgba(255,255,255,.4)', font: { size: 8 } }
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [G.simulation]);

  const f = v => Math.round(Number(v)).toLocaleString('en-IN');
  const s = G.simulation || {
    totalGen: '—',
    selfRatio: '—',
    gridExport: '—',
    gridImport: '—',
    backupHrs: '—',
    peakHour: 12
  };

  const handleConfirmSimulation = () => {
    // Set tag done
    const tag = document.getElementById("t-sim");
    if (tag) {
      tag.textContent = "✅ Done";
      tag.classList.add("done");
    }
    // Scroll to next step: Physics Analysis
    document.getElementById("s6")?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div>
      <NavBar progress={80} />
      <section className="sw" id="s-sim">
        <div className="shdr">
          <span className="sno">06</span>
          <div>
            <h2>🔶 Simulation Engine</h2>
            <p>8760-hour energy flow: Generation → Load → Self-consume / Battery / Grid per hour</p>
          </div>
          <span className="stag" id="t-sim">⏳</span>
        </div>
        <div className="sim-section" style={{ background: '#1E2538', padding: '1.2rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,.07)' }}>
          <div className="sim-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,.06)', paddingBottom: '.8rem' }}>
            <div className="sim-kpis-row" id="sim-kpis-row" style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
              <div className="sim-kpi-sm" style={{ background: 'rgba(255,255,255,.05)', padding: '.45rem .8rem', borderRadius: '8px', textAlign: 'center', minWidth: '100px' }}>
                <b id="sk-gen" style={{ display: 'block', fontSize: '1rem', color: '#F5A040', fontFamily: 'monospace' }}>
                  {s.totalGen !== '—' ? f(s.totalGen) : '—'}
                </b>
                <span style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.45)' }}>kWh Generated</span>
              </div>
              <div className="sim-kpi-sm green" style={{ background: 'rgba(34,197,94,.15)', padding: '.45rem .8rem', borderRadius: '8px', textAlign: 'center', minWidth: '100px' }}>
                <b id="sk-self" style={{ display: 'block', fontSize: '1rem', color: '#4ADE80', fontFamily: 'monospace' }}>
                  {s.selfRatio}%
                </b>
                <span style={{ fontSize: '.65rem', color: 'rgba(34,197,94,.7)' }}>Self-Consumed</span>
              </div>
              <div className="sim-kpi-sm blue" style={{ background: 'rgba(96,165,250,.15)', padding: '.45rem .8rem', borderRadius: '8px', textAlign: 'center', minWidth: '100px' }}>
                <b id="sk-exp" style={{ display: 'block', fontSize: '1rem', color: '#60A5FA', fontFamily: 'monospace' }}>
                  {s.gridExport !== '—' ? f(s.gridExport) : '—'}
                </b>
                <span style={{ fontSize: '.65rem', color: 'rgba(96,165,250,.7)' }}>kWh Exported</span>
              </div>
              <div className="sim-kpi-sm orange" style={{ background: 'rgba(245,158,11,.15)', padding: '.45rem .8rem', borderRadius: '8px', textAlign: 'center', minWidth: '100px' }}>
                <b id="sk-imp" style={{ display: 'block', fontSize: '1rem', color: '#FBBF24', fontFamily: 'monospace' }}>
                  {s.gridImport !== '—' ? f(s.gridImport) : '—'}
                </b>
                <span style={{ fontSize: '.65rem', color: 'rgba(245,158,11,.7)' }}>kWh Grid Import</span>
              </div>
              <div className="sim-kpi-sm" style={{ background: 'rgba(255,255,255,.05)', padding: '.45rem .8rem', borderRadius: '8px', textAlign: 'center', minWidth: '100px' }}>
                <b id="sk-bk" style={{ display: 'block', fontSize: '1rem', color: '#fff', fontFamily: 'monospace' }}>
                  {s.backupHrs} hrs
                </b>
                <span style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.45)' }}>Backup Hrs</span>
              </div>
              <div className="sim-kpi-sm" style={{ background: 'rgba(255,255,255,.05)', padding: '.45rem .8rem', borderRadius: '8px', textAlign: 'center', minWidth: '100px' }}>
                <b id="sk-pk" style={{ display: 'block', fontSize: '1rem', color: '#fff', fontFamily: 'monospace' }}>
                  {String(s.peakHour).padStart(2, '0')}:00
                </b>
                <span style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.45)' }}>Peak Hour</span>
              </div>
            </div>
            
            <div className="sim-load-input" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,.05)', padding: '6px 12px', borderRadius: '8px' }}>
              <label style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.6)', fontWeight: 600 }}>Avg Load (kW)</label>
              <input 
                type="number" 
                value={avgLoadKW} 
                min="0.1" 
                step="0.5" 
                onChange={(e) => setAvgLoadKW(parseFloat(e.target.value) || 0.1)}
                style={{ width: '64px', background: '#0a1628', border: '1px solid rgba(255,255,255,.15)', borderRadius: '6px', color: '#fff', padding: '3px 6px', outline: 'none' }}
              />
              <button className="btn-sm-or" onClick={runSimulation}>▶ Recalc</button>
            </div>
          </div>

          <div style={{ position: 'relative', height: '220px', marginTop: '.6rem' }}>
            <canvas ref={chartRef} id="sim-hourly-chart" style={{ width: '100%', height: '100%' }}></canvas>
          </div>
        </div>

        <button className="btn-or w100 mt1" onClick={handleConfirmSimulation}>
          ✅ Confirm Simulation → Run Physics Analysis
        </button>
      </section>
    </div>
  );
};

export default SimulationPage;