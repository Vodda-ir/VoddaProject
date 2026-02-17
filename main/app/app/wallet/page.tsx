import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function WalletPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">کیف پول</h1>
        <p className="text-muted-foreground">موجودی و تراکنش‌ها</p>
      </div>
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>موجودی</CardTitle>
          <CardDescription>اعتبار قابل استفاده</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">۰ تومان</p>
          <Button size="sm" className="mt-4">
            شارژ کیف پول
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>تراکنش‌های اخیر</CardTitle>
          <CardDescription>تاریخچه واریز و برداشت</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">تراکنشی ثبت نشده است.</p>
        </CardContent>
      </Card>
    </div>
  );
}
