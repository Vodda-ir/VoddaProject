import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function BookingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">جلسات من</h1>
        <p className="text-muted-foreground">لیست جلسات رزرو شده</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>جلسات آینده</CardTitle>
          <CardDescription>جلساتی که رزرو کرده‌اید</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            هنوز جلسه‌ای رزرو نشده است. از بخش اساتید یک استاد انتخاب کنید و
            جلسه رزرو کنید.
          </p>
          <Button variant="outline" size="sm" className="mt-4">
            مشاهده اساتید
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>جلسات گذشته</CardTitle>
          <CardDescription>تاریخچه جلسات</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">موردی یافت نشد.</p>
        </CardContent>
      </Card>
    </div>
  );
}
