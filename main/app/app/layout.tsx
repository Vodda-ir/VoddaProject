export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen p-8">
      <nav className="mb-8 flex gap-4">
        <a href="/app/dashboard">داشبورد</a>
        <a href="/app/bookings">جلسات</a>
        <a href="/app/wallet">کیف پول</a>
        <a href="/app/profile">پروفایل</a>
      </nav>
      {children}
    </div>
  );
}
