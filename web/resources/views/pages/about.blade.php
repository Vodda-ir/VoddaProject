@extends('layouts.app')

@section('title', 'درباره وُدّا')

@section('content')
    <section class="section-intro">
        <span class="eyebrow">درباره وُدّا</span>
        <h1>وُدّا برای منظم‌تر شدن آموزش قرآن و مداحی ساخته شده است.</h1>
        <p>
            هدف وُدّا این است که ارتباط میان قرآن‌آموز، خانواده و استاد روشن‌تر باشد؛
            از مرحله‌ی انتخاب استاد تا درخواست جلسه، پیگیری نتیجه و ادامه‌ی مسیر آموزشی.
        </p>
    </section>

    <section class="grid-two">
        <article class="card">
            <h3>برای قرآن‌آموزان و خانواده‌ها</h3>
            <ul class="stack-list">
                <li>جستجوی استاد بر اساس حوزه‌ی آموزش و سطح موردنظر</li>
                <li>درخواست جلسه و مشاهده‌ی وضعیت آن در یک مسیر مشخص</li>
                <li>ثبت امتیاز و نظر بعد از برگزاری کلاس</li>
            </ul>
        </article>
        <article class="card">
            <h3>برای استادها</h3>
            <ul class="stack-list">
                <li>معرفی تخصص، سطح آموزش و بازه‌های زمانی در دسترس</li>
                <li>دریافت و پاسخ به درخواست‌های جدید</li>
                <li>پیگیری درآمد و درخواست تسویه در همان حساب</li>
            </ul>
        </article>
    </section>

    <section class="feature-grid">
        <article class="card feature-card">
            <span class="eyebrow">گام اول</span>
            <h3>انتخاب آگاهانه</h3>
            <p class="muted">
                کاربر قبل از ثبت درخواست می‌تواند استادها را با توضیح، بازه‌ی زمانی
                و هزینه‌ی هر جلسه مقایسه کند.
            </p>
        </article>

        <article class="card feature-card">
            <span class="eyebrow">گام دوم</span>
            <h3>هماهنگی روشن</h3>
            <p class="muted">
                درخواست جلسه ثبت می‌شود و وضعیت آن تا زمان برگزاری، رد یا تأیید
                به‌صورت شفاف قابل پیگیری است.
            </p>
        </article>

        <article class="card feature-card">
            <span class="eyebrow">گام سوم</span>
            <h3>ادامه‌ی ارتباط</h3>
            <p class="muted">
                بعد از جلسه، کاربر می‌تواند نتیجه را ثبت کند و استاد نیز روند درآمد
                و برنامه‌های بعدی خود را پیگیری کند.
            </p>
        </article>
    </section>

    <section class="cta-band">
        <div>
            <span class="eyebrow">برای شروع</span>
            <h2>اگر می‌خواهید فضای وُدّا را از نزدیک ببینید، بهترین نقطه شروع فهرست اساتید است.</h2>
            <p class="muted">از همان‌جا می‌توانید مسیر آموزشی مناسب خودتان را پیدا کنید و برای جلسه بعدی تصمیم بگیرید.</p>
        </div>

        <a class="button" href="{{ route('teachers.index') }}">دیدن اساتید</a>
    </section>
@endsection
