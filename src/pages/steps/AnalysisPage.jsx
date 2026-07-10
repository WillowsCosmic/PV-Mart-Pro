import { useEffect, useState, useRef } from 'react';
import NavBar from '../../components/common/NavBar';
import { useSolarStore } from '../../solar3d/useSolarStore';
import { getGHI, getAmbientTemp, PHYSICS } from '../../services/solarPhysics';
import Chart from 'chart.js/auto';

const AnalysisPage = () => {
  const G = useSolarStore((s) => s.G);
  const updateG = useSolarStore((s) => s.updateG);
  const inv = G.inverter; // ✅ Fixed: derived from G at top level, not a separate hook call below

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('⏳ Click below to fetch meteorological data & run simulator');

  const chartRefs = {
    loss: useRef(null),
    finance: useRef(null),
    ghi: useRef(null),
    pr: useRef(null)
  };

  const chartInstances = useRef({
    loss: null,
    finance: null,
    ghi: null,
    pr: null
  });

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  const fetchNASAData = async (lat, lng) => {
    const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN,T2M,RH2M&community=RE&longitude=${lng.toFixed(4)}&latitude=${lat.toFixed(4)}&format=JSON`;
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!resp.ok) throw new Error('NASA API HTTP ' + resp.status);
      const data = await resp.json();
      const p = data?.properties?.parameter;
      if (!p?.ALLSKY_SFC_SW_DWN) throw new Error('No GHI parameter');

      const ghiMonthly = [];
      const t2mMonthly = [];
      const rhMonthly = [];
      for (let m = 1; m <= 12; m++) {
        ghiMonthly.push(+(p.ALLSKY_SFC_SW_DWN[m] ?? p.ALLSKY_SFC_SW_DWN[String(m)] ?? 5).toFixed(3));
        t2mMonthly.push(+(p.T2M[m] ?? p.T2M[String(m)] ?? 28).toFixed(2));
        rhMonthly.push(+(p.RH2M?.[m] ?? p.RH2M?.[String(m)] ?? 50).toFixed(1));
      }

      const annGHI = +(p.ALLSKY_SFC_SW_DWN.ANN ?? ghiMonthly.reduce((a, b) => a + b, 0) / 12).toFixed(3);
      const annT2M = +(p.T2M.ANN ?? t2mMonthly.reduce((a, b) => a + b, 0) / 12).toFixed(2);
      const annRH = +(p.RH2M?.ANN ?? 50).toFixed(1);

      return { ghi: ghiMonthly, temp: t2mMonthly, rh: rhMonthly, annGHI, annT2M, annRH };
    } catch (e) {
      console.warn('NASA API failed:', e.message);
      return null;
    }
  };

  const runAnalysis = async () => {
    const p = G.panel;
    const localInv = G.inverter; // local alias inside async function
    const n = G.numPanels || 0;
    const lat = G.lat || 22.5726;
    const lng = G.lng || 88.3639;

    if (!p || n === 0) {
      alert('Please select a panel and set count in Step 1 first.');
      return;
    }

    setLoading(true);
    setStatusMsg('📡 Querying NASA POWER Climatology database...');

    // 1. Fetch weather
    let weather = G.nasaData;
    if (!weather) {
      weather = await fetchNASAData(lat, lng);
      if (weather) {
        setStatusMsg(`✅ NASA POWER API loaded · GHI: ${weather.annGHI} kWh/m²/day · Temp: ${weather.annT2M}°C`);
        updateG({ nasaData: weather });
      } else {
        setStatusMsg('⚠️ NASA API offline — loaded regional lookup climatology data');
      }
    } else {
      setStatusMsg(`✅ NASA POWER API cached · GHI: ${weather.annGHI} kWh/m²/day · Temp: ${weather.annT2M}°C`);
    }

    const ghiArr = weather?.ghi || getGHI(lat);
    const tempArr = weather?.temp || getAmbientTemp(lat);

    // 2. Physics formulas
    const optTiltCalc = Math.round(0.76 * Math.abs(lat));
    const useTilt = Math.max(5, Math.min(45, optTiltCalc));
    updateG({ optTilt: optTiltCalc, tilt: useTilt });

    const invMaxVdc = localInv?.maxVdc || 600;
    const correctPerStr = Math.floor(invMaxVdc * 0.9 / (p.voc || 50));
    const actualPerStr = Math.min(correctPerStr, n);
    const numStrings = Math.max(1, Math.ceil(n / actualPerStr));
    const stringVoc = actualPerStr * (p.voc || 50);

    const systemKWdc = +(n * (p.watt || 330) / 1000).toFixed(3);
    const idealInvMin = +(systemKWdc * 0.8).toFixed(1);
    const idealInvMax = +(systemKWdc * 1.2).toFixed(1);
    const invKW = localInv?.kw || systemKWdc || 1;
    const invEff = localInv?.eff || 0.96;
    const dcAcRatioVal = systemKWdc / invKW;
    const dcAcRatio = isFinite(dcAcRatioVal) ? dcAcRatioVal.toFixed(2) : "0.00";

    const panelAreaSqFt = n * (p.sqft || 27);
    const roofAreaSqFt = G.siteArea || 2000;
    const utilizationPctVal = roofAreaSqFt > 0 ? (panelAreaSqFt / roofAreaSqFt * 100) : 0;
    const utilizationPct = isFinite(utilizationPctVal) ? utilizationPctVal.toFixed(1) : "0.0";

    const obsShadeRaw = (G.shadingData || []).reduce((s, r) => s + parseFloat(r.shadeLoss || 0), 0) / 100;
    const totShadeFrac = (G.obstacles || []).length > 0
      ? Math.max(0.03, Math.min(0.20, obsShadeRaw))
      : Math.max(0.005, Math.min(0.10, obsShadeRaw));

    const L_wiring = 0.02;
    const L_mismatch = 0.02;
    const PR_MAX = 0.75;
    const PR_MIN = 0.65;

    let totalKWh = 0;
    const monthly = MONTHS.map((mo, i) => {
      const days = DAYS[i];
      const ghiDay = Math.max(0.5, ghiArr[i]);
      const tamb = tempArr[i] || 30;

      const beta = useTilt * Math.PI / 180;
      const gtilt = ghiDay * (1 + 0.1 * Math.sin(beta));

      const noct = p.noct || 45;
      const tcell = tamb + ((noct - 20) / 800) * 1000;

      const gamma = p.gamma || -0.004;
      const tempFactor = 1 + gamma * (tcell - 25);
      const tempLossPct = Math.max(0, (1 - tempFactor) * 100);

      const lsoil = PHYSICS.soilingLoss(i);
      const lshade = totShadeFrac;

      const prPhysics = tempFactor * (1 - lsoil) * (1 - L_wiring) * (1 - L_mismatch) * (1 - lshade) * invEff;
      const pr = Math.min(PR_MAX, Math.max(PR_MIN, prPhysics));

      const eDC_ideal = systemKWdc * gtilt * days;
      const eAC_phys = eDC_ideal * pr;
      const eAC = Math.min(eAC_phys, invKW * gtilt * pr * days);

      totalKWh += eAC;

      return {
        mo,
        ghi: (ghiDay * days).toFixed(1),
        gtilt: gtilt.toFixed(3),
        tcell: tcell.toFixed(1),
        kwh: eAC.toFixed(0),
        pr: (pr * 100).toFixed(1),
        tLoss: tempLossPct.toFixed(1),
        soilLoss: (lsoil * 100).toFixed(1),
        shLoss: (lshade * 100).toFixed(1),
        net: (eAC * 0.995).toFixed(0),
      };
    });

    const avgTempLoss = monthly.reduce((a, m) => a + parseFloat(m.tLoss), 0) / 1200;
    const avgSoilLoss = monthly.reduce((a, m) => a + parseFloat(m.soilLoss), 0) / 1200;
    const totalLossFrac = avgTempLoss + avgSoilLoss + L_wiring + L_mismatch + totShadeFrac + (1 - invEff);
    const acKW_derated = +(grossKW => grossKW * (1 - totalLossFrac))(systemKWdc).toFixed(2);
    const acKW = Math.min(acKW_derated, invKW);

    const winterSunAlt = Math.max(10, 90 - Math.abs(lat) - 23.45);
    const panelHeightM = (p.sqft * 0.0929 / 1.0) * Math.sin(useTilt * Math.PI / 180);
    const optRowSpacingM = panelHeightM / Math.tan(winterSunAlt * Math.PI / 180);
    const optRowSpacingFt = Math.max(3.5, optRowSpacingM * 3.281).toFixed(1);

    const avgDailySunHrs = (ghiArr.reduce((a, b) => a + b, 0) / 12).toFixed(2);

    const tariff = G.boardTariff || 8.5;
    const annSav = totalKWh * tariff;
    const capex = systemKWdc * 50000;
    const subsidy = capex * 0.30;
    const netCapex = capex - subsidy;
    const payback = annSav > 0 ? (netCapex / annSav).toFixed(1) : '—';
    const co2 = (totalKWh * 0.82 / 1000).toFixed(2);

    const avgPR = (monthly.reduce((a, m) => a + parseFloat(m.pr), 0) / 12).toFixed(1);
    const cufVal = acKW > 0 ? (totalKWh / (acKW * 8760) * 100) : 0;
    const cuf = isFinite(cufVal) ? cufVal.toFixed(1) : '0.0';
    const spY = acKW > 0 ? (totalKWh / acKW).toFixed(0) : '0';

    let npv = -netCapex;
    for (let y = 1; y <= 25; y++) {
      const kwhY = PHYSICS.degradedEnergy(totalKWh, y);
      const tarY = tariff * Math.pow(1.04, y);
      npv += (kwhY * tarY - systemKWdc * 500) / Math.pow(1.08, y);
    }
    const lcoeVal = (netCapex > 0 && totalKWh > 0) ? (netCapex / (totalKWh * 20)) : 0;
    const lcoe = isFinite(lcoeVal) ? lcoeVal.toFixed(2) : '0.00';

    const suggestMore = utilizationPct < 30 && roofAreaSqFt >= 500;
    const maxPanelsCap = Math.floor(roofAreaSqFt * 0.65 / (p.sqft || 27));
    const maxKWp = (maxPanelsCap * p.watt / 1000).toFixed(1);

    updateG({
      analysis: {
        monthly, totalKWh, annSav, capex, subsidy, netCapex, payback,
        co2, avgPR, cuf, spY, pkH: avgDailySunHrs,
        sysKW: acKW, grossKW: systemKWdc, n, tariff,
        optRowSpacingFt, avgDailySunHrs, useTilt,
        npv: npv.toFixed(0), lcoe,
        dcAcRatio,
        stringVoc: stringVoc.toFixed(0),
        actualPerStr, numStrings,
        panelAreaSqFt, utilizationPct,
        idealInvMin, idealInvMax,
        totalLossPct: (totalLossFrac * 100).toFixed(1),
        acKW_derated,
        invMaxVdc,
        dataSource: weather ? 'NASA POWER API' : 'Offline Climatology',
        annGHI: weather?.annGHI || (ghiArr.reduce((a, b) => a + b, 0) / 12).toFixed(2),
        annTemp: weather?.annTemp || (tempArr.reduce((a, b) => a + b, 0) / 12).toFixed(1),
        suggestMore, maxKWp
      }
    });

    setLoading(false);
  };

  // Re-run charts when analysis changes
  useEffect(() => {
    const a = G.analysis;
    if (!a) return;

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const DAYS_CHART = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    // Chart 1: Loss Stack
    if (chartRefs.loss.current) {
      if (chartInstances.current.loss) chartInstances.current.loss.destroy();
      const sysKW = parseFloat(a.sysKW) || 1;
      const Yf = a.monthly.map((m, i) => {
        const val = +m.kwh / (sysKW * DAYS_CHART[i]);
        return isFinite(val) ? +val.toFixed(3) : 0;
      });
      const Ltemp = a.monthly.map(m => {
        const val = +m.tLoss / 100 * sysKW / 12;
        return isFinite(val) ? +val.toFixed(3) : 0;
      });
      const Lsoil = a.monthly.map(m => {
        const val = +m.soilLoss / 100 * sysKW / 12;
        return isFinite(val) ? +val.toFixed(3) : 0;
      });
      const avgYfVal = Yf.reduce((a, b) => a + b, 0) / 12;
      const avgYf = isFinite(avgYfVal) ? avgYfVal.toFixed(2) : "0.00";

      chartInstances.current.loss = new Chart(chartRefs.loss.current.getContext('2d'), {
        type: 'bar',
        data: {
          labels: MONTHS,
          datasets: [
            { label: 'Temp Loss (NOCT)', data: Ltemp, backgroundColor: 'rgba(220,80,40,.8)', stack: 's' },
            { label: 'Soiling Loss', data: Lsoil, backgroundColor: 'rgba(180,140,40,.8)', stack: 's' },
            { label: 'Yf: Yield Energy', data: Yf, backgroundColor: 'rgba(27,111,168,.85)', stack: 's' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { color: 'rgba(255,255,255,.7)', font: { size: 9 }, boxWidth: 10 } },
            title: { display: true, text: `Physics Yield Stack · Avg: ${avgYf} kWh/kWp/day`, color: '#fff', font: { size: 10 } }
          },
          scales: {
            x: { stacked: true, ticks: { color: 'rgba(255,255,255,.5)', font: { size: 8 } }, grid: { color: 'rgba(255,255,255,.04)' } },
            y: { stacked: true, ticks: { color: 'rgba(255,255,255,.5)', font: { size: 8 } }, grid: { color: 'rgba(255,255,255,.06)' } }
          }
        }
      });
    }

    // Chart 2: 5-Year Financial
    if (chartRefs.finance.current) {
      if (chartInstances.current.finance) chartInstances.current.finance.destroy();
      const yrs5 = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'];
      let cum5 = 0;
      const SAV5 = [], KWH5 = [], CUM5 = [];
      const tariff = a.tariff || 8.5;

      for (let y = 1; y <= 5; y++) {
        const kwh5 = Math.round(PHYSICS.degradedEnergy(a.totalKWh, y));
        const sav5 = Math.round(kwh5 * tariff);
        cum5 += sav5;
        SAV5.push(sav5);
        KWH5.push(kwh5);
        CUM5.push(cum5);
      }
      const NET5 = Array(5).fill(Math.round(a.netCapex));

      chartInstances.current.finance = new Chart(chartRefs.finance.current.getContext('2d'), {
        type: 'bar',
        data: {
          labels: yrs5,
          datasets: [
            { label: 'Annual Savings (Rs.)', data: SAV5, backgroundColor: 'rgba(26,158,91,.75)', yAxisID: 'y', order: 2 },
            { label: 'Generation (kWh)', data: KWH5, backgroundColor: 'rgba(27,111,168,.5)', yAxisID: 'y2', order: 3 },
            { label: 'Cumulative Savings', data: CUM5, type: 'line', borderColor: '#22C55E', backgroundColor: 'transparent', borderWidth: 2.5, pointRadius: 4, yAxisID: 'y', order: 1 },
            { label: 'Net Investment', data: NET5, type: 'line', borderColor: '#DC2626', borderWidth: 2, borderDash: [6, 4], backgroundColor: 'transparent', pointRadius: 0, yAxisID: 'y', order: 1 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: 'rgba(255,255,255,.65)', font: { size: 9 }, boxWidth: 10 } },
            title: { display: true, text: `5-Year ROI · Net Invest: Rs.${Math.round(a.netCapex).toLocaleString('en-IN')}`, color: '#fff', font: { size: 10 } }
          },
          scales: {
            x: { ticks: { color: 'rgba(255,255,255,.5)', font: { size: 8 } }, grid: { color: 'rgba(255,255,255,.04)' } },
            y: { position: 'left', ticks: { color: '#22C55E', font: { size: 8 }, callback: v => 'Rs.' + Math.round(v / 1000) + 'K' }, grid: { color: 'rgba(26,158,91,.08)' } },
            y2: { position: 'right', ticks: { color: '#60A5FA', font: { size: 8 } }, grid: { drawOnChartArea: false } }
          }
        }
      });
    }

    // Chart 3: Monthly GHI
    if (chartRefs.ghi.current) {
      if (chartInstances.current.ghi) chartInstances.current.ghi.destroy();
      const ghiArr = G.nasaData?.ghi || getGHI(G.lat);

      chartInstances.current.ghi = new Chart(chartRefs.ghi.current.getContext('2d'), {
        type: 'bar',
        data: {
          labels: MONTHS,
          datasets: [{
            label: `GHI kWh/m²/day (${a.dataSource === 'NASA POWER API' ? 'NASA' : 'Offline'})`,
            data: ghiArr,
            backgroundColor: MONTHS.map((_, i) => `hsl(${30 + i * 12}, 80%, 55%)`),
            borderColor: 'rgba(255,255,255,.1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: 'rgba(255,255,255,.7)', font: { size: 9 }, boxWidth: 10 } },
            title: { display: true, text: `Solar Radiation (Annual Avg: ${a.annGHI})`, color: '#fff', font: { size: 10 } }
          },
          scales: {
            x: { ticks: { color: 'rgba(255,255,255,.5)', font: { size: 8 } }, grid: { color: 'rgba(255,255,255,.04)' } },
            y: { ticks: { color: 'rgba(255,255,255,.5)', font: { size: 8 } }, grid: { color: 'rgba(255,255,255,.06)' } }
          }
        }
      });
    }

    // Chart 4: Dynamic PR
    if (chartRefs.pr.current) {
      if (chartInstances.current.pr) chartInstances.current.pr.destroy();

      chartInstances.current.pr = new Chart(chartRefs.pr.current.getContext('2d'), {
        type: 'line',
        data: {
          labels: MONTHS,
          datasets: [
            { label: 'PR (%) — physics-based', data: a.monthly.map(m => +m.pr), borderColor: '#38BDF8', backgroundColor: 'rgba(56,189,248,.15)', borderWidth: 2.5, fill: true, tension: 0.4, pointBackgroundColor: '#38BDF8', pointRadius: 3 },
            { label: 'Target 75%', data: Array(12).fill(75), borderColor: 'rgba(245,158,11,.6)', borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0, fill: false }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: 'rgba(255,255,255,.7)', font: { size: 9 }, boxWidth: 10 } },
            title: { display: true, text: `Monthly PR (Annual Avg: ${a.avgPR}%)`, color: '#fff', font: { size: 10 } }
          },
          scales: {
            x: { ticks: { color: 'rgba(255,255,255,.5)', font: { size: 8 } }, grid: { color: 'rgba(255,255,255,.04)' } },
            y: { min: 55, max: 100, ticks: { color: 'rgba(255,255,255,.5)', font: { size: 8 } }, grid: { color: 'rgba(255,255,255,.06)' } }
          }
        }
      });
    }

    return () => {
      Object.keys(chartInstances.current).forEach(k => {
        if (chartInstances.current[k]) {
          chartInstances.current[k].destroy();
          chartInstances.current[k] = null;
        }
      });
    };
  }, [G.analysis]);

  const f = v => Math.round(Number(v)).toLocaleString('en-IN');
  const a = G.analysis;

  const handleConfirmAnalysis = () => {
    const tag = document.getElementById("t6");
    if (tag) {
      tag.textContent = "✅ Done";
      tag.classList.add("done");
    }
    document.getElementById("s-pdf")?.scrollIntoView({ behavior: 'smooth' });
  };

  const calc5YrCum = () => {
    if (!a) return [];
    let cum = 0;
    const res = [];
    const tariff = a.tariff || 8.5;
    for (let y = 1; y <= 5; y++) {
      const kwh5 = Math.round(PHYSICS.degradedEnergy(a.totalKWh, y));
      const sav5 = Math.round(kwh5 * tariff);
      cum += sav5;
      res.push(cum);
    }
    return res;
  };
  const cumValues = calc5YrCum();

  return (
    <div>
      <NavBar progress={90} />
      <section className="sw dark-sw" id="s6">
        <div className="shdr light">
          <span className="sno">07</span>
          <div>
            <h2>Advanced Solar Analysis</h2>
            <p>NASA POWER weather API data (GHI, temp) lookup, shading derate factors, monthly savings, and payback period calculation.</p>
          </div>
          <span className="stag light" id="t6">⏳</span>
        </div>

        {/* ✅ Fixed: status bar always shows statusMsg, analysis UI is outside it */}
        <div
          className="status-bar-container"
          style={{ margin: '0.8rem 0', background: 'rgba(255,255,255,.04)', border: '1px dashed rgba(255,255,255,.15)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', color: '#6EE7B7' }}
          id="nasa-status-bar"
        >
          {statusMsg}
        </div>

        {/* ✅ Fixed: conditional is outside the status bar div */}
        {a ? (
          <>
            <div className="an-grid">
              {/* Card 1: Solar Resource */}
              <div className="anc">
                <div className="ant">☀️ Solar Resource</div>
                <div id="an-res">
                  <div className="akpi"><span>Data Source</span><b>{a.dataSource}</b></div>
                  <div className="akpi"><span>Annual GHI (NASA)</span><b>{a.annGHI} kWh/m²/day</b></div>
                  <div className="akpi"><span>Avg Ambient Temp</span><b>{a.annTemp} °C</b></div>
                  <div className="akpi"><span>Gross DC kWp</span><b>{(a.grossKW || 0).toFixed(2)} kWp</b></div>
                  <div className="akpi"><span>✅ AC kWp (derating)</span><b>{(a.acKW_derated || 0).toFixed(2)} kWp ({a.totalLossPct}% losses)</b></div>
                  <div className="akpi"><span>✅ Correct Tilt β</span><b>{a.useTilt}° (0.76 × {Math.abs(G.lat || 22.5726).toFixed(1)}°)</b></div>
                  <div className="akpi"><span>✅ Opt Row Spacing</span><b>{a.optRowSpacingFt} ft (min 3.5 ft)</b></div>
                  <div className="akpi"><span>Avg Sun Hrs/Day</span><b>{a.avgDailySunHrs} hrs</b></div>
                  <div className="akpi"><span>Annual Generation</span><b>{f(a.totalKWh)} kWh</b></div>
                  <div className="akpi"><span>CO₂ Offset/yr</span><b>{a.co2} T</b></div>
                </div>
              </div>

              {/* Card 2: Loss Stack */}
              <div className="anc">
                <div className="ant">⚡ Loss Stack (NOCT + Soiling)</div>
                <div className="chart-fixed-wrap">
                  <canvas ref={chartRefs.loss}></canvas>
                </div>
              </div>

              {/* Card 3: Performance Metrics */}
              <div className="anc">
                <div className="ant">📊 Performance Metrics</div>
                <div id="an-prf">
                  <div className="akpi"><span>✅ PR (physics)</span><b>{a.avgPR}% — {parseFloat(a.avgPR) >= 75 ? 'Excellent' : parseFloat(a.avgPR) >= 70 ? 'Average' : 'Low'}</b></div>
                  <div className="akpi"><span>✅ CUF</span><b>{a.cuf}% — {parseFloat(a.cuf) >= 17 ? 'Good' : parseFloat(a.cuf) >= 14 ? 'Average' : 'Low'}</b></div>
                  <div className="akpi"><span>Specific Yield</span><b>{a.spY} kWh/kWp/yr</b></div>
                  <div className="akpi"><span>✅ DC/AC Ratio</span><b>{a.dcAcRatio} (ideal 0.8–1.2)</b></div>
                  {/* ✅ Fixed: using a.invMaxVdc stored in analysis, no longer relies on out-of-scope inv */}
                  <div className="akpi"><span>✅ String Voc</span><b>{a.stringVoc}V — {a.actualPerStr} panels/str (max {a.invMaxVdc || 600}V)</b></div>
                  <div className="akpi"><span>✅ Payback</span><b>{a.payback} yrs</b></div>
                  <div className="akpi"><span>25-yr NPV</span><b>Rs.{f(a.npv)}</b></div>
                  <div className="akpi"><span>LCOE</span><b>Rs.{a.lcoe}/kWh</b></div>
                  <div className="akpi"><span>Panel Area / Roof</span><b>{a.panelAreaSqFt} / {G.siteArea} sq.ft ({a.utilizationPct}%)</b></div>
                  {a.suggestMore && (
                    <div className="akpi" style={{ background: 'rgba(245,158,11,.15)', color: '#FBBF24', border: '1px solid rgba(245,158,11,.3)', marginTop: '8px' }}>
                      <span>⚡ Suggestion</span>
                      <b style={{ color: '#FBBF24' }}>Roof can fit {a.maxKWp} kWp — consider larger system for better ROI</b>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 4: 5-Year Financial */}
              <div className="anc">
                <div className="ant">💰 5-Year Financial</div>
                <div className="chart-fixed-wrap">
                  <canvas ref={chartRefs.finance}></canvas>
                </div>
                <div className="five-yr-note" id="five-yr-note">
                  {['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'].map((y, idx) => (
                    <div key={idx} className="fyn-item">
                      <b>Rs. {f(cumValues[idx])}</b>
                      <span>{y}<br />cum.</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 5: Monthly GHI */}
              <div className="anc">
                <div className="ant">🌤 Monthly GHI</div>
                <div className="chart-fixed-wrap">
                  <canvas ref={chartRefs.ghi}></canvas>
                </div>
              </div>

              {/* Card 6: Dynamic PR (%) */}
              <div className="anc">
                <div className="ant">📉 Dynamic PR (%)</div>
                <div className="chart-fixed-wrap">
                  <canvas ref={chartRefs.pr}></canvas>
                </div>
              </div>
            </div>

            {/* Monthly Breakdown Table */}
            <div className="an-tbl-wrap" style={{ marginTop: '1.2rem' }}>
              <div className="ant" style={{ padding: '.8rem 1.2rem', marginBottom: 0 }}>📅 Monthly Breakdown</div>
              <table id="mtbl">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>GHI</th>
                    <th>Yield(kWh)</th>
                    <th>PR%</th>
                    <th>Tcell°C</th>
                    <th>TempLoss</th>
                    <th>Soiling</th>
                    <th>Shade</th>
                    <th>Net kWh</th>
                  </tr>
                </thead>
                <tbody id="mtbody">
                  {a.monthly.map((m, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'left', fontWeight: 'bold', color: '#fff' }}>{m.mo}</td>
                      <td>{m.ghi}</td>
                      <td>{f(m.kwh)}</td>
                      <td>{m.pr}</td>
                      <td>{m.tcell}°C</td>
                      <td>{m.tLoss}%</td>
                      <td>{m.soilLoss}%</td>
                      <td>{m.shLoss}%</td>
                      <td style={{ color: '#4ADE80', fontWeight: 'bold' }}>{f(m.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button className="btn-or w100 mt1" onClick={handleConfirmAnalysis}>
              ✅ Confirm Analysis → Generate Report PDF
            </button>
          </>
        ) : (
          <button className="btn-or w100 mt1" onClick={runAnalysis} disabled={loading}>
            {loading ? '⚡ Running Calculations...' : '▶ Fetch Weather & Run Physics Engine'}
          </button>
        )}
      </section>
    </div>
  );
};

export default AnalysisPage;
