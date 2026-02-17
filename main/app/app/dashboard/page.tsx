import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">داشبورد</h1>
        <p className="text-muted-foreground">خوش آمدید به پنل کاربری وُدّا</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>جلسات من</CardTitle>
            <CardDescription>مشاهده و مدیریت جلسات رزرو شده</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/bookings">مشاهده جلسات</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>کیف پول</CardTitle>
            <CardDescription>موجودی و تراکنش‌ها</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/wallet">مشاهده کیف پول</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>پروفایل</CardTitle>
          <CardDescription>ویرایش اطلاعات حساب کاربری</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <Link href="/app/profile">رفتن به پروفایل</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
