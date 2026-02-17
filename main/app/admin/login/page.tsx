import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>ورود به پنل ادمین</CardTitle>
          <CardDescription>
            برای ورود به پنل مدیریت از دکمه «ورود» در بالای صفحه استفاده
            کنید. پس از ورود با حساب دارای نقش ادمین، به این بخش دسترسی خواهید
            داشت.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/">بازگشت به صفحه اصلی</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
