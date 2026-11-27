interface FlagProps {
  width?: number;
  height?: number;
}

/** Bandeira do Brasil em SVG vetorial de alta definição */
export function FlagBR({ width = 18, height = 12 }: FlagProps) {
  return (
    <svg
      viewBox="0 0 24 16"
      width={width}
      height={height}
      style={{ flexShrink: 0, borderRadius: 2, display: "block" }}
      aria-hidden="true"
    >
      <rect width="24" height="16" fill="#009C3B" />
      <polygon points="12,2.2 21.8,8 12,13.8 2.2,8" fill="#FFDF00" />
      <circle cx="12" cy="8" r="3.6" fill="#002776" />
      <path d="M 8.6 8.5 A 3.6 3.6 0 0 0 15.3 6.9 A 3.8 3.8 0 0 1 8.6 8.5" fill="#FFFFFF" />
    </svg>
  );
}

/** Bandeira dos Estados Unidos em SVG vetorial de alta definição */
export function FlagUS({ width = 18, height = 12 }: FlagProps) {
  return (
    <svg
      viewBox="0 0 24 16"
      width={width}
      height={height}
      style={{ flexShrink: 0, borderRadius: 2, display: "block" }}
      aria-hidden="true"
    >
      <rect width="24" height="16" fill="#B22234" />
      <path
        d="M0,2.46h24M0,4.92h24M0,7.38h24M0,9.84h24M0,12.3h24M0,14.76h24"
        stroke="#FFFFFF"
        strokeWidth="1.23"
      />
      <rect width="10" height="8.6" fill="#3C3B6E" />
      <circle cx="2" cy="1.9" r="0.6" fill="#FFFFFF" />
      <circle cx="5" cy="1.9" r="0.6" fill="#FFFFFF" />
      <circle cx="8" cy="1.9" r="0.6" fill="#FFFFFF" />
      <circle cx="3.5" cy="4.3" r="0.6" fill="#FFFFFF" />
      <circle cx="6.5" cy="4.3" r="0.6" fill="#FFFFFF" />
      <circle cx="2" cy="6.7" r="0.6" fill="#FFFFFF" />
      <circle cx="5" cy="6.7" r="0.6" fill="#FFFFFF" />
      <circle cx="8" cy="6.7" r="0.6" fill="#FFFFFF" />
    </svg>
  );
}

/** Bandeira da Espanha em SVG vetorial de alta definição */
export function FlagES({ width = 18, height = 12 }: FlagProps) {
  return (
    <svg
      viewBox="0 0 24 16"
      width={width}
      height={height}
      style={{ flexShrink: 0, borderRadius: 2, display: "block" }}
      aria-hidden="true"
    >
      <rect width="24" height="16" fill="#C60B1E" />
      <rect y="4" width="24" height="8" fill="#FFC400" />
      <rect x="4.5" y="6" width="3" height="4" rx="0.5" fill="#C60B1E" />
      <circle cx="6" cy="5.2" r="0.6" fill="#FFC400" />
    </svg>
  );
}
