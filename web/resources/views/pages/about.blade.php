@extends('layouts.app')

@section('title', 'درباره وُدّا')

@section('content')
    <section class="section-intro">
        <span class="eyebrow">بازطراحی معماری</span>
        <h1>چرا این پروژه به Laravel monolith تبدیل شد؟</h1>
        <p>
            نسخه‌ی قبلی وُدّا از Go، Next.js، Flutter و Docker استفاده می‌کرد. در این بازطراحی، پروژه برای توسعه و اجرای سریع‌تر
            به یک اپ Laravel 13 با Blade/Livewire منتقل شده تا منطق دامنه و UI در یک کدبیس واحد قابل نگه‌داری باشد.
        </p>
    </section>

    <section class="grid-two">
        <article class="card">
            <h3>مزیت‌های ساختار جدید</h3>
            <ul class="stack-list">
                <li>یک نقطه‌ی ورود برای بک‌اند، پنل کاربر، پنل استاد و پنل ادمین</li>
                <li>اجرای محلی ساده با PHP و SQLite بدون Docker</li>
                <li>همخوانی کامل‌تر بین مدل‌های دامنه و صفحه‌های مدیریتی</li>
            </ul>
        </article>
        <article class="card">
            <h3>قابلیت‌های فعلی</h3>
            <ul class="stack-list">
                <li>OTP آزمایشی، نقش‌های learner/teacher/admin</li>
                <li>رزرو جلسه، تسویه کیف پول، ثبت امتیاز و اعلان</li>
                <li>مدیریت تأیید استاد و پردازش برداشت در پنل ادمین</li>
            </ul>
        </article>
    </section>
@endsection
