export function BrandMark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M8 10 L8 22 M8 10 Q12 8 16 10 Q20 8 24 10 L24 22" />
        <path d="M8 14 Q12 12 16 14 Q20 12 24 14" />
        <path d="M8 18 Q12 16 16 18 Q20 16 24 18" />
        <path d="M8 22 Q12 20 16 22 Q20 20 24 22" />
      </g>
    </svg>
  );
}
