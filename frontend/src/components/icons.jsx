/* Small, consistent line-icon set used across the sidebar and dashboard.
   Single family (rounded stroke, 1.8px, currentColor) so every icon reads
   as part of the same system rather than mixed styles. */

function Svg({ size = 18, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconGraduationCap = (p) => (
  <Svg {...p}>
    <path d="M2 9.5 12 4l10 5.5-10 5.5-10-5.5Z" />
    <path d="M6.5 11.8v4.4c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3v-4.4" />
    <path d="M22 9.5v6" />
  </Svg>
);

export const IconHome = (p) => (
  <Svg {...p}>
    <path d="M3.5 11 12 4.5 20.5 11" />
    <path d="M5.5 9.8V19a1 1 0 0 0 1 1H10v-5.5h4V20h3.5a1 1 0 0 0 1-1V9.8" />
  </Svg>
);

export const IconBook = (p) => (
  <Svg {...p}>
    <path d="M4.5 5.2A2.2 2.2 0 0 1 6.7 3H19.5v15.3H6.7a2.2 2.2 0 0 0-2.2 2.2V5.2Z" />
    <path d="M4.5 18.5A2.2 2.2 0 0 1 6.7 16.3h12.8" />
  </Svg>
);

export const IconGrid = (p) => (
  <Svg {...p}>
    <rect x="3.2" y="3.2" width="7.2" height="7.2" rx="1.6" />
    <rect x="13.6" y="3.2" width="7.2" height="7.2" rx="1.6" />
    <rect x="3.2" y="13.6" width="7.2" height="7.2" rx="1.6" />
    <rect x="13.6" y="13.6" width="7.2" height="7.2" rx="1.6" />
  </Svg>
);

export const IconCheckSquare = (p) => (
  <Svg {...p}>
    <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="3.2" />
    <path d="M7.8 12.3 10.4 15 16.3 9" />
  </Svg>
);

export const IconCalendar = (p) => (
  <Svg {...p}>
    <rect x="3.2" y="4.6" width="17.6" height="15.8" rx="2.2" />
    <path d="M8 3v3.4M16 3v3.4M3.2 9.6h17.6" />
  </Svg>
);

export const IconLandmark = (p) => (
  <Svg {...p}>
    <path d="M3 20.5h18" />
    <path d="M5 20.5V11M9.4 20.5V11M14.6 20.5V11M19 20.5V11" />
    <path d="M3 11 12 4.5 21 11Z" />
  </Svg>
);

export const IconBell = (p) => (
  <Svg {...p}>
    <path d="M6.2 8.4a5.8 5.8 0 1 1 11.6 0c0 4.1 1.5 5.6 1.5 5.6H4.7S6.2 12.5 6.2 8.4Z" />
    <path d="M9.7 17.2a2.3 2.3 0 0 0 4.6 0" />
  </Svg>
);

export const IconSparkles = (p) => (
  <Svg {...p}>
    <path d="M12 3.2 13.4 7.6 17.8 9 13.4 10.4 12 14.8 10.6 10.4 6.2 9 10.6 7.6 12 3.2Z" />
    <path d="M19 14.5 19.7 16.6 21.8 17.3 19.7 18 19 20.1 18.3 18 16.2 17.3 18.3 16.6 19 14.5Z" />
  </Svg>
);

export const IconUserCircle = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="10.2" r="3.2" />
    <path d="M6 18.5a6.3 6.3 0 0 1 12 0" />
  </Svg>
);

export const IconRobot = (p) => (
  <Svg {...p}>
    <rect x="4.8" y="8.2" width="14.4" height="10.6" rx="3.2" />
    <circle cx="9.1" cy="13.4" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="14.9" cy="13.4" r="1.15" fill="currentColor" stroke="none" />
    <path d="M12 8.2V5.1M9.2 5.1h5.6" />
  </Svg>
);

export const IconUsers = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8.2" r="3" />
    <path d="M3.3 20c0-3.3 2.6-6 5.7-6s5.7 2.7 5.7 6" />
    <circle cx="17.3" cy="9.1" r="2.3" />
    <path d="M15.9 14.2c2.3.5 4.1 2.6 4.1 5.8" />
  </Svg>
);

export const IconXCircle = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.8" />
    <path d="M9.3 9.3l5.4 5.4M14.7 9.3l-5.4 5.4" />
  </Svg>
);

export const IconClipboardList = (p) => (
  <Svg {...p}>
    <rect x="5.8" y="3.8" width="12.4" height="17.4" rx="2.2" />
    <path d="M9 3.8V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.8" />
    <path d="M9 10.4h6M9 13.6h6M9 16.8h3.6" />
  </Svg>
);

export const IconBan = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.8" />
    <path d="M6.4 6.4l11.2 11.2" />
  </Svg>
);

export const IconTarget = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.2" />
    <circle cx="12" cy="12" r="4.3" />
    <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconCalendarPlus = (p) => (
  <Svg {...p}>
    <rect x="3.2" y="4.6" width="17.6" height="15.8" rx="2.2" />
    <path d="M8 3v3.4M16 3v3.4M3.2 9.6h17.6" />
    <path d="M12 12.6v4.4M9.8 14.8h4.4" />
  </Svg>
);

export const IconArrowRight = (p) => (
  <Svg {...p}>
    <path d="M4.5 12h15M13 6.5 18.5 12 13 17.5" />
  </Svg>
);

export const IconMenu = (p) => (
  <Svg {...p}>
    <path d="M4 6.5h16M4 12h16M4 17.5h16" />
  </Svg>
);

export const IconX = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const IconSettings = (p) => (
  <Svg {...p}>
    <path d="M18.94 10.52 20.8 10.13 20.8 13.87 18.94 13.48A7.1 7.1 0 0 1 17.95 15.87L19.55 16.9 16.9 19.55 15.87 17.95A7.1 7.1 0 0 1 13.48 18.94L13.87 20.8 10.13 20.8 10.52 18.94A7.1 7.1 0 0 1 8.13 17.95L7.1 19.55 4.45 16.9 6.05 15.87A7.1 7.1 0 0 1 5.06 13.48L3.2 13.87 3.2 10.13 5.06 10.52A7.1 7.1 0 0 1 6.05 8.13L4.45 7.1 7.1 4.45 8.13 6.05A7.1 7.1 0 0 1 10.52 5.06L10.13 3.2 13.87 3.2 13.48 5.06A7.1 7.1 0 0 1 15.87 6.05L16.9 4.45 19.55 7.1 17.95 8.13A7.1 7.1 0 0 1 18.94 10.52Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);

export const IconSun = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7" />
  </Svg>
);

export const IconMoon = (p) => (
  <Svg {...p}>
    <path d="M20 14.2a8.2 8.2 0 0 1-10.4-10A8.3 8.3 0 1 0 20 14.2Z" />
  </Svg>
);
