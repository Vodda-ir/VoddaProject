<?php

return [
    'otp' => [
        'stub_code' => env('VODDA_OTP_STUB_CODE', '12345'),
        'expires_in_minutes' => (int) env('VODDA_OTP_EXPIRES_IN', 2),
    ],
    'commission_percent' => (int) env('VODDA_PLATFORM_COMMISSION_PERCENT', 10),
    'demo' => [
        'admin_mobile' => env('VODDA_DEMO_ADMIN_MOBILE', '09136336002'),
        'teacher_mobile' => env('VODDA_DEMO_TEACHER_MOBILE', '09135550011'),
        'learner_mobile' => env('VODDA_DEMO_LEARNER_MOBILE', '09914932678'),
    ],
];
