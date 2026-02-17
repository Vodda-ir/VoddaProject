import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function WithdrawRequestsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          درخواست‌های برداشت
        </h1>
        <p className="text-muted-foreground">
          لیست درخواست‌های برداشت اساتید
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>درخواست‌های در انتظار</CardTitle>
          <CardDescription>
            درخواست‌هایی که هنوز پردازش نشده‌اند
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            درخواست برداشتی ثبت نشده است.
          </p>
          <div className="mt-4 flex gap-2">
            <Button size="sm" disabled>
              تأیید پرداخت
            </Button>
            <Button size="sm" variant="outline" disabled>
              رد
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
