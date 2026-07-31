import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { size?: number };

function IconBase({ size = 20, children, ...props }: Props & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export const HomeIcon = (p: Props) => <IconBase {...p}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></IconBase>;
export const CalendarIcon = (p: Props) => <IconBase {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></IconBase>;
export const UsersIcon = (p: Props) => <IconBase {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></IconBase>;
export const LayersIcon = (p: Props) => <IconBase {...p}><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></IconBase>;
export const ClipboardIcon = (p: Props) => <IconBase {...p}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h4"/></IconBase>;
export const VideoIcon = (p: Props) => <IconBase {...p}><rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-2v8l-4-2"/></IconBase>;
export const SparklesIcon = (p: Props) => <IconBase {...p}><path d="m12 3-1.2 3.3L7.5 7.5l3.3 1.2L12 12l1.2-3.3 3.3-1.2-3.3-1.2L12 3Z"/><path d="m19 13-.8 2.2L16 16l2.2.8L19 19l.8-2.2L22 16l-2.2-.8L19 13ZM5 13l-.8 2.2L2 16l2.2.8L5 19l.8-2.2L8 16l-2.2-.8L5 13Z"/></IconBase>;
export const FolderIcon = (p: Props) => <IconBase {...p}><path d="M3 5h6l2 2h10v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Z"/></IconBase>;
export const SettingsIcon = (p: Props) => <IconBase {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06-2.12 2.12-.06-.06a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.65V20.5h-3v-.11a1.8 1.8 0 0 0-1.1-1.65 1.8 1.8 0 0 0-1.98.36l-.06.06-2.12-2.12.06-.06A1.8 1.8 0 0 0 6.6 15a1.8 1.8 0 0 0-1.65-1.1H4.5v-3h.45A1.8 1.8 0 0 0 6.6 9a1.8 1.8 0 0 0-.36-1.98l-.06-.06 2.12-2.12.06.06A1.8 1.8 0 0 0 10.34 5a1.8 1.8 0 0 0 1.1-1.65V3.5h3v-.15A1.8 1.8 0 0 0 15.54 5a1.8 1.8 0 0 0 1.98-.36l.06-.06 2.12 2.12-.06.06A1.8 1.8 0 0 0 19.4 9a1.8 1.8 0 0 0 1.65 1.1h.45v3h-.45A1.8 1.8 0 0 0 19.4 15Z"/></IconBase>;
export const SearchIcon = (p: Props) => <IconBase {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></IconBase>;
export const BellIcon = (p: Props) => <IconBase {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></IconBase>;
export const PlusIcon = (p: Props) => <IconBase {...p}><path d="M12 5v14M5 12h14"/></IconBase>;
export const ArrowIcon = (p: Props) => <IconBase {...p}><path d="M5 12h14M13 6l6 6-6 6"/></IconBase>;
export const CheckIcon = (p: Props) => <IconBase {...p}><path d="m5 12 4 4L19 6"/></IconBase>;
export const ClockIcon = (p: Props) => <IconBase {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></IconBase>;
export const MoreIcon = (p: Props) => <IconBase {...p}><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></IconBase>;
export const TrendIcon = (p: Props) => <IconBase {...p}><path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/></IconBase>;
export const MenuIcon = (p: Props) => <IconBase {...p}><path d="M4 7h16M4 12h16M4 17h16"/></IconBase>;
export const CloseIcon = (p: Props) => <IconBase {...p}><path d="m6 6 12 12M18 6 6 18"/></IconBase>;
export const FileIcon = (p: Props) => <IconBase {...p}><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5"/></IconBase>;
export const PortalIcon = (p: Props) => <IconBase {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 20V9M12 13h5M12 16h3"/></IconBase>;
export const UploadIcon = (p: Props) => <IconBase {...p}><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/></IconBase>;
