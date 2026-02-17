import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">پروفایل</h1>
        <p className="text-muted-foreground">اطلاعات حساب کاربری</p>
      </div>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>اطلاعات شخصی</CardTitle>
          <CardDescription>نام و اطلاعات تماس شما</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">نام</Label>
            <Input id="name" placeholder="نام شما" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobile">شماره موبایل</Label>
            <Input id="mobile" type="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹" disabled />
            <p className="text-xs text-muted-foreground">
              شماره موبایل پس از ثبت‌نام قابل تغییر از اینجا نیست.
            </p>
          </div>
          <Button>ذخیره تغییرات</Button>
        </CardContent>
      </Card>
    </div>
  );
}
