import Link from "next/link";
import { RequireAdmin } from "@/components/auth/require-admin";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAdmin>
      <div className="min-h-screen bg-muted/30">
        <div className="container flex gap-6 px-4 py-6">
          <aside className="hidden w-52 shrink-0 md:block">
            <nav className="sticky top-20 flex flex-col gap-1 rounded-lg border bg-background p-2">
              <Link
                href="/"
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                بازگشت به سایت
              </Link>
              <hr className="my-1" />
              <Link
                href="/admin/teachers/pending"
                className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                اساتید در انتظار
              </Link>
              <Link
                href="/admin/withdraw-requests"
                className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                درخواست برداشت
              </Link>
            </nav>
          </aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
        <nav className="flex gap-2 border-t bg-background px-4 py-3 md:hidden">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">سایت</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/teachers/pending">اساتید در انتظار</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/withdraw-requests">درخواست برداشت</Link>
          </Button>
        </nav>
      </div>
    </RequireAdmin>
  );
}
