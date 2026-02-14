import Link from "next/link";

export default function TeachersPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">لیست اساتید</h1>
        <p className="text-lg mb-6">اساتید تأیید شده در پلتفرم</p>
        <Link href="/" className="text-blue-600 hover:underline">
          بازگشت
        </Link>
      </div>
    </main>
  );
}
