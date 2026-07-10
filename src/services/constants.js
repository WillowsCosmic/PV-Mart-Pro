// ══ DIRECTION CONSTANTS ═══════════════════════════════════════
export const DIRS8 = [
  {label:'N',deg:0},{label:'NE',deg:45},{label:'E',deg:90},{label:'SE',deg:135},
  {label:'S',deg:180},{label:'SW',deg:225},{label:'W',deg:270},{label:'NW',deg:315}
];

// ══ ELECTRICITY BOARD DATA ═══════════════════════════════════
export const ELECTRICITY_BOARDS = [
  {
    id: 'CESC',
    name: 'CESC (Calcutta Electric Supply Corp.)',
    tariff: 7.2,
    netMetering: true,
    region: 'West Bengal'
  },
  {
    id: 'WBSEDCL',
    name: 'WBSEDCL (WB State Electricity Distribution)',
    tariff: 6.8,
    netMetering: true,
    region: 'West Bengal'
  },
  {
    id: 'BESCOM',
    name: 'BESCOM (Bengaluru)',
    tariff: 8.5,
    netMetering: true,
    region: 'Karnataka'
  },
  {
    id: 'MSEDCL',
    name: 'MSEDCL (Maharashtra)',
    tariff: 9.2,
    netMetering: true,
    region: 'Maharashtra'
  },
  {
    id: 'TPDDL',
    name: 'TPDDL (Delhi)',
    tariff: 6.5,
    netMetering: true,
    region: 'Delhi'
  },
  {
    id: 'TNEB',
    name: 'TNEB (Tamil Nadu)',
    tariff: 7.8,
    netMetering: true,
    region: 'Tamil Nadu'
  },
  {
    id: 'UPPCL',
    name: 'UPPCL (Uttar Pradesh)',
    tariff: 7.1,
    netMetering: true,
    region: 'Uttar Pradesh'
  },
  {
    id: 'DHBVN',
    name: 'DHBVN (Haryana)',
    tariff: 7.5,
    netMetering: true,
    region: 'Haryana'
  }
];

// Helper object for quick lookups by board ID
export const ELECTRICITY_BOARD_MAP = ELECTRICITY_BOARDS.reduce((acc, board) => {
  acc[board.id] = board;
  return acc;
}, {});

// ══ SYSTEM TYPE CONFIGURATIONS ═══════════════════════════════
export const SYSTEM_TYPES = [
  {
    id: 'on-grid',
    icon: '🔌',
    name: 'On-Grid',
    description: 'Grid-tied · No battery · Net metering',
    requiresBattery: false,
    compatibleInverters: ['string', 'hybrid']
  },
  {
    id: 'hybrid',
    icon: '⚡',
    name: 'Hybrid',
    description: 'Grid + battery backup · Smart switching',
    requiresBattery: true,
    compatibleInverters: ['hybrid']
  },
  {
    id: 'off-grid',
    icon: '🔋',
    name: 'Off-Grid',
    description: 'Standalone · Full battery storage',
    requiresBattery: true,
    compatibleInverters: ['hybrid', 'offgrid']
  }
];

// Helper object for quick lookups
export const SYSTEM_TYPE_MAP = {
  'on-grid': SYSTEM_TYPES[0],
  'hybrid': SYSTEM_TYPES[1],
  'off-grid': SYSTEM_TYPES[2]
};

// ══ UTILITY FUNCTIONS ═══════════════════════════════════════
export const formatCurrency = (amount, currency = '₹') => {
  if (amount >= 10000000) {
    return `${currency}${(amount / 10000000).toFixed(1)}Cr`;
  } else if (amount >= 100000) {
    return `${currency}${(amount / 100000).toFixed(1)}L`;
  } else if (amount >= 1000) {
    return `${currency}${(amount / 1000).toFixed(0)}K`;
  }
  return `${currency}${amount.toFixed(0)}`;
};

export const formatNumber = (num, decimals = 0) => {
  if (typeof num !== 'number' || isNaN(num)) return '—';
  return num.toFixed(decimals);
};

export const formatArea = (sqft) => {
  if (sqft >= 43560) {
    return `${(sqft / 43560).toFixed(2)} acres`;
  }
  return `${formatNumber(sqft, 0)} sq.ft`;
};

export const calculatePanelArea = (panel, numPanels) => {
  if (!panel || !numPanels) return 0;
  return panel.sqft * numPanels;
};

export const calculateSystemMetrics = (panel, inverter, battery, numPanels, siteData) => {
  if (!panel || !numPanels) {
    return {
      panels: 0,
      dcKW: 0,
      acKW: 0,
      areaUsed: 0,
      annualYield: 0,
      annualSavings: 0,
      paybackYears: 0
    };
  }

  const dcKW = (numPanels * panel.watt) / 1000;
  const acKW = inverter ? Math.min(dcKW, inverter.kw) : dcKW * 0.9; // Assume 90% efficiency if no inverter
  const areaUsed = calculatePanelArea(panel, numPanels);
  
  // Simple annual yield calculation (detailed physics in solarPhysics.js)
  const averageGHI = 5.2; // kWh/m²/day (India average)
  const systemEfficiency = 0.75; // Account for losses
  const annualYield = dcKW * averageGHI * 365 * systemEfficiency;
  
  // Financial calculations
  const tariffRate = siteData?.tariff || 7.5; // ₹/kWh
  const annualSavings = annualYield * tariffRate;
  
  // Rough system cost estimation
  const panelCostPerWatt = 25; // ₹/W
  const inverterCost = inverter ? inverter.kw * 15000 : dcKW * 13500;
  const batteryCost = battery ? battery.kwh * 50000 : 0;
  const installationCost = dcKW * 10000; // Installation, mounting, etc.
  
  const totalCost = (dcKW * 1000 * panelCostPerWatt) + inverterCost + batteryCost + installationCost;
  const paybackYears = annualSavings > 0 ? totalCost / annualSavings : 0;

  return {
    panels: numPanels,
    dcKW: formatNumber(dcKW, 1),
    acKW: formatNumber(acKW, 1),
    areaUsed: formatNumber(areaUsed, 0),
    annualYield: formatNumber(annualYield, 0),
    annualSavings: formatCurrency(annualSavings),
    paybackYears: formatNumber(paybackYears, 1)
  };
};

export const getSystemTypeNote = (systemType) => {
  const config = SYSTEM_TYPE_MAP[systemType];
  if (!config) return '';
  
  switch (systemType) {
    case 'on-grid':
      return `🔌 <b>On-Grid:</b> Panels → Inverter → Grid. Earns net metering credits. No battery required.`;
    case 'hybrid':
      return `⚡ <b>Hybrid:</b> Panels → Hybrid Inverter ⇄ Battery + Grid. Smart load switching during outages.`;
    case 'off-grid':
      return `🔋 <b>Off-Grid:</b> Panels → Charge Controller → Battery → Inverter → Load. Fully independent system.`;
    default:
      return '';
  }
};