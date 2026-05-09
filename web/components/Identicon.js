const PALETTES = [
  ["#7c5cff", "#22d3ee"],
  ["#f472b6", "#fb923c"],
  ["#22d3ee", "#34d399"],
  ["#a78bfa", "#f472b6"],
  ["#fbbf24", "#f87171"],
  ["#60a5fa", "#a78bfa"],
];

function hashAddress(addr) {
  let h = 0;
  const s = (addr || "").toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export default function Identicon({ address, size = 40 }) {
  const h = hashAddress(address);
  const palette = PALETTES[h % PALETTES.length];
  const cellSize = size / 5;
  const cells = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      const bit = (h >> (row * 3 + col)) & 1;
      if (bit) {
        cells.push(<rect key={`${row}-${col}`} x={col * cellSize} y={row * cellSize} width={cellSize} height={cellSize} />);
        if (col < 2) {
          cells.push(<rect key={`${row}-m${col}`} x={(4 - col) * cellSize} y={row * cellSize} width={cellSize} height={cellSize} />);
        }
      }
    }
  }
  const id = `g-${h}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ borderRadius: "30%", overflow: "hidden" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette[0]} />
          <stop offset="100%" stopColor={palette[1]} />
        </linearGradient>
      </defs>
      <rect width={size} height={size} fill="rgba(255,255,255,0.04)" />
      <g fill={`url(#${id})`}>{cells}</g>
    </svg>
  );
}
