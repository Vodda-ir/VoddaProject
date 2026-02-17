import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TeacherIncomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">درآمد</h1>
        <p className="text-muted-foreground">موجودی و درخواست برداشت</p>
      </div>
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>موجودی قابل برداشت</CardTitle>
          <CardDescription>اعتبار حاصل از جلسات</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">۰ تومان</p>
          <Button size="sm" className="mt-4" disabled>
            درخواست برداشت
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
