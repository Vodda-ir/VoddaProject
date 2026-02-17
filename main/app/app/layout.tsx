import Link from "next/link";
import { RequireAuth } from "@/components/auth/require-auth";
import { Button } from "@/components/ui/button";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
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
                href="/app/dashboard"
                className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                داشبورد
              </Link>
              <Link
                href="/app/bookings"
                className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                جلسات
              </Link>
              <Link
                href="/app/wallet"
                className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                کیف پول
              </Link>
              <Link
                href="/app/profile"
                className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                پروفایل
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
            <Link href="/app/dashboard">داشبورد</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/app/bookings">جلسات</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/app/wallet">کیف پول</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/app/profile">پروفایل</Link>
          </Button>
        </nav>
      </div>
    </RequireAuth>
  );
}
