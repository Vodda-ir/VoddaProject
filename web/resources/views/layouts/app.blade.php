<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $title ?? trim($__env->yieldContent('title')) ?: config('app.name', 'Vodda') }}</title>
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">
    @livewireStyles
</head>
<body>
@php($viewer = auth()->user()?->fresh('roles'))

<header class="site-header">
    <div class="site-header__inner">
        <a class="brand" href="{{ route('home') }}">
            <span class="brand__dot"></span>
            وُدّا
        </a>

        <nav class="site-nav">
            <a class="{{ request()->routeIs('home') ? 'is-active' : '' }}" href="{{ route('home') }}">خانه</a>
            <a class="{{ request()->routeIs('about') ? 'is-active' : '' }}" href="{{ route('about') }}">درباره ما</a>
            <a class="{{ request()->routeIs('teachers.*') ? 'is-active' : '' }}" href="{{ route('teachers.index') }}">اساتید</a>
            @auth
                <a class="{{ request()->routeIs('app.*') ? 'is-active' : '' }}" href="{{ route('app.dashboard') }}">پنل کاربر</a>
                @if($viewer?->hasRole('teacher'))
                    <a class="{{ request()->routeIs('teacher.*') ? 'is-active' : '' }}" href="{{ route('teacher.dashboard') }}">پنل استاد</a>
                @endif
                @if($viewer?->hasRole('admin'))
                    <a class="{{ request()->routeIs('admin.*') ? 'is-active' : '' }}" href="{{ route('admin.teachers.pending') }}">ادمین</a>
                @endif
            @endauth
        </nav>

        <div class="header-actions">
            @auth
                <div class="role-pills">
                    @foreach($viewer?->roleNames() ?? [] as $role)
                        <form method="post" action="{{ route('role.switch') }}">
                            @csrf
                            <input type="hidden" name="role" value="{{ $role }}">
                            <button class="pill {{ $viewer?->active_role === $role ? 'pill--active' : '' }}" type="submit">
                                @if($role === 'learner') قرآن‌آموز @endif
                                @if($role === 'teacher') استاد @endif
                                @if($role === 'admin') ادمین @endif
                            </button>
                        </form>
                    @endforeach
                </div>

                <a class="button button--ghost" href="{{ route('app.profile') }}">
                    {{ $viewer?->name ?: $viewer?->mobile }}
                </a>

                <form method="post" action="{{ route('logout') }}">
                    @csrf
                    <button class="button button--ghost" type="submit">خروج</button>
                </form>
            @else
                <a class="button" href="{{ route('login') }}">ورود با OTP</a>
            @endauth
        </div>
    </div>
</header>

<main class="page-shell">
    @if(session('status'))
        <div class="flash flash--success">{{ session('status') }}</div>
    @endif

    @if($errors->has('app'))
        <div class="flash flash--error">{{ $errors->first('app') }}</div>
    @endif

    {{ $slot ?? '' }}
    @yield('content')
</main>

@livewireScripts
</body>
</html>
