# Persian / Farsi Humanization Rules

Use this reference whenever the text being reviewed or rewritten is primarily Persian (Farsi).

The upstream Humanizer contains many English-specific lexical signals. For Persian, treat those English word lists as examples of underlying behaviors, not literal detection rules. Apply the Persian patterns below in addition to the language-agnostic rules in the main skill.

## Objective

Make the prose sound like a competent human wrote it for the actual audience and context. Preserve facts, terminology, intent, and useful specificity. Do not deliberately add errors, slang, typos, or randomness merely to imitate a person, and do not optimize for AI-detector evasion.

## Common Persian AI-like patterns

### 1. Generic promotional clusters

Watch for repeated use of:
- «جامع»
- «هوشمند»
- «نوین»
- «قدرتمند»
- «یکپارچه»
- «منحصربه‌فرد»
- «بی‌نظیر»
- «کارآمد»
- «بهینه»
- «انعطاف‌پذیر»
- «ساده و سریع»
- «تجربه‌ای متفاوت»
- «تحولی نوین»

The problem is not any single word. The tell is unsupported abstraction and clusters of adjectives. Replace with the specific action, mechanism, or outcome already supported by the source.

### 2. Grand introductions

Watch for:
- «در دنیای امروز...»
- «در دنیای پرشتاب امروز...»
- «در عصر دیجیتال...»
- «با پیشرفت روزافزون فناوری...»
- «امروزه بیش از هر زمان دیگری...»
- «در چشم‌انداز پویای...»

Usually delete the setup and start with the actual subject.

### 3. Inflated significance

Watch for:
- «نقشی کلیدی ایفا می‌کند»
- «اهمیت ویژه‌ای دارد»
- «نقطه عطفی محسوب می‌شود»
- «گامی مهم در راستای...»
- «زمینه را برای ... فراهم می‌کند»
- «نشان‌دهنده تعهد به...»

Use these only when the source demonstrates that significance. Otherwise state what happened.

### 4. Bureaucratic verb inflation

AI Persian often drifts toward administrative prose:
- «می‌باشد» instead of «است»
- «می‌گردد» instead of «می‌شود»
- «نسبت به ... اقدام نمایید» instead of a direct verb
- «مورد استفاده قرار می‌گیرد» when «استفاده می‌شود» works
- «به عمل می‌آورد» when a direct verb exists
- «امکان ... را فراهم می‌نماید» repeated everywhere

Prefer the simplest verb that preserves meaning and register.

### 5. Translation-shaped Persian

Watch for English structures copied into Persian:
- «قدرت X را آزاد کنید» from unlock the power of X
- «کنترل X را به دست بگیرید» used as generic marketing filler
- «تجربه بدون درز/بی‌نقص» from seamless
- «در هسته خود» from at its core
- «این همان جایی است که...» repeated as a transition
- «نه تنها X، بلکه Y» used mechanically

Rewrite as native Persian built around the concrete meaning.

### 6. Mechanical triads

Persian AI copy frequently produces:
- «ساده، سریع و هوشمند»
- «دقیق، امن و قابل اعتماد»
- «مدیریت، کنترل و رشد»

Do not automatically reduce every list of three. Remove or reshape it when the symmetry is doing rhetorical work without adding information.

### 7. Repeated paragraph templates

Watch for every paragraph following:
- claim → explanation → generic benefit,
- question → answer → inspirational close,
- feature name → «به شما کمک می‌کند تا...» → benefit.

Humans usually vary emphasis based on importance. Merge low-value repetitions and let useful details take more space.

### 8. Excessive signposting

Watch for:
- «در ادامه به بررسی ... می‌پردازیم»
- «در این بخش قصد داریم...»
- «همان‌طور که پیش‌تر اشاره شد...»
- «شایان ذکر است...»
- «لازم به ذکر است...»
- «در نهایت می‌توان گفت...»
- «به طور کلی...»

Keep signposting only when it genuinely helps navigation.

### 9. Empty conclusion language

Watch for endings that merely repackage the introduction:
- «در نهایت...»
- «در مجموع...»
- «با توجه به موارد فوق...»
- «می‌توان نتیجه گرفت که...»
- «آینده‌ای روشن در انتظار...»

End on the last useful fact, implication, decision, or action instead.

### 10. Vague authorities and fake confidence

Watch for:
- «کارشناسان معتقدند...»
- «تحقیقات نشان می‌دهد...»
- «بر اساس مطالعات...»
- «بسیاری از متخصصان...»

If the source does not name the evidence, do not invent it. Remove or qualify the claim.

### 11. Over-polished emotional tone

Watch for prose that never commits, never has texture, and resolves every tension into a neat positive takeaway. When the genre allows personality, preserve real uncertainty, preference, caveats, and uneven emphasis from the author.

For technical, legal, financial, reference, or product UI text, neutrality may be exactly the right human voice. Do not inject personality where precision matters more.

## Persian rhythm and punctuation

- Vary sentence length based on content, not randomness.
- Avoid excessive «؛» and long multi-clause sentences when a period is clearer.
- Avoid em dash/en dash as rhetorical decoration in Persian prose unless the established author voice uses them.
- Do not overuse parentheses or ellipses to simulate spontaneity.
- Keep نیم‌فاصله and Persian orthography natural, but do not rewrite domain names, code, IDs, or quoted strings.

## Preserve real human signals

Prefer to keep:
- specific details,
- concrete examples,
- domain vocabulary the author naturally uses,
- mild asymmetry in paragraph length,
- genuine preferences and caveats,
- conversational phrases appropriate to the audience,
- author-specific phrasing when a writing sample establishes it.

Do not normalize everything into formal Persian.

## Persian rewrite pass

After the upstream Humanizer draft:

1. Highlight every generic adjective and abstract benefit.
2. Highlight every phrase that sounds translated from English.
3. Highlight bureaucratic verbs that can be simplified without changing register.
4. Check for repeated triads and repeated sentence templates.
5. Check that the rewrite introduced no new claims.
6. Read it aloud as Iranian Persian.
7. Restore any useful technical term or author quirk that was over-edited.
8. Return the shortest version that still preserves the information and intended voice.

## Special rule for UI and marketing copy

If the text is product UI, UX correctness outranks stylistic variation. Keep labels and terminology consistent.

If the text is marketing copy, strategic clarity and factual support outrank humanization. Do not turn a weak value proposition into casual prose; fix the proposition with the appropriate copywriting skill first, then humanize the final draft.
