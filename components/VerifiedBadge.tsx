export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label="Verified seller"
      style={{ flexShrink: 0 }}
    >
      <title>Verified seller</title>
      <path
        fill="#1d9bf0"
        d="M22.5 12.5c0-1.58-.88-2.95-2.18-3.66.54-1.4.24-3.05-.88-4.17-1.12-1.12-2.77-1.42-4.17-.88C14.58 2.5 13.2 1.62 11.62 1.62S8.67 2.5 7.96 3.8c-1.4-.54-3.05-.24-4.17.88-1.12 1.12-1.42 2.77-.88 4.17C1.61 9.55.73 10.92.73 12.5s.88 2.95 2.18 3.66c-.54 1.4-.24 3.05.88 4.17 1.12 1.12 2.77 1.42 4.17.88.71 1.3 2.09 2.18 3.66 2.18s2.95-.88 3.66-2.18c1.4.54 3.05.24 4.17-.88 1.12-1.12 1.42-2.77.88-4.17 1.3-.71 2.18-2.08 2.18-3.66z"
      />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.6 12.6l3 3 5.6-6.2"
      />
    </svg>
  );
}

export default VerifiedBadge;