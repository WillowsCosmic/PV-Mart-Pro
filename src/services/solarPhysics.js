/* eslint-disable no-unused-vars */
// ══ PHYSICS ENGINE — CORRECT EQUATIONS FROM DOCUMENT ═══════════
export const PHYSICS = {
  // 1. Tilt Correction: Gtilt = GHI × (1 + 0.1 × sin(β))
  tiltCorrection(ghi, tiltDeg) {
    const beta = tiltDeg * Math.PI / 180;
    return ghi * (1 + 0.1 * Math.sin(beta));
  },
  // 2. DC Power: Pdc = Prated × (Gtilt / 1000)
  dcPower(pratedW, gtilt) {
    return pratedW * (gtilt / 1000);
  },
  // 3. Cell Temperature: Tcell = Tamb + ((NOCT-20)/800) × Gtilt
  cellTemp(tamb, noct, gtilt) {
    return tamb + ((noct - 20) / 800) * gtilt;
  },
  // 4. Temperature Loss: Ptemp = Pdc × [1 + γ(Tcell - 25)]
  tempLoss(pdc, gamma, tcell) {
    return pdc * (1 + gamma * (tcell - 25));
  },
  // 5. Loss Chain: Ploss = Ptemp × (1-Lsoil) × (1-Lwire) × (1-Lmismatch) × (1-Lshade)
  lossChain(ptemp, losses) {
    return ptemp
      * (1 - losses.soiling)
      * (1 - losses.wiring)
      * (1 - losses.mismatch)
      * (1 - losses.shading);
  },
  // 6. AC Output: Pac = Ploss × ηinv  (with clipping if Ploss > Pinv_rated)
  acOutput(ploss, etaInv, invRatedW) {
    const clipped = invRatedW ? Math.min(ploss, invRatedW) : ploss;
    return clipped * etaInv;
  },
  // 7. Performance Ratio: PR = Pac / (Gtilt/1000 × Prated)
  performanceRatio(pac, gtilt, pratedW) {
    const ideal = (gtilt / 1000) * pratedW;
    return ideal > 0 ? pac / ideal : 0;
  },
  // 8. Degradation: En = E1 × (1 - 0.005)^n
  degradedEnergy(e1, year) {
    return e1 * Math.pow(1 - 0.005, year);
  },
  // India-specific soiling loss (dust/pollution varies by season)
  soilingLoss(monthIdx) {
    // Higher in dry months (Oct-Apr), lower in monsoon (Jun-Sep)
    const soiling = [0.07,0.07,0.06,0.06,0.06,0.03,0.02,0.02,0.03,0.06,0.07,0.07];
    return soiling[monthIdx] || 0.05;
  },
};

// ══ MONTHLY GHI BY LATITUDE (fallback when NASA API unavailable) ════
export function getGHI(lat) {
  const a = Math.abs(lat);
  if(a<15) return [5.8,6.2,6.8,6.6,5.9,4.8,4.5,4.7,5.2,5.8,5.9,5.6];
  if(a<20) return [5.4,6.0,6.6,6.5,5.8,4.5,4.2,4.4,4.9,5.5,5.5,5.2];
  if(a<25) return [4.9,5.5,6.2,6.3,5.8,4.4,4.0,4.2,4.6,5.0,5.0,4.7];
  if(a<30) return [4.2,4.9,5.8,6.0,5.7,4.6,4.1,4.3,4.5,4.7,4.5,4.0];
  return          [3.8,4.5,5.4,5.8,5.6,5.0,4.5,4.5,4.4,4.3,4.0,3.6];
}

// Monthly ambient temperatures (India, approximate by latitude band)
export function getAmbientTemp(lat) {
  const a = Math.abs(lat);
  if(a<15) return [28,30,33,36,37,34,32,32,32,31,29,27];
  if(a<20) return [24,27,32,37,40,36,32,31,32,30,26,23];
  if(a<25) return [20,24,30,36,40,36,31,30,31,29,24,20]; // Kolkata range
  if(a<30) return [14,18,25,33,38,36,32,31,30,26,19,14];
  return          [10,14,20,28,35,36,32,30,28,22,15,10];
}

// ══ SOLAR GEOMETRY FORMULAS ═══════════════════════════════════
export const SF = {
  dayOfYear(m,d=15){const M=[0,31,28,31,30,31,30,31,31,30,31,30];let n=d;for(let i=0;i<m-1;i++)n+=M[i];return n},
  declination(n){return 23.45*Math.sin(2*Math.PI/365*(n-81))},
  hourAngle(t){return 15*(t-12)},
  solarAlt(lat,decl,omega){
    const φ=lat*Math.PI/180,δ=decl*Math.PI/180,ω=omega*Math.PI/180;
    return Math.asin(Math.max(-1,Math.min(1,Math.sin(φ)*Math.sin(δ)+Math.cos(φ)*Math.cos(δ)*Math.cos(ω))))*180/Math.PI;
  },
  solarAz(lat,decl,omega,alt){
    const φ=lat*Math.PI/180,δ=decl*Math.PI/180,ω=omega*Math.PI/180,α=alt*Math.PI/180;
    const c=Math.max(-1,Math.min(1,(Math.sin(δ)-Math.sin(φ)*Math.sin(α))/(Math.cos(φ)*Math.cos(α))));
    let az=Math.acos(c)*180/Math.PI;
    if(omega>0)az=360-az;
    return az;
  },
  optTilt(lat,mo=null){
    if(!mo)return Math.round(Math.abs(lat));
    if(mo>=4&&mo<=9)return Math.max(5,Math.round(Math.abs(lat)-10));
    return Math.min(45,Math.round(Math.abs(lat)+10));
  },
  shadingAngle(h,dist){return dist<=0?90:Math.atan(h/dist)*180/Math.PI},
  minClearDist(h,lat){
    const alt=90-Math.abs(lat);
    return h/Math.tan(Math.max(5,alt)*Math.PI/180);
  },
  irradianceTilted(Gh,tilt,lat,mo){
    return PHYSICS.tiltCorrection(Gh, tilt);
  },
  panelsPerStr(invMaxVdc,panelVoc){return Math.floor(invMaxVdc*.9/panelVoc)},
  numStrings(total,perStr){return Math.ceil(total/perStr)},
};

// ══ INVERTER/BATTERY VALIDATION ═══════════════════════════════
// ══ UTILITY FUNCTIONS ═══════════════════════════════════
export function formatNumber(num, decimals = 1) {
  if (num === null || num === undefined || isNaN(num)) return '—';
  return Number(num).toFixed(decimals);
}

export function formatCurrency(amount, currency = '₹') {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  const formatted = Number(amount).toLocaleString('en-IN');
  return `${currency} ${formatted}`;
}

export function calculateAnnualYield(dcKW, lat, losses = {}) {
  const ghi = getGHI(lat);
  const tilt = SF.optTilt(lat);
  
  let totalYield = 0;
  for (let month = 0; month < 12; month++) {
    const monthlyGHI = ghi[month] * 30.44; // Average days per month
    const tiltedGHI = PHYSICS.tiltCorrection(monthlyGHI, tilt);
    const dcEnergy = dcKW * tiltedGHI;
    
    // Apply losses
    const finalEnergy = dcEnergy 
      * (1 - (losses.soiling || 0.05))
      * (1 - (losses.wiring || 0.02))
      * (1 - (losses.mismatch || 0.02))
      * (1 - (losses.shading || 0.05))
      * (losses.inverterEff || 0.95);
    
    totalYield += finalEnergy;
  }
  
  return totalYield;
}

export function calculatePayback(systemCost, annualSavings) {
  if (!annualSavings || annualSavings <= 0) return '∞';
  return (systemCost / annualSavings).toFixed(1);
}

export function validateSystem(panel, inverter, battery, numPanels, systemType) {
  const warnings = [];
  const errors = [];
  if (!panel) return { warnings, errors, valid: true };

  const dcKW = numPanels * panel.watt / 1000;

  if (!inverter) {
    warnings.push('⚠️ No inverter selected. Ideal size: ' + (dcKW*0.8).toFixed(1) + '–' + (dcKW*1.2).toFixed(1) + ' kW');
    return { warnings, errors, valid: true, dcAcRatio: '—', perStr: 1 };
  }

  const acKW = inverter.kw;
  const dcAcRatio = dcKW / acKW;

  // FIX 2: Inverter sizing — ideal 0.8–1.2 × DC
  const idealMin = +(dcKW * 0.8).toFixed(1);
  const idealMax = +(dcKW * 1.2).toFixed(1);
  if (dcAcRatio < 0.7) {
    errors.push('❌ Inverter oversized (DC/AC = '+dcAcRatio.toFixed(2)+'). Use '+idealMin+'–'+idealMax+' kW inverter for '+dcKW.toFixed(2)+' kWp DC. Larger inverter = higher cost, lower efficiency.');
  } else if (dcAcRatio < 0.8) {
    warnings.push('⚠️ Inverter slightly oversized (DC/AC = '+dcAcRatio.toFixed(2)+'). Ideal: 0.8–1.2. Consider '+idealMin+'–'+idealMax+' kW.');
  } else if (dcAcRatio > 1.5) {
    errors.push('❌ DC/AC ratio '+dcAcRatio.toFixed(2)+' too high — severe clipping. Use '+idealMax+' kW inverter. Current '+acKW+'kW will waste '+(dcKW-acKW).toFixed(2)+' kWp.');
  } else if (dcAcRatio > 1.2) {
    warnings.push('⚠️ DC/AC ratio '+dcAcRatio.toFixed(2)+' slightly high. Some clipping may occur. Ideal max: 1.2.');
  }

  // FIX 3: Correct string voltage calculation
  const perStr = Math.min(numPanels, Math.floor(inverter.maxVdc * 0.9 / panel.voc));
  const strVoc = perStr * panel.voc;
  const strVmp = perStr * panel.vmp;

  if (strVoc > inverter.maxVdc) {
    errors.push('❌ String Voc ('+strVoc.toFixed(0)+'V) exceeds inverter max Vdc ('+inverter.maxVdc+'V). Reduce to '+Math.floor(inverter.maxVdc*0.9/panel.voc)+' panels/string.');
  } else if (strVoc > inverter.maxVdc * 0.9) {
    warnings.push('⚠️ String Voc ('+strVoc.toFixed(0)+'V) close to inverter max ('+inverter.maxVdc+'V). Leave 10% headroom for cold weather Voc rise.');
  }
  if (strVmp < (inverter.minVdc || 60)) {
    warnings.push('⚠️ String Vmp ('+strVmp.toFixed(0)+'V) may fall below MPPT minimum ('+inverter.minVdc+'V) on hot days. Add 1 more panel per string.');
  }

  // System type compatibility
  if (systemType === 'on-grid' && inverter.type === 'offgrid') {
    errors.push('❌ Off-grid inverter cannot be used for On-Grid. Select string or hybrid inverter.');
  }
  if (systemType === 'off-grid' && inverter.type === 'string') {
    errors.push('❌ String inverter cannot be used for Off-Grid. Select hybrid or off-grid inverter.');
  }

  // Battery checks
  if (battery) {
    if (systemType === 'on-grid') {
      warnings.push('⚠️ Battery not needed for On-Grid system. Removes cost without benefit.');
    }
    if (systemType === 'hybrid' || systemType === 'off-grid') {
      const backupHrs = (battery.kwh * battery.dod) / Math.max(0.5, acKW * 0.3);
      if (backupHrs < 2) {
        warnings.push('⚠️ Battery too small — only '+backupHrs.toFixed(1)+'h backup. Consider '+Math.ceil(acKW*0.3*4/battery.dod)+' units of '+battery.model+'.');
      }
    }
  } else if (systemType !== 'on-grid') {
    errors.push('❌ Battery required for '+systemType+' system. Please select a battery.');
  }

  return {
    warnings, errors,
    valid: errors.length === 0,
    dcAcRatio: dcAcRatio.toFixed(2),
    perStr, strVoc: strVoc.toFixed(0), strVmp: strVmp.toFixed(0),
    idealMin, idealMax,
  };
}