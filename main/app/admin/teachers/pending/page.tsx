import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PendingTeachersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          اساتید در انتظار تأیید
        </h1>
        <p className="text-muted-foreground">
          لیست پروفایل‌های در انتظار بررسی و تأیید
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>درخواست‌های جدید</CardTitle>
          <CardDescription>
            اساتیدی که پروفایل خود را ثبت کرده و در انتظار تأیید هستند
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            در حال حاضر درخواستی در صف تأیید نیست.
          </p>
          <div className="mt-4 flex gap-2">
            <Button size="sm" disabled>
              تأیید
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
