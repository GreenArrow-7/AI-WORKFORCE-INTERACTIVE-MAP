/**
 * Original product mark: node zero with four satellites, echoing the radial
 * composition of the map itself.
 */
export function BrandMark() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden focusable="false">
      <circle cx="9" cy="9" r="3.1" fill="currentColor" />
      <circle cx="9" cy="9" r="6.4" fill="none" stroke="currentColor" strokeOpacity={0.28} strokeWidth={1} />
      <circle cx="9" cy="2.6" r="1.5" fill="currentColor" fillOpacity={0.75} />
      <circle cx="15.4" cy="9" r="1.5" fill="currentColor" fillOpacity={0.5} />
      <circle cx="9" cy="15.4" r="1.5" fill="currentColor" fillOpacity={0.75} />
      <circle cx="2.6" cy="9" r="1.5" fill="currentColor" fillOpacity={0.5} />
    </svg>
  );
}
