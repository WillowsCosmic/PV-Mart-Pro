import { useSolarStore } from "./useSolarStore";

function Chip({ label, bg, fg, onClick, active }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? fg : bg,
        color: active ? bg : fg,
        border: `1.5px solid ${fg}`,
        borderRadius: 6,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        margin: "0 3px",
        transition: "all .15s",
        letterSpacing: "0.03em",
      }}
    >
      {label}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginRight: 14 }}>
      <span style={{ color: "#aaa", fontSize: 10, fontWeight: 700, marginRight: 4, whiteSpace: "nowrap" }}>
        {title}
      </span>
      {children}
    </div>
  );
}

export default function ThemeBar() {
  const panelTheme    = useSolarStore((s) => s.panelTheme);
  const skyTheme      = useSolarStore((s) => s.skyTheme);
  const groundTheme   = useSolarStore((s) => s.groundTheme);
  const buildingTheme = useSolarStore((s) => s.buildingTheme);
  const moveMode      = useSolarStore((s) => s.moveMode);
  const rowGapExtra   = useSolarStore((s) => s.rowGapExtra);

  const setPanelTheme    = useSolarStore((s) => s.setPanelTheme);
  const setSkyTheme      = useSolarStore((s) => s.setSkyTheme);
  const setGroundTheme   = useSolarStore((s) => s.setGroundTheme);
  const setBuildingTheme = useSolarStore((s) => s.setBuildingTheme);
  const toggleMoveMode   = useSolarStore((s) => s.toggleMoveMode);
  const setRowGapExtra   = useSolarStore((s) => s.setRowGapExtra);
  const rebuildScene     = useSolarStore((s) => s.rebuildScene);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        background: "rgba(8,14,28,.92)",
        borderTop: "1px solid #1a2a4a",
        padding: "7px 10px",
        gap: 6,
        fontSize: 11,
      }}
    >
      {/* Panel themes */}
      <Section title="🔲 PANEL">
        {[
          ["Deep Blue", "#010510", "#4FC3F7", "deepblue"],
          ["Blue",      "#020A28", "#00EEFF", "blue"],
          ["Green",     "#001A0A", "#00FF88", "green"],
          ["Purple",    "#150030", "#DD88FF", "purple"],
          ["Teal",      "#004D40", "#00FFDD", "teal"],
          ["Gold",      "#0A1840", "#FFD700", "gradient"],
        ].map(([label, bg, fg, key]) => (
          <Chip
            key={key}
            label={label}
            bg={bg}
            fg={fg}
            active={panelTheme === key}
            onClick={() => { setPanelTheme(key); rebuildScene(); }}
          />
        ))}
      </Section>

      {/* Sky themes */}
      <Section title="🌤 SKY">
        {[
          ["Day",    "#0A2A6E", "#88CCFF", "day"],
          ["Sunset", "#1A0A30", "#FF6622", "sunset"],
          ["Night",  "#020510", "#4466AA", "night"],
          ["Dawn",   "#1A1040", "#FF9966", "dawn"],
        ].map(([label, bg, fg, key]) => (
          <Chip
            key={key}
            label={label}
            bg={bg}
            fg={fg}
            active={skyTheme === key}
            onClick={() => setSkyTheme(key)}
          />
        ))}
      </Section>

      {/* Ground themes */}
      <Section title="🌿 GROUND">
        {[
          ["Grass",    "#2D5A27", "#5A9A50", "grass"],
          ["Concrete", "#5A5A5A", "#9A9A9A", "concrete"],
          ["Desert",   "#8B6914", "#C09030", "desert"],
          ["Rooftop",  "#3A4A5A", "#607090", "rooftop"],
        ].map(([label, bg, fg, key]) => (
          <Chip
            key={key}
            label={label}
            bg={bg}
            fg={fg}
            active={groundTheme === key}
            onClick={() => setGroundTheme(key)}
          />
        ))}
      </Section>

      {/* Building themes */}
      <Section title="🏙 BUILDINGS">
        {[
          ["Vivid",  "#1a0a00", "#d97706", "vivid"],
          ["Pastel", "#1a1a1a", "#fbd38d", "pastel"],
          ["Mono",   "#111111", "#9ca3af", "mono"],
          ["Neon",   "#050010", "#ff0090", "neon"],
        ].map(([label, bg, fg, key]) => (
          <Chip
            key={key}
            label={label}
            bg={bg}
            fg={fg}
            active={buildingTheme === key}
            onClick={() => setBuildingTheme(key)}
          />
        ))}
      </Section>

      {/* Row gap */}
      <Section title="↕ ROW GAP">
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.1"
          value={rowGapExtra}
          onChange={(e) => { setRowGapExtra(+e.target.value); rebuildScene(); }}
          style={{ width: 70 }}
        />
        <span style={{ color: "#aaa", fontSize: 11 }}>{rowGapExtra.toFixed(1)} ft</span>
      </Section>

      {/* Move mode */}
      <button
        onClick={toggleMoveMode}
        style={{
          marginLeft: "auto",
          background: moveMode ? "#22c55e" : "#1a2a3a",
          color: moveMode ? "#fff" : "#aaa",
          border: "1.5px solid #334",
          borderRadius: 6,
          padding: "4px 12px",
          fontWeight: 700,
          fontSize: 11,
          cursor: "pointer",
        }}
      >
        {moveMode ? "🔒 Lock (Done Moving)" : "✋ Move Elements"}
      </button>
    </div>
  );
}
