@extends('layouts.app')

@section('title', 'وُدّا | آموزش قرآن و مداحی')

@section('content')
    <section class="hero">
        <div class="hero__content">
            <span class="eyebrow">Laravel 13 + Livewire + SQLite</span>
            <h1>پلتفرم رزرو و مدیریت جلسات آموزش قرآن و مداحی</h1>
            <p>
                نسخه‌ی جدید وُدّا به‌صورت یکپارچه روی Laravel 13 بازسازی شده است؛
                بدون Docker، با دیتابیس پیش‌فرض SQLite و رابط Blade/Livewire برای اجرای سریع‌تر و نگه‌داری ساده‌تر.
            </p>
            <div class="hero__actions">
                <a class="button" href="{{ route('teachers.index') }}">مشاهده اساتید</a>
                <a class="button button--ghost" href="{{ route('login') }}">ورود به پنل</a>
            </div>
        </div>
        <div class="hero__panel">
            <div class="card card--accent">
                <h3>جریان‌های MVP</h3>
                <ul class="stack-list">
                    <li>ورود با OTP و مدیریت نقش فعال</li>
                    <li>پروفایل استاد و تأیید توسط ادمین</li>
                    <li>رزرو، پذیرش، پایان جلسه و تسویه</li>
                    <li>کیف پول، برداشت، امتیاز و اعلان</li>
                </ul>
            </div>
        </div>
    </section>

    <section class="stats-grid">
        <article class="card stat-card">
            <span class="stat-card__label">استک جدید</span>
            <strong>PHP 8.3+</strong>
            <p>هم بک‌اند و هم فرانت وب داخل یک اپ Laravel.</p>
        </article>
        <article class="card stat-card">
            <span class="stat-card__label">دیتابیس پیش‌فرض</span>
            <strong>SQLite</strong>
            <p>راه‌اندازی محلی با `php artisan migrate --seed`.</p>
        </article>
        <article class="card stat-card">
            <span class="stat-card__label">UI</span>
            <strong>Blade + Livewire</strong>
            <p>بدون نیاز اجباری به SPA و لایه‌ی API جدا برای وب.</p>
        </article>
    </section>
@endsection
