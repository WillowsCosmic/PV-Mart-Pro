

import { useState } from 'react';
import NavBar from '../../components/common/NavBar';
import { useSolarStore } from '../../solar3d/useSolarStore';
import { getGHI, PHYSICS } from '../../services/solarPhysics';
import { jsPDF } from 'jspdf';

const ReportGeneratorPage = () => {
  const G = useSolarStore((s) => s.G);
  const f = (v) => Math.round(Number(v || 0)).toLocaleString('en-IN');
  const [generating, setGenerating] = useState(false);

  const generatePDF = () => {
    const a = G.analysis;
    const p = G.panel;
    const inv = G.inverter;
    const bat = G.battery;

    if (!a || !p) {
      alert('Please run Step 7 (Advanced Solar Analysis) first.');
      return;
    }

    setGenerating(true);

    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const rdate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      const rno = `PVM-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`;
      const TOT = 8; // 8 pages: Cover, Specs, Charts, Advanced+Shadow, Iso+Cumulative, Panel Layout, Performance, Financial

      // Safe text helper
      function safeText(doc, str, x, y, maxW, align = 'left') {
        if (str === null || str === undefined) str = '—';
        str = String(str);
        const lines = doc.splitTextToSize(str, maxW);
        doc.text(lines[0] || '', x, y, { align });
      }

      function hdr(pg) {
        doc.setFillColor(26, 31, 46);
        doc.rect(0, 0, 210, 12, 'F');
        doc.setFillColor(232, 119, 34);
        doc.rect(0, 12, 210, 1.8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text('PVMart Pro — AI Solar Design Report', 10, 8.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(`${rno}  ·  Page ${pg}/${TOT}`, 200, 8.5, { align: 'right' });
      }

      function ftr() {
        doc.setFillColor(232, 119, 34);
        doc.rect(0, 283, 210, 1.5, 'F');
        doc.setFillColor(26, 31, 46);
        doc.rect(0, 284.5, 210, 12.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text('www.pvmart.co.in  |  Where Clean Energy Meets Smart Technology', 105, 291, { align: 'center' });
      }

      function tbl(x, y, cw, rows, opts = {}) {
        const rH = opts.rH || 7.5;
        let cy = y;
        function normAl(a) {
          if (!a || a === 'l' || a === 'left') return 'left';
          if (a === 'c' || a === 'center') return 'center';
          if (a === 'r' || a === 'right') return 'right';
          return 'left';
        }
        rows.forEach((row, ri) => {
          const bg = ri === 0 ? [26, 31, 46] : ri % 2 === 0 ? [255, 255, 255] : [254, 240, 208];
          const tw = cw.reduce((a, b) => a + b, 0);
          doc.setFillColor(...bg);
          doc.rect(x, cy, tw, rH, 'F');
          doc.setDrawColor(220, 210, 195);
          doc.setLineWidth(0.2);
          doc.rect(x, cy, tw, rH, 'S');
          let cx2 = x;
          row.forEach((cell, ci) => {
            const w = Math.max(cw[ci] || 8, 4);
            const cellStr = String(cell ?? '—');
            const maxW = Math.max(2, w - 4);
            const al = normAl(opts.al?.[ci]);
            const tx = al === 'center' ? cx2 + w / 2 : al === 'right' ? cx2 + w - 2 : cx2 + 2;
            doc.setFont('helvetica', ri === 0 ? 'bold' : 'normal');
            doc.setFontSize(ri === 0 ? 7 : 7.5);
            doc.setTextColor(...(ri === 0 ? [255, 255, 255] : (opts.cc?.[ci] || [26, 31, 46])));
            const lines = doc.splitTextToSize(cellStr, maxW);
            doc.text(lines[0] || '', tx, cy + rH * 0.65, { align: al });
            doc.setDrawColor(220, 210, 195);
            doc.setLineWidth(0.15);
            doc.line(cx2 + w, cy, cx2 + w, cy + rH);
            cx2 += w;
          });
          cy += rH;
        });
        return cy;
      }

      const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      function bar(x, y, w, h, labels, values, title) {
        doc.setFillColor(254, 240, 208);
        doc.roundedRect(x, y, w, h, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(26, 31, 46);
        doc.text(doc.splitTextToSize(title, w - 4)[0], x + w / 2, y + 6, { align: 'center' });
        const bX = x + 10, bY = y + 9, bW = w - 20, bH = h - 16;
        const maxV = Math.max(...values) * 1.12 || 1;
        const bw = (bW / labels.length) * 0.65, gap = bW / labels.length;
        for (let i = 0; i <= 3; i++) {
          const gy = bY + bH - (i / 3) * bH;
          doc.setDrawColor(200, 190, 180);
          doc.setLineWidth(0.15);
          doc.line(bX, gy, bX + bW, gy);
        }
        values.forEach((v, i) => {
          const bx = bX + i * gap + (gap - bw) / 2, bh2 = (v / maxV) * bH, by = bY + bH - bh2;
          const isMax = v === Math.max(...values);
          doc.setFillColor(...(isMax ? [232, 119, 34] : [27, 111, 168]));
          doc.rect(bx, by, bw, bh2, 'F');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.setTextColor(92, 100, 128);
          doc.text(labels[i], bx + bw / 2, bY + bH + 4.5, { align: 'center' });
        });
        doc.setDrawColor(26, 31, 46);
        doc.setLineWidth(0.4);
        doc.line(bX, bY, bX, bY + bH);
        doc.line(bX, bY + bH, bX + bW, bY + bH);
      }

      function hbar(x, y, w, h, label, value, maxVal, color) {
        const bw = Math.max(0, (value / Math.max(maxVal, 1)) * (w - 35));
        doc.setFillColor(245, 240, 230);
        doc.rect(x, y, w, h, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(92, 100, 128);
        doc.text(label, x + 2, y + h * 0.7);
        doc.setFillColor(...color);
        doc.rect(x + 35, y + 1, bw, h - 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(...color);
        doc.text(String(value) + '%', x + 35 + bw + 1.5, y + h * 0.7);
      }

      // ── P1: COVER ──
      doc.setFillColor(254, 247, 230);
      doc.rect(0, 0, 210, 297, 'F');
      hdr(1);
      ftr();
      doc.setFillColor(232, 119, 34);
      doc.circle(105, 52, 20, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text('PV', 92, 50);
      doc.setTextColor(27, 111, 168);
      doc.text('MART', 104, 50);
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text('PRO', 105, 58, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(19);
      doc.setTextColor(26, 31, 46);
      doc.text('SOLAR SITE INTELLIGENCE REPORT', 105, 82, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(92, 100, 128);
      doc.text('AI-Powered · PVsyst-Level · PVMart Pro Platform', 105, 90, { align: 'center' });
      doc.setFillColor(232, 119, 34);
      doc.rect(15, 94, 180, 1.5, 'F');

      const si = [
        ['LOCATION', `${G.city} · ${G.lat.toFixed(4)}°N, ${G.lng.toFixed(4)}°E`],
        ['SYSTEM (DC)', `${a.n} Panels × ${p.watt}W · Gross ${a.grossKW || a.sysKW}kWp DC · Tilt ${G.tilt}°`],
        ['SYSTEM (AC)', `Net AC capacity = 80% × ${a.grossKW || a.sysKW}kWp = ${a.sysKW}kWp (derate factor)`],
        ['TILT FORMULA', `β = 0.76×|φ| = 0.76×${Math.abs(G.lat).toFixed(2)}° = ${G.optTilt}° → used ${G.tilt}°`],
        ['SITE DIMS', `W:${G.roofW}ft × D:${G.roofD}ft × Parapet:${G.parapetH}ft · Area:${G.siteArea}sq.ft`],
        ['SUN TIMING', `Avg ${a.avgDailySunHrs || a.pkH} hrs/day peak sun · Opt row spacing: ${a.optRowSpacingFt || '—'}ft`],
        ['INVERTER', inv ? `${inv.brand} ${inv.model} · ${inv.kw}kW · ${inv.mppt}` : 'Not selected'],
        ['BATTERY', bat ? `${bat.brand} ${bat.model} · ${bat.kwh}kWh · ${bat.type}` : 'Not included'],
        ['DATE / REPORT', `${rdate} · ${rno}`]
      ];

      let sy = 97;
      si.forEach(([k, v]) => {
        doc.setFillColor(253, 240, 208);
        doc.rect(15, sy, 36, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(232, 119, 34);
        doc.text(k, 17, sy + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(26, 31, 46);
        const vLines = doc.splitTextToSize(String(v).substring(0, 120), 138);
        doc.text(vLines[0] || '', 53, sy + 5);
        doc.setDrawColor(220, 210, 195);
        doc.setLineWidth(0.2);
        doc.rect(15, sy, 180, 7, 'S');
        sy += 7;
      });

      // 3D image (if captured)
      if (G._3dImageData) {
        try {
          doc.addImage(G._3dImageData, 'JPEG', 15, sy + 2, 180, 62);
          doc.setDrawColor(220, 210, 195);
          doc.setLineWidth(0.4);
          doc.rect(15, sy + 2, 180, 62, 'S');
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(6.5);
          doc.setTextColor(92, 100, 128);
          doc.text('3D Solar Layout Preview', 105, sy + 67, { align: 'center' });
          sy += 70;
        } catch (imgErr) {
          console.warn('PDF image embed failed', imgErr);
          sy += 4;
        }
      } else {
        sy += 4;
      }

      const kpis = [
        [f(a.n), 'Panels'],
        [a.sysKW + ' kWp', 'Net AC kWp'],
        [f(a.totalKWh), 'kWh/yr'],
        ['Rs.' + f(a.annSav), 'Savings/yr'],
        [a.payback + ' yrs', 'Payback'],
        [a.co2 + ' T', 'CO₂/yr']
      ];
      kpis.forEach(([v, l], i) => {
        const kx = 15 + i * 30.5;
        const ky = Math.min(sy + 2, 255);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(kx, ky, 29, 18, 2, 2, 'F');
        doc.setDrawColor(253, 240, 208);
        doc.setLineWidth(0.4);
        doc.roundedRect(kx, ky, 29, 18, 2, 2, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(232, 119, 34);
        doc.text(doc.splitTextToSize(v, 25)[0] || v, kx + 14.5, ky + 9, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(92, 100, 128);
        doc.text(l, kx + 14.5, ky + 15, { align: 'center' });
      });

      // ── P2: OBSTACLES + SPECS ──
      doc.addPage();
      hdr(2);
      ftr();
      const obsList = G.obstacles || [];
      doc.setFillColor(250, 246, 238);
      doc.rect(0, 14, 210, 269, 'F');
      doc.setFillColor(26, 31, 46);
      doc.rect(15, 18, 180, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('01 — OBSTACLE ANALYSIS & SHADING (β=0.76×|φ|)', 20, 23.5);

      const obH = ['#', 'Name', 'H(ft)', 'W', 'D', 'Dist', 'Dir', 'Rot°', 'Shade°', 'Loss%', 'Status'];
      const obR = [
        obH,
        ...(obsList.length ? obsList.map((o, i) => {
          const sd = G.shadingData?.[i];
          const dirStr = (o.dirLabel || 'N') + '(' + o.dir + '°)';
          const nameStr = String(o.name || '').substring(0, 10);
          return [i + 1, nameStr, o.h, o.w, o.d, o.dist, dirStr, o.rotation || 0, sd?.shadeAngle || '—', sd?.shadeLoss || '0', sd?.isCritical ? '⚠ Crit' : '✅ OK'];
        }) : [['—', 'No obstacles', '—', '—', '—', '—', '—', '—', '—', '0', '✅ Clear']])
      ];

      let ny = tbl(15, 29, [8, 30, 14, 10, 10, 15, 20, 12, 16, 14, 21], obR, {
        rH: 7,
        al: { 0: 'center', 2: 'center', 7: 'center', 8: 'center', 9: 'center', 10: 'center' }
      });
      ny += 4;

      doc.setFillColor(26, 31, 46);
      doc.rect(15, ny, 180, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('02 — SITE & PANEL SPECIFICATIONS', 20, ny + 5.5);
      ny += 10;

      const specL = [
        ['SITE', ''],
        ['Roof W×D', `${G.roofW}×${G.roofD} ft`],
        ['Total Area', G.siteArea + ' sq.ft'],
        ['Usable Area', Math.round(G.siteArea * 0.7) + ' sq.ft'],
        ['Parapet H', G.parapetH + ' ft'],
        ['Tilt β', G.tilt + '° (formula: 0.76×|lat|)'],
        ['Azimuth', '180° South-facing'],
        ['Lat/Lng', `${G.lat.toFixed(4)}°N`]
      ];
      const specR = [
        ['PANEL', ''],
        ['Brand', p.brand],
        ['Model', p.model],
        ['Wattage', p.watt + 'W'],
        ['Efficiency', (p.eff * 100).toFixed(1) + '%'],
        ['Technology', p.tech],
        ['Area/panel', p.sqft + ' sq.ft'],
        ['Voc/Vmp', p.voc + 'V/' + p.vmp + 'V']
      ];

      let lY = ny, rY = ny;
      [specL, specR].forEach((rows, col) => {
        const bX = col === 0 ? 15 : 107;
        let cy2 = ny;
        rows.forEach((row, i) => {
          const bg = i === 0 ? [26, 31, 46] : i % 2 === 0 ? [255, 255, 255] : [254, 240, 208];
          doc.setFillColor(...bg);
          doc.rect(bX, cy2, 90, 7.2, 'F');
          if (i > 0) {
            doc.setFillColor(253, 240, 208);
            doc.rect(bX, cy2, 30, 7.2, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(232, 119, 34);
            doc.text(doc.splitTextToSize(String(row[0] || ''), 27)[0], bX + 2, cy2 + 5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(26, 31, 46);
            doc.text(doc.splitTextToSize(String(row[1] || ''), 55)[0], bX + 32, cy2 + 5);
          } else {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(255, 255, 255);
            doc.text(col === 0 ? 'SITE DETAILS' : 'PANEL DETAILS', bX + 3, cy2 + 5);
          }
          doc.setDrawColor(220, 210, 195);
          doc.setLineWidth(0.2);
          doc.rect(bX, cy2, 90, 7.2, 'S');
          cy2 += 7.2;
        });
        if (col === 0) lY = cy2;
        else rY = cy2;
      });

      ny = Math.max(lY, rY) + 3;
      tbl(15, ny, [45, 45, 45, 45], [
        ['INVERTER', 'BATTERY', 'SYSTEM TYPE', 'BOARD / DISCOM'],
        [inv ? doc.splitTextToSize(`${inv.brand} ${inv.model}`, 42)[0] : ' Not set',
         bat ? doc.splitTextToSize(`${bat.brand} ${bat.model}`, 42)[0] : 'None (On-Grid)',
         (G.gridType || 'on-grid').toUpperCase(),
         G.boardName || 'Not selected'],
        [inv ? `${inv.kw}kW · ${inv.mppt}` : '—', bat ? `${bat.kwh}kWh · ${bat.type}` : '—',
         G.gridType === 'on-grid' ? 'Net Metering' : 'Battery Backup',
         G.boardTariff ? `Rs.${G.boardTariff}/kWh` : 'Rs.7.50/kWh']
      ], { rH: 7 });

      // P3: CHARTS
      doc.addPage();
      hdr(3);
      ftr();
      doc.setFillColor(250, 246, 238);
      doc.rect(0, 14, 210, 269, 'F');
      doc.setFillColor(26, 31, 46);
      doc.rect(15, 18, 180, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(`03 - MONTHLY AC ENERGY FLOW & SAVINGS`, 20, 23.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(232, 119, 34);
      doc.text('MONTHLY BREAKDOWN', 15, 88);

      const mH = ['Month', 'GHI', 'Yield(kWh)', 'PR(%)', 'Temp', 'Shade', 'Net'];
      tbl(15, 91, [18, 22, 26, 16, 20, 20, 28], [
        mH,
        ...a.monthly.map(m => [m.mo, m.ghi, f(+m.kwh), m.pr, m.tLoss + '%', m.shLoss + '%', f(+m.net)])
      ], {
        rH: 6.5,
        cc: { 2: [27, 111, 168], 6: [26, 158, 91] },
        al: { 1: 'right', 2: 'right', 3: 'center', 4: 'center', 5: 'center', 6: 'right' }
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(232, 119, 34);
      doc.text('PERFORMANCE SCORES', 15, 186);

      const scores = [
        ['Land Usability', Math.round((G.siteArea * 0.7) / G.siteArea * 100), [26, 158, 91]],
        ['Shade Impact', Math.round(100 - (G.shadingData || []).reduce((s, r) => s + parseFloat(r.shadeLoss || 0), 0)), [232, 119, 34]],
        ['Tilt Optimality', Math.round(100 - Math.abs(G.tilt - G.optTilt) * 2), [27, 111, 168]],
        ['PR Score', Math.round(+a.avgPR), [26, 158, 91]],
        ['CUF Score', Math.round(+a.cuf), [27, 111, 168]],
        ['Financial Health', Math.round(Math.max(55, 100 - (+a.payback * 5))), [26, 158, 91]]
      ];
      scores.forEach(([lbl, v, c], idx) => {
        hbar(15 + (idx < 3 ? 0 : 90), 189 + ((idx % 3) * 9.5), 85, 8, lbl, Math.min(100, Math.max(0, v)), 100, c);
      });

      // ── P4: ADVANCED GRAPHS ──
      doc.addPage();
      hdr(4);
      ftr();
      doc.setFillColor(250, 246, 238);
      doc.rect(0, 14, 210, 269, 'F');
      doc.setFillColor(26, 31, 46);
      doc.rect(15, 18, 180, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('04 - ADVANCED ANALYSIS & SHADOW DIAGRAM', 20, 23.5);

      const ghiVals = getGHI(Number(G.lat || 0));
      bar(15, 29, 88, 50, MONTHS, ghiVals, 'GHI Irradiance (kWh/m²/day)');
      bar(107, 29, 88, 50, MONTHS, a.monthly.map(m => +m.pr), 'Monthly Performance Ratio (%)');

      // ── SHADOW / OBSTACLE DIAGRAM ─────────────────────────────
      const sdY = 85;
      doc.setFillColor(26, 31, 46);
      doc.rect(15, sdY, 180, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text('OBSTACLE SHADOW MAP', 18, sdY + 5.5);

      const sdCanvas = document.getElementById('d-shadow');
      let shadowEmbedded = false;
      if (sdCanvas) {
        try {
          const sdImg = sdCanvas.toDataURL('image/jpeg', 0.88);
          doc.setFillColor(26, 34, 54);
          doc.rect(15, sdY + 9, 86, 72, 'F');
          doc.addImage(sdImg, 'JPEG', 15, sdY + 9, 86, 72);
          doc.setDrawColor(100, 120, 160);
          doc.setLineWidth(0.4);
          doc.rect(15, sdY + 9, 86, 72, 'S');
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(6);
          doc.setTextColor(92, 100, 128);
          doc.text('Polar obstacle shadow map', 58, sdY + 84, { align: 'center' });
          shadowEmbedded = true;
        } catch (e) {
          console.warn('Shadow map embed failed', e);
        }
      }

      const obsTblX = shadowEmbedded ? 105 : 15;
      const obsTblW = shadowEmbedded ? 90 : 180;
      const obsListP4 = G.obstacles || [];
      if (obsListP4.length > 0) {
        tbl(obsTblX, sdY + 9, [obsTblW > 90 ? 18 : 10, obsTblW > 90 ? 22 : 28, 12, 10, 10, 10, shadowEmbedded ? 8 : 12], [
          ['#', 'Name', 'H', 'SA deg', 'Dist', 'Loss', 'Status'],
          ...obsListP4.slice(0, 8).map((o, idx) => {
            const sd = G.shadingData?.[idx];
            return [idx + 1, String(o.name || '').substring(0, 10), o.h + 'ft', sd?.shadeAngle || '-', o.dist + 'ft', (sd?.shadeLoss || '0') + '%', sd?.isCritical ? '[!] Crit' : '[OK]'];
          })
        ], { rH: 7, al: { 0: 'center', 2: 'center', 3: 'center', 4: 'center', 5: 'center', 6: 'center' } });
      } else {
        doc.setFillColor(237, 253, 243);
        doc.roundedRect(obsTblX, sdY + 9, obsTblW, 20, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(26, 158, 91);
        doc.text('No Obstacles - Clear Roof', obsTblX + obsTblW / 2, sdY + 21, { align: 'center' });
      }

      // ── LOSS BREAKDOWN ────────────────────────────────────────
      const lossY = sdY + 88;
      doc.setFillColor(26, 31, 46);
      doc.rect(15, lossY, 180, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text('ENERGY LOSS BREAKDOWN', 18, lossY + 5.5);
      const lossItems = [
        ['Temperature Loss', '4.0%', [220, 38, 38]],
        ['Shading Loss', a.monthly?.[5]?.shLoss ?? 0 + '%', [232, 119, 34]],
        ['Wiring / System Loss', '1.5%', [245, 158, 11]],
        ['Inverter Loss', ((1 - (G.inverter?.eff || 0.97)) * 100).toFixed(1) + '%', [27, 111, 168]],
        ['Battery Loss', G.battery ? ((1 - G.battery.eff) * 100).toFixed(1) + '%' : '0% (On-Grid)', [92, 100, 128]],
        ['Derate Factor (DC→AC)', '20.0%', [100, 80, 160]],
      ];
      lossItems.forEach(([lbl, val, c], idx) => {
        const lx = 15 + (idx < 3 ? 0 : 90), ly = lossY + 10 + (idx % 3) * 9;
        const pct = parseFloat(val) || 0;
        doc.setFillColor(245, 240, 230);
        doc.rect(lx, ly, 85, 7.5, 'F');
        doc.setFillColor(...c);
        doc.rect(lx, ly, Math.min(85, pct * 4), 7.5, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(26, 31, 46);
        doc.text(doc.splitTextToSize(lbl, 48)[0], lx + 2, ly + 5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...c);
        doc.text(val, lx + 83, ly + 5, { align: 'right' });
      });

      // ── P5: ISO-SHADING SUN PATH + 10-YEAR CUMULATIVE ──────────
      doc.addPage();
      hdr(5);
      ftr();
      doc.setFillColor(250, 246, 238);
      doc.rect(0, 14, 210, 269, 'F');
      doc.setFillColor(26, 31, 46);
      doc.rect(15, 18, 180, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('05 - ISO-SHADING SUN PATH & 10-YEAR CUMULATIVE SAVINGS', 20, 23.5);

      // ── ISO-SHADING DIAGRAM ────────────────────────────────────
      doc.setFillColor(26, 31, 46);
      doc.rect(15, 30, 180, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text('ISO-SHADING DIAGRAM (Sun Path & Shadow Analysis)', 18, 35.5);

      const isoCanvas = document.getElementById('d-isoshade');
      let isoEmbedded = false;
      if (isoCanvas) {
        try {
          const isoImg = isoCanvas.toDataURL('image/jpeg', 0.92);
          doc.setFillColor(18, 28, 48);
          doc.rect(15, 40, 86, 72, 'F');
          doc.addImage(isoImg, 'JPEG', 15, 40, 86, 72);
          doc.setDrawColor(80, 120, 180);
          doc.setLineWidth(0.4);
          doc.rect(15, 40, 86, 72, 'S');
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(6);
          doc.setTextColor(92, 100, 128);
          doc.text('Iso-Shading / Sun Path Diagram', 58, 115, { align: 'center' });
          isoEmbedded = true;
        } catch (e) {
          console.warn('Iso-shading embed failed', e);
        }
      }

      const sunTblX = isoEmbedded ? 105 : 15;
      const sunTblW = isoEmbedded ? 90 : 180;
      const ghiV = getGHI(Number(G.lat || 0));
      const sunRows = [['Month', 'GHI', 'Sun Hrs', 'Yield(kWh)']];
      a.monthly.forEach((m, idx) => {
        sunRows.push([m.mo, ghiV[idx].toFixed(2), ghiV[idx].toFixed(2), f(+m.kwh)]);
      });
      tbl(sunTblX, 40, isoEmbedded ? [22, 20, 22, 26] : [30, 30, 32, 38], sunRows, { rH: 5.8, cc: { 3: [27, 111, 168] }, al: { 1: 'right', 2: 'right', 3: 'right' } });

      const stBoxY = isoEmbedded ? 116 : 122;
      doc.setFillColor(254, 248, 235);
      doc.roundedRect(isoEmbedded ? 105 : 15, stBoxY, isoEmbedded ? 90 : 180, 16, 2, 2, 'F');
      doc.setDrawColor(232, 119, 34);
      doc.setLineWidth(0.4);
      doc.roundedRect(isoEmbedded ? 105 : 15, stBoxY, isoEmbedded ? 90 : 180, 16, 2, 2, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(232, 119, 34);
      doc.text('Solar Timing Summary', isoEmbedded ? 150 : 105, stBoxY + 5.5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(26, 31, 46);
      doc.text(`Avg Sun Hrs/Day: ${a.avgDailySunHrs || a.pkH} hrs  |  Optimal Row Spacing: ${a.optRowSpacingFt || '—'} ft  |  Tilt: ${G.tilt}deg  |  Lat: ${Number(G.lat || 0).toFixed(2)}deg N`, isoEmbedded ? 150 : 105, stBoxY + 11.5, { align: 'center', maxWidth: isoEmbedded ? 86 : 174 });

      // ── 10-YEAR CUMULATIVE SAVINGS vs INVESTMENT ────────────────
      const cumSecY = 138;
      doc.setFillColor(26, 31, 46);
      doc.rect(15, cumSecY, 180, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text('10-YEAR CUMULATIVE SAVINGS vs INVESTMENT', 18, cumSecY + 5.5);

      doc.setFillColor(254, 248, 235);
      doc.rect(15, cumSecY + 9, 180, 80, 'F');
      doc.setDrawColor(220, 210, 195);
      doc.setLineWidth(0.3);
      doc.rect(15, cumSecY + 9, 180, 80, 'S');

      const cX = 30, cY = cumSecY + 13, cW = 155, cH = 68;
      doc.setDrawColor(26, 31, 46);
      doc.setLineWidth(0.6);
      doc.line(cX, cY, cX, cY + cH);
      doc.line(cX, cY + cH, cX + cW, cY + cH);

      let cumV = 0;
      const cumArr2 = [];
      const tariffVal = a.tariff || 8.5;
      for (let y = 1; y <= 10; y++) {
        const s = Math.round(a.totalKWh * Math.pow(0.995, y) * tariffVal);
        cumV += s;
        cumArr2.push(cumV);
      }
      const maxCumV = Math.max(cumV, a.netCapex) * 1.15 || 1;
      const xSt = cW / 10;

      for (let g = 0; g <= 4; g++) {
        const gy = cY + cH - (g / 4) * cH;
        const gv = Math.round((g / 4) * maxCumV);
        doc.setDrawColor(220, 210, 195);
        doc.setLineWidth(0.15);
        doc.line(cX, gy, cX + cW, gy);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5);
        doc.setTextColor(130, 130, 130);
        const gvStr = gv >= 100000 ? Math.round(gv / 1000) + 'K' : f(gv);
        doc.text('Rs.' + gvStr, cX - 2, gy + 1.5, { align: 'right' });
      }

      const invLineY = cY + cH - (a.netCapex / maxCumV) * cH;
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(1.0);
      doc.setLineDash([3, 2]);
      doc.line(cX, invLineY, cX + cW, invLineY);
      doc.setLineDash([]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(220, 38, 38);
      doc.text('Investment: Rs.' + f(a.netCapex), cX + 3, invLineY - 1.5);

      let prevPX = cX, prevPY = cY + cH;
      doc.setDrawColor(26, 158, 91);
      doc.setLineWidth(1.8);
      cumArr2.forEach((cv, idx) => {
        const nx = cX + (idx + 1) * xSt;
        const ny = cY + cH - (cv / maxCumV) * cH;
        doc.line(prevPX, prevPY, nx, ny);
        prevPX = nx;
        prevPY = ny;
        doc.setFillColor(26, 158, 91);
        doc.circle(nx, ny, 1.2, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(92, 100, 128);
        doc.text('Y' + (idx + 1), nx, cY + cH + 4, { align: 'center' });
        if ((idx + 1) % 2 === 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.5);
          doc.setTextColor(26, 158, 91);
          doc.text('Rs.' + Math.round(cv / 1000) + 'K', nx, ny - 2.5, { align: 'center' });
        }
      });

      const pbYr = +a.payback;
      if (pbYr > 0 && pbYr <= 10) {
        const pbX2 = cX + pbYr * xSt;
        doc.setDrawColor(232, 119, 34);
        doc.setLineWidth(1.2);
        doc.setLineDash([3, 2]);
        doc.line(pbX2, cY, pbX2, cY + cH);
        doc.setLineDash([]);
        doc.setFillColor(232, 119, 34);
        doc.roundedRect(pbX2 - 7, cY + 1, 14, 7, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(255, 255, 255);
        doc.text('Payback', pbX2, cY + 5.5, { align: 'center' });
        doc.setFontSize(5.5);
        doc.text('Yr ' + pbYr.toFixed(1), pbX2, cY + 10, { align: 'center' });
      }

      // Legend
      const legY = cY + cH + 8;
      doc.setFillColor(26, 158, 91);
      doc.rect(cX, legY, 8, 3, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(92, 100, 128);
      doc.text('Cumulative Savings', cX + 10, legY + 2.5);
      doc.setFillColor(220, 38, 38);
      doc.rect(cX + 60, legY, 8, 1.5, 'F');
      doc.text('Net Investment', cX + 70, legY + 2.5);
      doc.setFillColor(232, 119, 34);
      doc.rect(cX + 115, legY, 4, 4, 'F');
      doc.text('Payback Point', cX + 121, legY + 2.5);

      // ── P6: PANEL LAYOUT + STRING CONFIG ──
      doc.addPage();
      hdr(6);
      ftr();
      doc.setFillColor(250, 246, 238);
      doc.rect(0, 14, 210, 269, 'F');
      doc.setFillColor(26, 31, 46);
      doc.rect(15, 18, 180, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('06 - PANEL LAYOUT & STRING CONFIGURATION', 20, 23.5);

      const nn = a.n, gC = Math.min(25, Math.ceil(Math.sqrt(nn * 1.5))), gR = Math.ceil(nn / gC);
      const gpW = 172 / gC - 0.5, gpH = 80 / gR - 0.5;
      doc.setFillColor(255, 255, 255);
      doc.rect(15, 30, 180, 86, 'F');
      doc.setDrawColor(253, 240, 208);
      doc.rect(15, 30, 180, 86, 'S');

      let cnt = 0;
      for (let r = 0; r < gR && cnt < nn; r++) {
        for (let c = 0; c < gC && cnt < nn; c++) {
          const gx = 18 + c * (gpW + 0.5), gy = 32 + r * (gpH + 0.5);
          const sh = (G.shadingData || []).some(sd => sd.isCritical && ((sd.dir < 45 || sd.dir > 315) && r === 0 || (sd.dir >= 45 && sd.dir < 135) && c === gC - 1 || (sd.dir >= 135 && sd.dir < 225) && r === gR - 1 || (sd.dir >= 225 && sd.dir < 315) && c === 0));
          doc.setFillColor(...(sh ? [232, 119, 34] : [27, 111, 168]));
          doc.rect(gx, gy, gpW, gpH, 'F');
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.15);
          doc.line(gx + gpW * 0.33, gy, gx + gpW * 0.33, gy + gpH);
          doc.line(gx + gpW * 0.66, gy, gx + gpW * 0.66, gy + gpH);
          if (gpW > 5 && cnt < 50) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(3.5);
            doc.setTextColor(255, 255, 255);
            doc.text(String(cnt + 1), gx + gpW / 2, gy + gpH / 2 + 1.5, { align: 'center' });
          }
          cnt++;
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(232, 119, 34);
      doc.text(`${nn} x ${p.watt}W = ${a.sysKW} kWp | Tilt beta = ${G.tilt} deg | Mode:${(G.wiringMode || 'series').toUpperCase()} | [Active] [Shaded]`, 105, 119, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(232, 119, 34);
      doc.text('STRING CONFIG', 15, 126);
      const perStr = inv ? Math.max(
        1,
        Math.floor(((inv?.maxVdc || 1000) * 0.9) / (p?.voc || 1))
      ) : Math.ceil(nn / 3) || 1;
      const numStr = Math.ceil(nn / perStr) || 1;

      tbl(15, 129, [60, 40, 78], [
        ['Parameter', 'Value', 'Notes'],
        ['Total Panels', nn, '1 panel = ' + p.sqft + ' sq.ft'],
        ['Panels/String', perStr, 'Inv maxVdc: ' + (inv?.maxVdc || '—') + 'V'],
        ['No. of Strings', numStr, 'Parallel strings'],
        ['String Voc', (p.voc * perStr).toFixed(1) + 'V', 'Must < inv maxVdc'],
        ['Wiring Mode', (G.wiringMode || 'series').toUpperCase(), 'Series/Parallel/S+P'],
        ['System Power', a.sysKW + ' kWp', 'DC under STC'],
      ], { rH: 7.5, cc: { 1: [27, 111, 168] }, al: { 0: 'left', 1: 'center', 2: 'left' } });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(232, 119, 34);
      doc.text('PANEL COUNT REFERENCE', 15, 208);
      const refH = ['Panels', 'Area(ft2)', 'kWp', 'kWh/yr', 'Savings(Rs.)', 'Payback'];
      const refR = [refH];
      [20, 50, 100, nn, 150, 200].forEach(n2 => {
        const kw = +(n2 * p.watt / 1000).toFixed(2);
        const kwh = Math.round(kw * 4.6 * 365 * 0.80);
        const sav = Math.round(kwh * 7.5);
        const pb = +((kw * 50000 * 0.7) / Math.max(1, sav)).toFixed(1);
        refR.push([n2 === nn ? '*' + n2 : n2, n2 * p.sqft, kw, f(kwh), 'Rs.' + f(sav), pb + 'yr']);
      });
      tbl(15, 211, [22, 28, 22, 30, 36, 26], refR, { rH: 7, al: Array(6).fill('center'), cc: { 3: [27, 111, 168], 4: [26, 158, 91] } });

      // P7: PERFORMANCE + RECOMMENDATIONS
      doc.addPage();
      hdr(7);
      ftr();
      doc.setFillColor(250, 246, 238);
      doc.rect(0, 14, 210, 269, 'F');
      doc.setFillColor(26, 31, 46);
      doc.rect(15, 18, 180, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('07 - PERFORMANCE METRICS & RECOMMENDATIONS', 20, 23.5);

      tbl(15, 30, [60, 46, 72], [
        ['Metric', 'Value', 'Benchmark / Notes'],
        ['PR', a.avgPR + '%', 'Good >75%'],
        ['CUF', a.cuf + '%', 'Good >18%'],
        ['Specific Yield', a.spY + ' kWh/kWp/yr', 'India avg 1400-1600'],
        ['Avg Daily Sun Hrs', (a.avgDailySunHrs || a.pkH) + ' hrs/day', 'Calc from sunrise/sunset angles'],
        ['Annual Gen', f(a.totalKWh) + ' kWh', '-'],
        ['Gross DC kWp', (a.grossKW || a.sysKW) + ' kWp', 'Nameplate capacity'],
        ['Net AC kWp (80%)', a.sysKW + ' kWp', 'After derate: temp+wire+inverter'],
        ['Opt Row Spacing', (a.optRowSpacingFt || G.optRowSpacingFt || '-') + ' ft', 'Shadow-free at winter solstice'],
        ['Tilt beta = 0.76 x |lat|', G.tilt + ' deg (opt ' + G.optTilt + ' deg)', 'approx |lat|'],
        ['Roof Dims', `${G.roofW}ft W x ${G.roofD}ft D x ${G.parapetH}ft parapet`, 'Site boundary'],
        ['Obstacles', (G.obstacles || []).length + ' detected', (G.obstacles || []).length === 0 ? '[OK] Clear' : 'See shading analysis'],
      ], { rH: 7, cc: { 1: [27, 111, 168], 2: [92, 100, 128] }, al: { 0: 'left', 1: 'center', 2: 'left' } });

      let ry2 = 118;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(232, 119, 34);
      doc.text('RECOMMENDATIONS', 15, ry2);
      ry2 += 7;

      const recs = [
        ['[System]', `${nn} x ${p.watt}W ${p.brand} = ${a.sysKW} kWp. Tilt = ${G.tilt} deg south-facing.`],
        ['[Inverter]', inv ? `${inv.brand} ${inv.model} - ${Math.ceil(a.sysKW / inv.kw)} unit(s). ${inv.mppt}.` : 'Select inverter for string sizing.'],
        ['[Mounting]', `Hot-dip GI/aluminium at ${G.tilt} deg tilt, 180 deg azimuth. Wind compliant.`],
        ['[Wiring]', 'Mode: ' + (G.wiringMode || 'series').toUpperCase() + `. Voc: ${(p.voc * perStr).toFixed(0)}V, Strings: ${numStr}.`],
        ['[Subsidy]', '30% PM Surya Ghar subsidy available. Net cost Rs.' + f(a.netCapex) + ' after subsidy.'],
        ['[Obstacles]', (G.obstacles || []).length ? `${(G.obstacles || []).length} obstacle(s) - maintain shading clearances per analysis.` : 'No obstacles - full roof utilization.'],
        ['[Monsoon]', 'IP67 junction boxes, UV-stable cables, stainless fasteners, roof drainage.'],
        ['[Monitor]', 'Wi-Fi inverter + cloud dashboard. Alert on >5% yield deviation.'],
      ];
      recs.forEach(([t, b]) => {
        doc.setFillColor(253, 240, 208);
        doc.rect(15, ry2, 32, 11, 'F');
        doc.setFillColor(255, 255, 255);
        doc.rect(47, ry2, 148, 11, 'F');
        doc.setDrawColor(220, 210, 195);
        doc.setLineWidth(0.2);
        doc.rect(15, ry2, 180, 11, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(232, 119, 34);
        doc.text(t, 17, ry2 + 7.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(92, 100, 128);
        const lines = doc.splitTextToSize(b, 141);
        doc.text(lines[0], 49, ry2 + 4.5);
        if (lines[1]) doc.text(lines[1], 49, ry2 + 9.5);
        ry2 += 13;
      });

      // ── P8: FINANCIAL ──
      doc.addPage();
      hdr(8);
      ftr();
      doc.setFillColor(250, 246, 238);
      doc.rect(0, 14, 210, 269, 'F');
      doc.setFillColor(26, 31, 46);
      doc.rect(15, 18, 180, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('08 - FINANCIAL ANALYSIS (10-YEAR)', 20, 23.5);

      const R = 'Rs.';
      const fH = ['Year', 'Energy(kWh)', 'Savings(Rs.)', 'Cumulative(Rs.)', 'Net Position(Rs.)'];
      const fR = [fH];
      let cumFin = 0;
      const fCW = [28, 34, 38, 44, 36];
      for (let yr = 1; yr <= 10; yr++) {
        const kwh = Math.round(a.totalKWh * Math.pow(0.995, yr));
        const sav = Math.round(kwh * (a.tariff || 8.5));
        cumFin += sav;
        const net = cumFin - a.netCapex;
        fR.push([`Year ${yr}`, f(kwh), R + ' ' + f(sav), R + ' ' + f(cumFin), (net >= 0 ? '+ ' : '- ') + R + ' ' + f(Math.abs(net))]);
      }
      tbl(15, 30, fCW, fR, { rH: 8, al: { 0: 'left', 1: 'right', 2: 'right', 3: 'right', 4: 'right' }, cc: { 3: [27, 111, 168], 4: [26, 158, 91] } });

      // Investment Box
      const csY = 122;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, csY, 180, 66, 2, 2, 'F');
      doc.setDrawColor(232, 119, 34);
      doc.setLineWidth(0.6);
      doc.roundedRect(15, csY, 180, 66, 2, 2, 'S');
      doc.setFillColor(26, 31, 46);
      doc.rect(15, csY, 180, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text('INVESTMENT SUMMARY', 105, csY + 6.5, { align: 'center' });

      const summaryRows = [
        ['Gross Cost (Rs.50k/kWp)', R + ' ' + f(a.capex), [26, 31, 46]],
        ['PM Surya Ghar (30%)', '- ' + R + ' ' + f(a.subsidy), [26, 158, 91]],
        ['Net Customer Cost', R + ' ' + f(a.netCapex), [232, 119, 34]],
        ['Annual Savings', R + ' ' + f(a.annSav) + '/yr', [27, 111, 168]],
        ['Payback Period', a.payback + ' years', [26, 31, 46]],
        ['25-yr Revenue (est)', R + ' ' + f(a.annSav * 22.5), [27, 111, 168]],
      ];
      summaryRows.forEach(([key, val, c], idx) => {
        const ky = csY + 11 + idx * 9;
        doc.setFillColor(...(idx % 2 === 0 ? [255, 255, 255] : [254, 240, 208]));
        doc.rect(16, ky, 100, 8, 'F');
        doc.rect(116, ky, 77, 8, 'F');
        doc.setFont('helvetica', idx === 2 ? 'bold' : 'normal');
        doc.setFontSize(7.8);
        doc.setTextColor(92, 100, 128);
        doc.text(doc.splitTextToSize(key, 96)[0], 18, ky + 5.5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(idx === 2 ? 9 : 8);
        doc.setTextColor(...c);
        const vStr = doc.splitTextToSize(val, 74)[0];
        doc.text(vStr, 192, ky + 5.5, { align: 'right' });
      });

      // Disclaimer
      doc.setFillColor(253, 240, 208);
      doc.roundedRect(15, 193, 180, 22, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(232, 119, 34);
      doc.text('DISCLAIMER', 18, 199);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(92, 100, 128);
      const disc = 'AI-generated report using NASA POWER irradiance model. Tilt beta=0.76x|lat|. ' + 'Rs symbol used in place of rupee glyph for PDF compatibility. ' + 'All figures are indicative - validate with MNRE-certified engineer. Visit www.pvmart.co.in.';
      doc.text(doc.splitTextToSize(disc, 174), 18, 205);

      // Save PDF
      doc.save(`PVMart_${G.city}_${a.sysKW}kWp_Tilt${G.tilt}deg.pdf`);

      const tag = document.getElementById("t-pdf");
      if (tag) {
        tag.textContent = "✅ Done";
        tag.classList.add("done");
      }
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const a = G.analysis;

  return (
    <div>
      <NavBar progress={100} />
      <section className="sw" id="s-pdf">
        <div className="shdr">
          <span className="sno">07</span>
          <div>
            <h2>PDF Report</h2>
            <p>8-page professional report with 3D image, shadow diagram, hourly simulation &amp; physics-based analysis.</p>
          </div>
          <span className="stag" id="t-pdf">⏳</span>
        </div>

        {a ? (
          <div className="rbox">
            <div className="rbh">
              <div>
                <div className="rbl">PV<span>MART</span> <em>PRO</em></div>
                <div className="rbs">Physics Engine · NASA POWER · 8760h Simulation</div>
              </div>
              <div style={{ display: 'flex', gap: '.8rem', flexWrap: 'wrap' }}>
                <button className="btn-or" id="dlbtn" onClick={generatePDF} disabled={generating}>
                  {generating ? '⚡ Generating...' : '⬇ Download PDF'}
                </button>
                <button className="btn-out" onClick={() => window.print()}>🖨 Print</button>
              </div>
            </div>

            <div className="rb-kpis" id="rbkpis">
              <div className="kb"><b>{G.numPanels || 0}</b><span>Panels</span></div>
              <div className="kb"><b>{a.grossKW ? a.grossKW.toFixed(2) : '0.00'} kWp</b><span>DC kWp</span></div>
              <div className="kb"><b>{f(a.totalKWh)}</b><span>kWh/yr</span></div>
              <div className="kb"><b>Rs.{f(a.annSav)}</b><span>Savings/yr</span></div>
              <div className="kb"><b>{a.payback} yrs</b><span>Payback</span></div>
              <div className="kb"><b>{a.co2} T</b><span>CO2/yr</span></div>
            </div>

            <div className="rb-inc">
              <div>✅ 3D Model Image</div>
              <div>✅ Shadow Diagram</div>
              <div>✅ NOCT Temp Model</div>
              <div>✅ Dynamic PR</div>
              <div>✅ Soiling Loss</div>
              <div>✅ NASA POWER Data</div>
              <div>✅ 8760h Simulation</div>
              <div>✅ 10-Year Finance</div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--dk)', borderRadius: '10px', color: 'rgba(255,255,255,.6)' }}>
            ⚠️ Please run and confirm Physics Analysis first.
          </div>
        )}
      </section>

      <footer className="foot">
        <b>PV<span>MART</span> PRO</b> — Physics Engine · NASA POWER · 8760h Simulation —{' '}
        <a href="https://www.pvmart.co.in" target="_blank" rel="noreferrer">pvmart.co.in</a>
      </footer>
    </div>
  );
};

export default ReportGeneratorPage;