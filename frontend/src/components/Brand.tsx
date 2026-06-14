export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center gap-2 font-extrabold text-olive-700"
      style={{ fontSize: size, letterSpacing: '-.5px' }}
    >
      وُدّا
      <span className="inline-block rounded-full bg-gold" style={{ width: 9, height: 9, marginBottom: size * 0.45 }} />
    </span>
  );
}

export function Button({
  children,
  variant = 'primary',
  href,
  className = '',
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'ghost' | 'gold' | 'soft';
  href?: string;
  className?: string;
}) {
  const variants: Record<string, string> = {
    primary: 'bg-olive-600 text-white shadow-olive hover:bg-olive-700',
    gold: 'bg-gold text-white hover:brightness-105',
    soft: 'bg-olive-100 text-olive-700 hover:bg-olive-200',
    ghost: 'bg-transparent text-olive-700 ring-1 ring-inset ring-olive-200 hover:bg-olive-50',
  };
  const cls = `inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition ${variants[variant]} ${className}`;
  if (href) return <a href={href} className={cls}>{children}</a>;
  return <button className={cls}>{children}</button>;
}
