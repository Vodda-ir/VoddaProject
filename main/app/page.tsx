import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="container px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            وُدّا
          </h1>
          <p className="mt-4 text-xl text-muted-foreground">
            پلتفرم آموزش قرآن و مداحی
          </p>
          <blockquote className="mt-8 rounded-lg border bg-muted/50 p-6 text-lg italic leading-relaxed text-foreground">
            وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا
            <footer className="mt-2 text-base not-italic text-muted-foreground">
              — سوره مزّمّل، آیه ۴
            </footer>
          </blockquote>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/app/dashboard">ورود به پنل</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/teachers">مشاهده اساتید</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30 py-16">
        <div className="container px-4">
          <h2 className="text-center text-2xl font-semibold mb-10">
            چرا وُدّا؟
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>اساتید مجرب</CardTitle>
                <CardDescription>
                  آموزش با مربیان و اساتید تأیید‌شده قرآن و مداحی
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>جلسات آنلاین</CardTitle>
                <CardDescription>
                  برگزاری جلسات تصویری و صوتی در یک پلتفرم امن
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>کیف پول و پرداخت</CardTitle>
                <CardDescription>
                  واریز و برداشت امن با پیگیری تراکنش‌ها
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <section className="container px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-muted-foreground">
            همین حالا با اساتید قرآن و مداحی آشنا شوید یا وارد پنل کاربری خود
            شوید.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Button asChild variant="outline">
              <Link href="/about">درباره ما</Link>
            </Button>
            <Button asChild>
              <Link href="/teachers">لیست اساتید</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
