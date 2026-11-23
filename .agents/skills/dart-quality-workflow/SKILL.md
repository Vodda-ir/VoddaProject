---
name: dart-quality-workflow
description: Dart code-quality workflow aligned with official dart-lang agent skills. Use for analysis, fixes, tests, dependency conflicts, modern Dart patterns, and safe refactoring in Dart or Flutter projects.
metadata:
  source: dart-lang/skills
  source_commit: 58b8343914d35a9c6d5f32077190a1f52fb02591
  curated: true
  curated_date: 2026-08-17
---

# Dart Quality Workflow

Use the repository's existing SDK constraints and lint configuration as the source of truth.

## Static analysis

- Run or reason from `dart analyze` / `flutter analyze` as appropriate.
- Prefer fixing root causes over ignores.
- Use `dart fix --apply` only for mechanical fixes that match project intent; review the resulting diff.
- Format touched Dart files with the project's standard formatter.

## Tests

- Add focused unit tests for new pure logic and regressions.
- Keep tests deterministic and independent from network/time/global state when possible.
- Prefer fakes for simple collaborators; use generated mocks when the project already standardizes on them.
- Name tests by behavior, not implementation detail.

## Dependencies

When `pub get` fails:
1. Read SDK constraints and direct dependency constraints.
2. Identify the first incompatible transitive chain.
3. Prefer upgrading compatible direct dependencies rather than broad overrides.
4. Use `dependency_overrides` only as an explicit temporary measure.
5. Do not widen constraints blindly.

## Modern Dart

- Use null safety intentionally; avoid `!` when control flow can prove non-nullness.
- Prefer exhaustive switch expressions/pattern matching when they make state handling clearer.
- Use records/sealed classes/patterns only when they simplify the model rather than showing off syntax.
- Preserve public API compatibility unless the task explicitly allows breaking changes.

## Refactoring discipline

- Keep analyzer-clean boundaries.
- Avoid mixing semantic refactors with broad formatting churn.
- Maintain async error propagation and cancellation semantics.
- Do not convert typed values to `dynamic` merely to silence the analyzer.

Aligned to `dart-lang/skills` commit `58b8343914d35a9c6d5f32077190a1f52fb02591`.
