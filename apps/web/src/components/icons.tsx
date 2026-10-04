const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="8" fill="var(--blue)" />
      <circle cx="12.5" cy="12.5" r="5.5" fill="none" stroke="var(--yellow)" strokeWidth="2.4" />
      <path d="M16.6 16.6L21 21" stroke="var(--yellow)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function GaugeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <path d="M4 16a8 8 0 1 1 16 0" />
      <path d="M12 16l4-5" />
    </svg>
  );
}

export function CheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth={2.6}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function TelegramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}>
      <path d="M21 4L3 11l6 2 2 6 3-4 5 4z" />
      <path d="M9 13l8-6" />
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function FlagUS() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
      <rect width="20" height="14" fill="#fff" />
      <g fill="#B22234">
        <rect width="20" height="2" />
        <rect y="4" width="20" height="2" />
        <rect y="8" width="20" height="2" />
        <rect y="12" width="20" height="2" />
      </g>
      <rect width="9" height="8" fill="#3C3B6E" />
      <rect
        x="0.5"
        y="0.5"
        width="19"
        height="13"
        rx="1.5"
        fill="none"
        stroke="#16181D"
        strokeOpacity="0.15"
      />
    </svg>
  );
}

export function FlagEU() {
  const stars = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    return (
      <circle
        key={i}
        cx={10 + 4.2 * Math.cos(a)}
        cy={7 + 4.2 * Math.sin(a)}
        r="0.75"
        fill="#FFCC00"
      />
    );
  });
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
      <rect width="20" height="14" fill="#003399" />
      {stars}
    </svg>
  );
}

export function StoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}>
      <path d="M3 10l2-6h14l2 6" />
      <path d="M4 10v10h16V10" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

export function PersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}

export function KeyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M17 6l3 3M15 8l2 2" />
    </svg>
  );
}
