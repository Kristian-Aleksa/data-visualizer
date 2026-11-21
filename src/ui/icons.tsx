// Small stroke icons (24-unit grid), drawn to match the app's quiet style.
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const icon = (d: string) => () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...P}>
    <path d={d} />
  </svg>
);

export const IconPlay = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5.5v13l10-6.5z" fill="currentColor" />
  </svg>
);
export const IconPause = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
  </svg>
);
export const IconReplay = icon('M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5');
export const IconUndo = icon('M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11');
export const IconRedo = icon('m15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13');
export const IconPrev = icon('m15 18-6-6 6-6');
export const IconNext = icon('m9 18 6-6-6-6');
export const IconLink = icon('M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2');
export const IconReset = icon('M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5');
export const IconFit = icon('M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5');
export const IconPlus = icon('M12 5v14M5 12h14');
export const IconMinus = icon('M5 12h14');
export const IconTrash = icon('M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3');
export const IconDownload = icon('M12 4v11m0 0 4.5-4.5M12 15l-4.5-4.5M5 20h14');
export const IconCopy = icon('M9 9h10v11H9zM5 15V4h10');
export const IconUpload = icon('M12 20V9m0 0 4.5 4.5M12 9l-4.5 4.5M5 4h14');
export const IconGrid = icon('M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z');
export const IconHand = icon('M8 12V5.5a1.5 1.5 0 0 1 3 0V11m0-6.5V4a1.5 1.5 0 0 1 3 0v7m0-5.5a1.5 1.5 0 0 1 3 0V13m-9-1-1.6-1.6a1.6 1.6 0 0 0-2.3 2.2L9 18a5 5 0 0 0 4 2h1a5 5 0 0 0 5-5v-3');
export const IconSun = icon('M12 4V2.5M12 21.5V20M4 12H2.5M21.5 12H20M6.3 6.3 5.2 5.2M18.8 18.8l-1.1-1.1M6.3 17.7l-1.1 1.1M18.8 5.2l-1.1 1.1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z');
export const IconMoon = icon('M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z');
export const IconKeyboard = icon('M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10');
export const IconFile = icon('M6 3h8l4 4v14H6zM14 3v4h4');
