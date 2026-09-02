// Bulle de pensée avec engrenages animés (page de login, colonne gauche).
// Décoratif uniquement — aucune logique.

function Gear({
  cx,
  cy,
  r,
  teeth,
  color,
  holeColor,
  animation,
}: {
  cx: number
  cy: number
  r: number
  teeth: number
  color: string
  holeColor: string
  animation: string
}) {
  const toothW = r * 0.34
  const toothH = r * 0.3

  return (
    <g style={{ transformOrigin: `${cx}px ${cy}px`, animation }}>
      <circle cx={cx} cy={cy} r={r} fill={color} />
      {Array.from({ length: teeth }).map((_, i) => (
        <rect
          key={i}
          x={cx - toothW / 2}
          y={cy - r - toothH * 0.55}
          width={toothW}
          height={toothH}
          rx={1.5}
          fill={color}
          transform={`rotate(${(360 / teeth) * i} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.4} fill={holeColor} />
    </g>
  )
}

export default function GearThoughtBubble() {
  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="130" viewBox="0 0 180 130" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="90" cy="55" rx="82" ry="48" fill="#2d1b69" stroke="#7C3AED" strokeWidth="2" />
        <Gear cx={68} cy={55} r={26} teeth={10} color="#7C3AED" holeColor="#2d1b69" animation="spin-cw 20s linear infinite" />
        <Gear cx={112} cy={36} r={15} teeth={8} color="#a78bfa" holeColor="#2d1b69" animation="spin-cw 16s linear infinite" />
        <Gear cx={118} cy={74} r={9} teeth={6} color="#a78bfa" holeColor="#2d1b69" animation="spin-ccw 12s linear infinite" />
      </svg>
      <div className="-mt-1 flex flex-col items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, #a78bfa, #7C3AED)' }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, #a78bfa, #7C3AED)' }} />
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, #a78bfa, #7C3AED)' }} />
      </div>
    </div>
  )
}
