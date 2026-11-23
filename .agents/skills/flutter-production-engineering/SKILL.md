---
name: flutter-production-engineering
description: Production Flutter engineering guidance aligned with the official Flutter Agent Skills. Use when designing, implementing, reviewing, or refactoring Flutter features, architecture, navigation, responsive UI, API integration, serialization, localization, or tests.
metadata:
  source: flutter/agent-plugins
  source_commit: 66b6d25a38a4bd2affc8f125562330c41bd46555
  curated: true
  curated_date: 2026-08-17
---

# Flutter Production Engineering

Apply these rules when working on production Flutter code. Respect an existing project architecture when it is coherent; improve it incrementally rather than forcing a rewrite.

## 1. Architecture

Prefer a feature-oriented layered structure. Keep UI, application/state logic, and data access separable.

Typical shape:

```text
lib/
  core/
  features/
    auth/
      data/
      domain/
      presentation/
```

Rules:
- Widgets render state and emit user intent; avoid embedding business rules in widgets.
- Put orchestration/state transitions in controllers, view models, notifiers, blocs, or the project's established equivalent.
- Put remote/local persistence behind repositories or data sources.
- Keep domain models independent from Flutter UI where practical.
- Prefer immutable state and explicit state transitions.
- Use dependency injection through constructors/providers instead of hidden global mutable state.
- Do not introduce a new state-management package when the project already has a coherent one.
- Keep feature boundaries explicit; avoid a generic `utils/` dumping ground.

## 2. Routing and navigation

For non-trivial apps prefer declarative routing such as `go_router` and `MaterialApp.router`.

- Model URLs/routes explicitly, including path/query parameters.
- Centralize auth/permission redirects.
- Use `ShellRoute` or `StatefulShellRoute` for persistent shells such as bottom navigation or desktop sidebars.
- Preserve branch state when product UX expects it.
- Treat deep links and browser history as first-class behavior for Flutter web.
- Prefer named/typed route helpers over duplicated raw path strings.

## 3. Responsive/adaptive UI

- Use constraints, not device-name checks, as the primary layout signal.
- Prefer `LayoutBuilder`, `MediaQuery`, `Expanded`, `Flexible`, `Wrap`, grids, and adaptive breakpoints.
- Avoid hard-coded widths/heights when content or form factor can vary.
- Test narrow phone, large phone/tablet, and desktop widths for responsive screens.
- Prevent unbounded constraints and nested-scroll mistakes.
- Preserve accessibility text scaling; do not fix overflow by disabling scaling.

## 4. Layout debugging

For `RenderFlex overflowed`, unbounded viewport, or constraint errors:
1. Identify the first widget receiving invalid constraints.
2. Inspect parent/child constraint flow before adding scroll views.
3. Use `Expanded/Flexible` only inside compatible Flex parents.
4. Avoid `ListView`/scrollable inside an unconstrained axis unless explicitly constrained.
5. Prefer fixing the layout contract over hiding overflow with clipping.

## 5. API and data

- Keep HTTP/network code outside widgets.
- Reuse the project's API client; do not scatter raw requests across features.
- Define request/response DTOs and map them intentionally.
- Check status codes and convert transport failures to typed/domain-meaningful failures.
- Support cancellation/timeouts where the client stack allows it.
- Do not log secrets, auth tokens, OTPs, or sensitive payloads.
- Parse large payloads away from UI-critical work when profiling shows frame impact.

## 6. JSON serialization

- Keep `fromJson`/`toJson` or generated serialization close to DTO/model ownership.
- Validate runtime types instead of relying on unchecked `dynamic` casts.
- Prefer code generation when the project already uses it; do not mix manual and generated conventions arbitrarily.
- Add round-trip/unit coverage for important serialization contracts.

## 7. Localization

Use Flutter's localization pipeline consistently.

- Keep user-visible strings out of business logic and widgets when localization is enabled.
- Use ARB/generated localization APIs rather than hand-built language maps unless the project explicitly chose otherwise.
- Preserve placeholders, pluralization, number/date formatting, RTL/LTR behavior, and semantic labels.
- Treat Persian/Arabic RTL as a layout requirement, not just translated text.

## 8. Testing

Use the smallest useful test layer:
- Unit test: pure logic, controllers, parsers, repositories with fakes/mocks.
- Widget test: rendering, state presentation, interaction, validation.
- Integration test: critical user journeys and platform integration.

Testing rules:
- Use stable keys only where they materially improve targeting.
- Prefer user-visible finders where stable.
- Avoid arbitrary sleeps; pump/wait for the condition or frame lifecycle.
- Cover loading, success, empty, error, and permission/auth states for important screens.

## 9. Code quality

- Follow `analysis_options.yaml` and existing lints.
- Prefer small composable widgets over giant build methods.
- Use `const` when it improves allocation/readability without ceremony.
- Dispose controllers/subscriptions/resources deterministically.
- Check `context.mounted` after async gaps before using `BuildContext`.
- Do not suppress analyzer warnings without a documented reason.

## 10. Agent workflow

Before editing:
1. Inspect the feature's existing architecture and state-management convention.
2. Locate routing, API-client, theme, localization, and error-handling conventions.
3. Reuse existing abstractions before adding dependencies.

While editing:
1. Make the smallest coherent change.
2. Keep feature boundaries intact.
3. Update tests when behavior changes.
4. Avoid unrelated formatting/refactors.

After editing:
1. Re-check analyzer/lint-sensitive code paths.
2. Verify navigation/state/error/loading behavior conceptually or with project-approved checks.
3. Summarize architectural decisions and any follow-up risk.

## Upstream alignment

This curated skill is aligned to the official Flutter Agent Plugins repository at commit `66b6d25a38a4bd2affc8f125562330c41bd46555`, including its architecture, responsive layout, declarative routing, layout debugging, JSON serialization, localization, HTTP, widget-test, and integration-test guidance.
