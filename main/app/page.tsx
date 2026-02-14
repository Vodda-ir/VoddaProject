import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">وُدّا</h1>
        <p className="text-lg mb-6">پلتفرم آموزش قرآن و مداحی</p>
        <nav className="flex gap-4 flex-wrap">
          <Button asChild variant="outline">
            <Link href="/about">درباره ما</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/teachers">اساتید</Link>
          </Button>
          <Button asChild>
            <Link href="/app/dashboard">ورود به پنل</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/admin/login">پنل ادمین</Link>
          </Button>
        </nav>
      </div>
    </main>
  );
}
