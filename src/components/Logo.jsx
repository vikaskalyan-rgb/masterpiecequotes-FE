export default function Logo({ size = 32 }) {
  return <img src="/logo-mark.png" alt="" width={size} height={Math.round(size * 1.027)} style={{ display: 'block' }} />
}
