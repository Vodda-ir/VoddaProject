export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen p-8">
      <nav className="mb-8 flex gap-4">
        <a href="/admin/login">ورود</a>
        <a href="/admin/teachers/pending">اساتید در انتظار</a>
        <a href="/admin/withdraw-requests">درخواست برداشت</a>
      </nav>
      {children}
    </div>
  );
}
