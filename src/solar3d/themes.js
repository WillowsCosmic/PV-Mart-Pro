export const PANEL_THEMES = {
  deepblue: {
    face: 0x0a1628, spec: 0x1a4a8a, emit: 0x020810,
    cell: "rgba(40,100,220,.60)", sheen: "rgba(20,80,200,.30)",
    badge: "#010510", numClr: "#4FC3F7",
    cellColor: "#0D1B3E", cellLine: "rgba(30,90,200,.50)",
    busbar: "rgba(180,210,255,.55)",
  },
  blue: {
    face: 0x0d47a1, spec: 0x336699, emit: 0x041530,
    cell: "rgba(80,180,255,.55)", sheen: "rgba(60,160,255,.25)",
    badge: "#020A28", numClr: "#00EEFF",
  },
  green: {
    face: 0x1b5e20, spec: 0x33aa44, emit: 0x041208,
    cell: "rgba(80,255,140,.5)", sheen: "rgba(60,255,100,.2)",
    badge: "#001A0A", numClr: "#00FF88",
  },
  purple: {
    face: 0x4a148c, spec: 0xaa66ff, emit: 0x150830,
    cell: "rgba(200,100,255,.5)", sheen: "rgba(160,80,255,.2)",
    badge: "#150030", numClr: "#DD88FF",
  },
  teal: {
    face: 0x004d40, spec: 0x33ddcc, emit: 0x001510,
    cell: "rgba(60,230,210,.5)", sheen: "rgba(40,220,200,.2)",
    badge: "#001518", numClr: "#00FFDD",
  },
  gradient: {
    face: 0x1565c0, spec: 0x44aaff, emit: 0x051020,
    cell: "rgba(120,200,255,.5)", sheen: "rgba(80,200,255,.22)",
    badge: "#020C20", numClr: "#FFD700",
  },
};

export const SKY_THEMES = {
  day:    { top: 0x0a2a6e, bot: 0x3a7fbf, hemi: 0x88ccff, hemiGnd: 0x224422, fog: 0x0a1628 },
  sunset: { top: 0x1a0a30, bot: 0xff6622, hemi: 0xffaa44, hemiGnd: 0x331100, fog: 0x1a0808 },
  night:  { top: 0x020510, bot: 0x060d20, hemi: 0x2244aa, hemiGnd: 0x112211, fog: 0x020408 },
  dawn:   { top: 0x1a1040, bot: 0xff9966, hemi: 0xffccaa, hemiGnd: 0x332211, fog: 0x0a0808 },
};

export const GROUND_THEMES = {
  grass:    { c1: "#2D5A27", c2: "#3A7A32", c3: "#1E4A1A" },
  concrete: { c1: "#5A5A5A", c2: "#6A6A6A", c3: "#4A4A4A" },
  desert:   { c1: "#8B6914", c2: "#A07820", c3: "#6B520C" },
  rooftop:  { c1: "#3A4A5A", c2: "#4A5A6A", c3: "#2A3A4A" },
};

export const BUILDING_THEMES = {
  vivid:  [0xd97706, 0x059669, 0xdc2626, 0x7c3aed, 0x0284c7, 0xdb2777, 0x65a30d, 0xea580c],
  pastel: [0xfbd38d, 0x9ae6b4, 0xfeb2b2, 0xd6bcfa, 0x90cdf4, 0xfbb6ce, 0xc6f6d5, 0xfeebc8],
  mono:   [0x4b5563, 0x6b7280, 0x374151, 0x9ca3af, 0x1f2937, 0xd1d5db, 0x374151, 0x6b7280],
  neon:   [0xff0090, 0x00ff44, 0xff6600, 0x8800ff, 0x00ccff, 0xffee00, 0xff2244, 0x00ffcc],
};
