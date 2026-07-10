import { create } from "zustand";

export const useSolarStore = create((set, get) => ({
  // ── Themes ──────────────────────────────────────────────
  panelTheme:   "deepblue",
  skyTheme:     "day",
  groundTheme:  "grass",
  buildingTheme:"vivid",

  setPanelTheme:    (v) => set({ panelTheme: v }),
  setSkyTheme:      (v) => set({ skyTheme: v }),
  setGroundTheme:   (v) => set({ groundTheme: v }),
  setBuildingTheme: (v) => set({ buildingTheme: v }),

  // ── Sun / time ──────────────────────────────────────────
  sunHour:  12,
  sunMonth: 6,
  setSunHour:  (v) => set({ sunHour: v }),
  setSunMonth: (v) => set({ sunMonth: v }),

  // ── Visibility toggles ──────────────────────────────────
  show3DNumbers:   true,
  show3DLabels:    true,
  show3DObsLabels: true,
  setShow3DNumbers:   (v) => set({ show3DNumbers: v }),
  setShow3DLabels:    (v) => set({ show3DLabels: v }),
  setShow3DObsLabels: (v) => set({ show3DObsLabels: v }),

  // ── Interaction ─────────────────────────────────────────
  moveMode: false,
  toggleMoveMode: () => set((s) => ({ moveMode: !s.moveMode })),

  // ── Row gap ─────────────────────────────────────────────
  rowGapExtra: 1.2,
  setRowGapExtra: (v) => set({ rowGapExtra: v }),

  // ── Wiring mode ─────────────────────────────────────────
  wiringMode: "series",
  setWiringMode: (v) => {
    set({ wiringMode: v });
    get().updateG({ wiringMode: v });
  },

  // ── Computed sun-hours output (written by SunLight) ─────
  sunHoursText: "—",
  setSunHoursText: (v) => set({ sunHoursText: v }),

  // ── Wiring stats (written by WiringStats) ───────────────
  wsVoltage: "—", wsAmps: "—", wsStrings: "—",
  setWiringStats: ({ V, A, S }) => set({ wsVoltage: V, wsAmps: A, wsStrings: S }),

  // ── Scene-rebuild trigger ────────────────────────────────
  sceneVersion: 0,
  rebuildScene: () => set((s) => ({ sceneVersion: s.sceneVersion + 1 })),

  // ── Global Site & Analysis State ─────────────────────────
  G: {
    lat: 22.5726,
    lng: 88.3639,
    city: "Kolkata",
    siteArea: 2000,
    roofW: 50,
    roofD: 40,
    parapetH: 3,
    tilt: 15,
    optTilt: 15,
    obstacles: [],
    shadingData: [],
    panel: null,
    inverter: null,
    battery: null,
    gridType: "on-grid",
    wiringMode: "series",
    numPanels: 0,
    systemKW: 0,
    annualYield: 0,
    analysis: null,
    nasaData: null,
    validation: null,
    boardTariff: 7.5,
    boardName: "",
    optRowSpacingFt: "—",
    avgDailySunHrs: "—",
    _3dImageData: null,
    simulation: null,
  },
  movedPositions: {},
  setMovedPosition: (key, x, z) => set((s) => ({
    movedPositions: { ...s.movedPositions, [key]: { x, z } }
  })),
  updateG: (fields) => set((s) => ({ G: { ...s.G, ...fields } })),
}));

