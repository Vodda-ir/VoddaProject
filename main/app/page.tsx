import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">وُدّا</h1>
        <p className="text-lg mb-6">پلتفرم آموزش قرآن و مداحی</p>
        <nav className="flex gap-4">
          <Link href="/about" className="text-blue-600 hover:underline">
            درباره ما
          </Link>
          <Link href="/teachers" className="text-blue-600 hover:underline">
            اساتید
          </Link>
          <Link href="/app/dashboard" className="text-blue-600 hover:underline">
            ورود به پنل
          </Link>
          <Link href="/admin/login" className="text-blue-600 hover:underline">
            پنل ادمین
          </Link>
        </nav>
      </div>
    </main>
  );
}
