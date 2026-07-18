export default function Loading() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sand-50)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          border: '3px solid var(--sand-200)', borderTopColor: 'var(--olive-600)',
          animation: 'vodda-spin .7s linear infinite',
        }} />
        <span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 600 }}>در حال بارگذاری…</span>
      </div>
      <style>{`@keyframes vodda-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
