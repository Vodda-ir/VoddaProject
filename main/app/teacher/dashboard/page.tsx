import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TeacherDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">داشبورد مربی</h1>
        <p className="text-muted-foreground">خوش آمدید به پنل مربی وُدّا</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>جلسات</CardTitle>
            <CardDescription>
              جلسات رزرو شده و در انتظار تأیید
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/teacher/sessions">مشاهده جلسات</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>درآمد</CardTitle>
            <CardDescription>موجودی و درخواست برداشت</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/teacher/income">مشاهده درآمد</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>پروفایل استاد</CardTitle>
          <CardDescription>
            ویرایش پروفایل و برنامه زمانی
          </CardDescription>
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
