// ══ PRODUCT DATABASE ══════════════════════════════════════════
const PANELS = [
  {brand:'Tata Power',  model:'TP Mono 500',       watt:500, eff:.200, tech:'Mono PERC',       sqft:26, voc:49.2,isc:13.1,vmp:41.5,imp:12.0, noct:45, tempCoeff:-0.0037, gamma:-0.004},
  {brand:'Tata Power',  model:'TP Mono 550',        watt:550, eff:.205, tech:'Mono PERC',       sqft:27, voc:50.8,isc:13.8,vmp:42.8,imp:12.8, noct:45, tempCoeff:-0.0037, gamma:-0.004},
  {brand:'Adani Solar', model:'Adani Mono 540',     watt:540, eff:.210, tech:'Mono PERC',       sqft:27, voc:50.2,isc:13.6,vmp:42.2,imp:12.8, noct:44, tempCoeff:-0.0038, gamma:-0.0038},
  {brand:'Adani Solar', model:'Adani TOPCon 600',   watt:600, eff:.220, tech:'TOPCon',          sqft:28, voc:53.5,isc:14.2,vmp:45.0,imp:13.3, noct:43, tempCoeff:-0.003,  gamma:-0.003},
  {brand:'Adani Solar', model:'Adani Bifacial 650', watt:650, eff:.225, tech:'Bifacial TOPCon', sqft:29, voc:56.0,isc:14.8,vmp:47.2,imp:13.8, noct:43, tempCoeff:-0.003,  gamma:-0.003},
  {brand:'Waaree',      model:'Waaree Mono 540',    watt:540, eff:.210, tech:'Mono PERC',       sqft:27, voc:50.0,isc:13.5,vmp:42.0,imp:12.9, noct:45, tempCoeff:-0.0037, gamma:-0.004},
  {brand:'Waaree',      model:'Waaree Bi-600',      watt:600, eff:.220, tech:'Bifacial',        sqft:28, voc:53.0,isc:14.2,vmp:44.8,imp:13.4, noct:43, tempCoeff:-0.003,  gamma:-0.003},
  {brand:'Vikram Solar',model:'Somera 540',         watt:540, eff:.205, tech:'Mono PERC',       sqft:27, voc:49.8,isc:13.6,vmp:41.8,imp:12.9, noct:45, tempCoeff:-0.0037, gamma:-0.004},
  {brand:'Vikram Solar',model:'Somera 550',         watt:550, eff:.210, tech:'Mono PERC',       sqft:27, voc:50.5,isc:13.8,vmp:42.5,imp:12.9, noct:45, tempCoeff:-0.0037, gamma:-0.004},
  {brand:'Loom Solar',  model:'Shark 440',          watt:440, eff:.200, tech:'Mono PERC',       sqft:25, voc:45.8,isc:12.1,vmp:38.2,imp:11.5, noct:45, tempCoeff:-0.004,  gamma:-0.004},
  {brand:'Loom Solar',  model:'Shark 550',          watt:550, eff:.214, tech:'Mono PERC',       sqft:26, voc:50.5,isc:13.8,vmp:42.5,imp:12.9, noct:45, tempCoeff:-0.0037, gamma:-0.004},
  {brand:'LONGi Solar', model:'Hi-MO 550',          watt:550, eff:.220, tech:'Mono',            sqft:27, voc:51.0,isc:13.6,vmp:43.0,imp:12.8, noct:43, tempCoeff:-0.003,  gamma:-0.003},
  {brand:'LONGi Solar', model:'Hi-MO 600',          watt:600, eff:.225, tech:'Mono',            sqft:28, voc:54.0,isc:14.0,vmp:45.5,imp:13.2, noct:43, tempCoeff:-0.003,  gamma:-0.003},
  {brand:'Trina Solar', model:'Vertex 550',         watt:550, eff:.220, tech:'TOPCon',          sqft:27, voc:51.5,isc:13.5,vmp:43.5,imp:12.6, noct:43, tempCoeff:-0.003,  gamma:-0.003},
  {brand:'Trina Solar', model:'Vertex 670',         watt:670, eff:.230, tech:'TOPCon',          sqft:30, voc:58.0,isc:14.6,vmp:49.0,imp:13.7, noct:43, tempCoeff:-0.003,  gamma:-0.003},
  {brand:'Jinko Solar', model:'Tiger Neo 620',      watt:620, eff:.225, tech:'TOPCon',          sqft:29, voc:54.8,isc:14.4,vmp:46.2,imp:13.4, noct:43, tempCoeff:-0.003,  gamma:-0.003},
  {brand:'JA Solar',    model:'DeepBlue 550',       watt:550, eff:.215, tech:'Mono PERC',       sqft:27, voc:50.8,isc:13.7,vmp:42.8,imp:12.8, noct:45, tempCoeff:-0.0037, gamma:-0.004},
];

const INVERTERS = [
  // type: 'string'=on-grid only, 'hybrid'=grid+battery, 'offgrid'=off-grid
  {brand:'Deye',     model:'SUN-3K-SG03LP1',  kw:3,  eff:.971, mppt:'Dual MPPT', maxVdc:500, minVdc:60,  maxVac:240, type:'hybrid',  dcAcRatio:{min:1.0,max:1.5}},
  {brand:'Deye',     model:'SUN-5K-SG03LP1',  kw:5,  eff:.978, mppt:'Dual MPPT', maxVdc:600, minVdc:90,  maxVac:240, type:'hybrid',  dcAcRatio:{min:1.0,max:1.5}},
  {brand:'Deye',     model:'SUN-10K-SG04LP3', kw:10, eff:.980, mppt:'Dual MPPT', maxVdc:800, minVdc:90,  maxVac:240, type:'hybrid',  dcAcRatio:{min:1.0,max:1.5}},
  {brand:'Servotech',model:'SolarPCU 3K',     kw:3,  eff:.968, mppt:'MPPT',      maxVdc:480, minVdc:48,  maxVac:230, type:'hybrid',  dcAcRatio:{min:0.8,max:1.3}},
  {brand:'Servotech',model:'SolarPCU 5K',     kw:5,  eff:.972, mppt:'MPPT',      maxVdc:600, minVdc:90,  maxVac:230, type:'hybrid',  dcAcRatio:{min:0.8,max:1.3}},
  {brand:'Visol',    model:'Visol 5K-Grid',   kw:5,  eff:.970, mppt:'Dual MPPT', maxVdc:600, minVdc:90,  maxVac:240, type:'string',  dcAcRatio:{min:0.9,max:1.4}},
  {brand:'Smarten',  model:'Superb 5K',       kw:5,  eff:.962, mppt:'MPPT',      maxVdc:580, minVdc:72,  maxVac:230, type:'string',  dcAcRatio:{min:0.9,max:1.3}},
  {brand:'Epro',     model:'Epro 5K-Hybrid',  kw:5,  eff:.970, mppt:'MPPT',      maxVdc:600, minVdc:90,  maxVac:230, type:'hybrid',  dcAcRatio:{min:0.9,max:1.4}},
  {brand:'UTL Solar',model:'UTL Gamma 3K',    kw:3,  eff:.960, mppt:'MPPT',      maxVdc:450, minVdc:48,  maxVac:230, type:'string',  dcAcRatio:{min:0.8,max:1.3}},
  {brand:'UTL Solar',model:'UTL Gamma 5K',    kw:5,  eff:.972, mppt:'Dual MPPT', maxVdc:600, minVdc:90,  maxVac:230, type:'hybrid',  dcAcRatio:{min:0.9,max:1.4}},
];

const BATTERIES = [
  {brand:'Luminous', model:'Lithium 5kWh',      kwh:5.0,  type:'Lithium',   eff:.95, v:48, dod:0.90, cycles:4000, replacementYr:10},
  {brand:'Luminous', model:'Lithium 10kWh',     kwh:10.0, type:'Lithium',   eff:.95, v:48, dod:0.90, cycles:4000, replacementYr:10},
  {brand:'Exide',    model:'Tubular 150Ah',     kwh:1.8,  type:'Lead Acid', eff:.85, v:12, dod:0.50, cycles:1200, replacementYr:5},
  {brand:'Exide',    model:'Tubular 200Ah',     kwh:2.4,  type:'Lead Acid', eff:.85, v:12, dod:0.50, cycles:1200, replacementYr:5},
  {brand:'Okaya',    model:'Lithium 5kWh',      kwh:5.0,  type:'Lithium',   eff:.95, v:48, dod:0.90, cycles:3500, replacementYr:10},
  {brand:'Okaya',    model:'Lithium 7.5kWh',    kwh:7.5,  type:'Lithium',   eff:.95, v:48, dod:0.90, cycles:3500, replacementYr:10},
  {brand:'UTL Solar',model:'Lithium Pack 5kWh', kwh:5.0,  type:'Lithium',   eff:.95, v:48, dod:0.90, cycles:3500, replacementYr:10},
];

// Utility functions for product filtering and selection
export const filterByBrand = (products, brand) => {
  return products.filter(p => p.brand === brand);
};

export const getUniqueBrands = (products) => {
  return [...new Set(products.map(p => p.brand))].sort();
};

export const findByModel = (products, model) => {
  return products.find(p => p.model === model);
};

export const getCompatibleInverters = (systemType) => {
  if (systemType === 'on-grid') {
    return INVERTERS.filter(inv => inv.type === 'string' || inv.type === 'hybrid');
  }
  if (systemType === 'hybrid') {
    return INVERTERS.filter(inv => inv.type === 'hybrid');
  }
  if (systemType === 'off-grid') {
    return INVERTERS.filter(inv => inv.type === 'hybrid' || inv.type === 'offgrid');
  }
  return INVERTERS;
};

// Additional helper functions
export const calculateInvertersNeeded = (totalKW, inverterKW) => {
  return Math.ceil(totalKW / inverterKW);
};

export const calculateBatteriesNeeded = (requiredKWh, batteryKWh) => {
  return Math.ceil(requiredKWh / batteryKWh);
};

export { PANELS, INVERTERS, BATTERIES };