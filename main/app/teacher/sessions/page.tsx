import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TeacherSessionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">جلسات</h1>
        <p className="text-muted-foreground">
          جلسات رزرو شده و در انتظار تأیید
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>جلسات آینده</CardTitle>
          <CardDescription>رزروهای تأیید شده</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">جلسه‌ای ثبت نشده است.</p>
        </CardContent>
      </Card>
    </div>
  );
}
