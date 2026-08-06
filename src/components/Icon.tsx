interface IconProps {
  d: string;
  size?: number;
  style?: React.CSSProperties;
}

export function Icon({ d, size = 14, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      style={{ flex: 'none', ...style }}
    >
      <path d={d} />
    </svg>
  );
}
