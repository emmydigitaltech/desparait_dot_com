export default function Splash({ overlay = false, size = 72 }: { overlay?: boolean; size?: number }) {
  return (
    <div className={`dp-splash${overlay ? " dp-splash--overlay" : ""}`} role="status" aria-label="Loading">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" width={size} height={size} />
    </div>
  );
}