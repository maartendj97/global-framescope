type IconProps = {
  className?: string;
};

const commonProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function HomeIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-5.5h4V20h3a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function EventsIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9.5h16" />
      <path d="M8 3v3.5M16 3v3.5" />
    </svg>
  );
}

export function AboutIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function BackIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="m11 5-7 7 7 7" />
      <path d="M4 12h16" />
    </svg>
  );
}

export function ExternalLinkIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M14 4h6v6" />
      <path d="M10 14 20 4" />
      <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.7-1.3-2-3.4-2 .6a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.5 2.4a7.6 7.6 0 0 0-2.6 1.5l-2-.6-2 3.4L4.6 10.5a7.6 7.6 0 0 0 0 3l-1.7 1.3 2 3.4 2-.6a7.6 7.6 0 0 0 2.6 1.5l.5 2.4h4l.5-2.4a7.6 7.6 0 0 0 2.6-1.5l2 .6 2-3.4-1.7-1.3Z" />
    </svg>
  );
}

export function BookmarkIcon({
  className,
  filled = false,
}: IconProps & { filled?: boolean }) {
  return (
    <svg
      {...commonProps}
      fill={filled ? "currentColor" : "none"}
      className={className}
      aria-hidden="true"
    >
      <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4Z" />
    </svg>
  );
}

export function ShareIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <circle cx="18" cy="5.5" r="2.25" />
      <circle cx="6" cy="12" r="2.25" />
      <circle cx="18" cy="18.5" r="2.25" />
      <path d="m8 10.8 8-3.6M8 13.2l8 3.6" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
