/**
 * Ashraya seal — an official-style circular emblem (navy + Indian tricolour)
 * with a shelter motif, echoing the name's meaning (आश्रय, "refuge / shelter").
 * Deliberately NOT the national Ashoka emblem — this is a community NGO service.
 */
export function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Ashraya seal"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="48" fill="var(--brand-navy)" />
      {/* tricolour ring arcs */}
      <path d="M50 4 A46 46 0 0 1 96 50 L88 50 A38 38 0 0 0 50 12 Z" fill="var(--brand-saffron)" />
      <path d="M96 50 A46 46 0 0 1 50 96 L50 88 A38 38 0 0 0 88 50 Z" fill="#ffffff" />
      <path d="M50 96 A46 46 0 0 1 4 50 L12 50 A38 38 0 0 0 50 88 Z" fill="var(--brand-green)" />
      <path d="M4 50 A46 46 0 0 1 50 4 L50 12 A38 38 0 0 0 12 50 Z" fill="#ffffff" />
      <circle cx="50" cy="50" r="34" fill="var(--brand-navy)" />
      <circle cx="50" cy="50" r="33" fill="none" stroke="var(--brand-saffron)" strokeWidth="1.2" />
      {/* shelter / refuge motif: a roof over a figure */}
      <path
        d="M32 52 L50 36 L68 52"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="50" cy="55" r="4.5" fill="var(--brand-saffron)" />
      <path
        d="M42 70 a8 8 0 0 1 16 0 Z"
        fill="#ffffff"
      />
    </svg>
  )
}
