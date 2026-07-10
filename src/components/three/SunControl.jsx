export default function SunControls({ hr, month, onChangeHr, onChangeMonth }) {
  return (
    <div>
      <label>
        Hour
        <input
          type="range"
          min="0"
          max="24"
          step="0.25"
          value={hr}
          onChange={(e) => onChangeHr(parseFloat(e.target.value))}
        />
      </label>

      <label>
        Month
        <input
          type="number"
          min="1"
          max="12"
          value={month}
          onChange={(e) => onChangeMonth(parseInt(e.target.value, 10))}
        />
      </label>
    </div>
  );
}