# Persian / Farsi UX Writing Rules

Use this reference for Persian product interfaces, dashboards, mobile apps, forms, onboarding, settings, notifications, and transactional states.

## Primary rule

Write for the user's immediate task. Persian UX copy should feel like part of the interface, not like advertising pasted into the interface.

## Default voice

- Clear, calm, concise, professional.
- Prefer familiar Iranian Persian words over formal administrative language.
- Keep terminology stable across screens.
- Avoid excessive politeness that makes actions longer or less clear.
- Do not add jokes or playful language to stressful states unless the established brand voice and context support it.

## Buttons and actions

Name the result whenever the consequence matters.

Prefer:
- «ذخیره تغییرات» over «تأیید»
- «حذف فاکتور» over «حذف» when multiple objects are visible
- «ارسال کد» over «ادامه»
- «ورود به حساب» over «ثبت»
- «دانلود گزارش» over «دریافت» when the action downloads a file

Short generic labels are acceptable when context is unmistakable and space is constrained.

## Forms

- Use a persistent visible label; placeholder is an example, not a label.
- Put formatting guidance near the field that needs it.
- Do not tell users obvious things such as «لطفاً نام خود را وارد نمایید» when the label is already «نام».
- Avoid «می‌باشد»، «می‌گردد»، «فرمایید»، «نمایید» unless a formal government/legal product explicitly requires that register.
- Use «وارد کنید»، «انتخاب کنید»، «بنویسید» for normal product copy.

## Errors

An error should answer, when possible:

1. What happened?
2. Why, if useful and known?
3. What can the user do next?

Bad:
> خطایی رخ داد.

Better:
> فاکتور ذخیره نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.

Bad:
> ورودی نامعتبر است.

Better:
> شماره موبایل باید ۱۱ رقم باشد.

Never expose backend jargon, stack traces, raw status codes, database terms, or implementation details unless the user is an admin/developer and the UI is intentionally technical.

## Empty states

State the condition and next useful action.

Bad:
> داده‌ای وجود ندارد.

Better:
> هنوز مشتری‌ای ثبت نکرده‌اید.
> «افزودن مشتری»

Do not turn every empty state into marketing copy. The user is trying to act.

## Success states

Confirm the actual result. Add a next step only when useful.

Examples:
- «فاکتور ذخیره شد.»
- «مشتری اضافه شد.»
- «نسخه پشتیبان آماده شد.»

Avoid exaggerated celebration for routine actions.

## Loading and progress

Name the work if delay is noticeable:
- «در حال ساخت گزارش...»
- «در حال بارگذاری تراکنش‌ها...»

Do not use vague «لطفاً صبر کنید» when the system can say what it is doing.

## Destructive actions

Confirmation copy must name the object and consequence.

Prefer:
> این فاکتور حذف شود؟ این کار قابل بازگشت نیست.
>
> «حذف فاکتور» / «انصراف»

Avoid confusing yes/no buttons when the question contains a negative.

## Authentication and OTP

- Say where the code was sent when safe and useful.
- Distinguish between «ارسال مجدد کد»، «تغییر شماره»، and «ورود».
- For timers, show the actual state rather than generic prose.
- Do not imply SMS delivery success unless the backend confirms it.

## Financial and business UI

For accounting, invoicing, tax, payroll, CRM, or business software:

- Prefer exact domain terms users already know.
- Do not simplify a term if simplification changes accounting/legal meaning.
- Distinguish «دریافت» from «درآمد», «پرداخت» from «هزینه», etc., when the product model distinguishes them.
- Show currency, date, and sign conventions consistently.
- Destructive or financial actions need higher specificity and lower playfulness.

## RTL and implementation notes

Copy decisions must survive RTL UI implementation:

- Avoid strings that depend on English left/right wording unless the physical direction is actually required.
- Keep mixed Persian/English strings readable; isolate code, IDs, domain names, and numbers in components where needed.
- Expect Persian strings to differ in width from English; do not write only to fit an arbitrary English-sized button.
- Do not concatenate sentence fragments in code when word order may change. Prefer complete localized strings with variables.

## Natural Persian anti-patterns

Avoid:
- «عملیات با موفقیت انجام شد» when the action can be named.
- «کاربر گرامی» in normal SaaS UI.
- «خواهشمند است» in routine product instructions.
- «لطفاً نسبت به ... اقدام نمایید».
- «اطلاعات مورد نظر» when the field/data can be named.
- «خطای غیرمنتظره» without a recovery action.
- «آیا مطمئن هستید؟» without naming what will happen.
- repeated «لطفاً» on every validation message.
- marketing adjectives inside functional controls and settings.

## Final Persian UX checklist

- Can the user predict each button's result?
- Are labels stable across pages?
- Does each error offer a realistic next step?
- Are empty states actionable when an action exists?
- Are destructive/financial consequences explicit?
- Is the Persian natural rather than bureaucratic?
- Does the copy fit the user's stress level?
- Are mixed RTL/LTR tokens implementable?
- Did we avoid placeholders as labels?
- Are there any generic strings that can be replaced with the actual object/action?

If the `humanizer` skill is available, use it only after UX correctness is established. Do not let stylistic humanization make labels less consistent or error messages less precise.
