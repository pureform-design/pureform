# Component guidelines

The rules and checks every pureform component goes through, from the first look at the spec
to the last test. They come from how the Expressive work and the
[gap analysis](component-gap-analysis.md) were done; follow them for each new component or
variant, and for every recheck against the spec.

Companion docs: [`component-architecture.md`](component-architecture.md) (how tokens,
variants, themes and indication work) and the gap analysis (what is missing and why).

## 1. Sources and provenance

Everything here is based on **open-source, publicly written documentation and APIs**. It is
not reverse engineering: nothing is decompiled, scraped from behind a login, or taken from a
closed binary. We read what the projects publish, and write our own styles, tokens and
code.

| Source                                                      | License            | What we take from it                                                    |
| ----------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------- |
| `material-components-android` docs (`docs/components/*.md`) | Apache-2.0         | The M3 anatomy, variants and Expressive updates, as Google wrote them   |
| Compose Material 3 release notes (developer.android.com)    | Apache-2.0 content | What changed in the newest spec, and why, before the View docs catch up |
| Material Web (`material-components/material-web`)           | Apache-2.0         | Part and slot names only (it's in maintenance mode and not Expressive)  |
| Angular Material (`angular/components`)                     | MIT                | Part names, M3 token sets, and the components M3 doesn't specify        |
| zag.js (`chakra-ui/zag`)                                    | MIT                | Machines and part lists for behaviour                                   |

Rules:

- **Read the written docs, tokens and public API.** Write our own implementation. Don't copy
  source code, stylesheets or image assets into the repo, and keep their licenses in mind if a
  small piece is ever needed (keep the notice).
- **Say where a decision came from.** A part, variant or value that comes from a source is
  named in the doc with the source and date (the gap analysis' "Source" column).
- **When the sources disagree, the newest canonical one wins.** The order is: the Android
  View docs, then the Compose release notes (they are ahead on Expressive), then Material
  Web and Angular for names only. m3.material.io can't be read without a browser; if a value
  can only be had there, mark it unconfirmed instead of guessing.
- **Don't invent spec.** A component outside M3 (the Angular parity set) follows the same
  rules, and its design calls are written down in its output context.

## 2. Rechecking against the spec

Do this before planning a batch of work, and whenever a new Expressive release appears.

1. Read the latest docs: `docs/components/*.md` on `master` (and the commit log of that
   folder since the last snapshot), the latest release tag, and the Compose Material 3 release
   notes since the last snapshot.
2. Diff against the gap analysis: new components, removed or deprecated ones, new parts or
   variants, colour or shape changes, accessibility fixes.
3. Record each finding in the gap analysis' recheck table with its source and the section it
   changes. Fix the doc and the preset in the same change when both are out of sync.
4. Confirm what the code still has: count components, anatomy parts, compound variants, and
   check the doc's numbers against them.
5. Update the snapshot date and the "sources" versions.

## 3. Deciding what a component is

For each component or suggestion from a source, answer the three checks, in order:

1. **Is it in the current M3 anatomy?** (Android docs' Anatomy and Expressive sections.)
2. **Is it already covered?** By a state or variant in `packages/preset/src/components`, or
   by an element the binding already renders (zag's trigger, positioner, content, backdrop).
3. **Does it need its own styles?** Behaviour-only and ARIA-only parts get no slot.

Then give it a verdict: **Add**, **Variant**, **Later**, **Skip**, **Remove** or **Split**.
A **Remove** or a dropped deprecated option must say why. Expressive's values are the
defaults. A deprecated option is **removed** when the new version already has an equivalent
(the same result through a new variant, size or token); the removal names the replacement in
the gap analysis (§7 "Removed, and why") and the package READMEs. A deprecated option with
no equivalent stays as a variant.

**Split or variant?** A separate component when it has different parts (a group of them, not
one optional part), a different behaviour or machine, or a different layout model. A variant
when the parts are the same and only tokens, layout options or a behaviour flag change.
(Details and the current list: gap analysis §4.)

## 4. Variants without explosion

Every new variant group follows `component-architecture.md` §5.5:

- A variant sets one component token, and others read it. No compound per pair of values.
- When a value depends on two groups, one sets a literal and the other a 0/1 flag, and
  `blend(from, to, flag)` picks.
- **Never chain variant-set tokens** (a variant setting `a: ref("b")` where another variant
  sets `b`): CSS resolves it, React Native resolves `b` from the theme default, so the two
  targets disagree.
- What stays a compound needs a token value from one group _and_ a colour role from another.
- Count compounds before and after, and note the number in the gap analysis.

## 5. Theme conformance

A component conforms to the theme **whether the theme is static or dynamic**:

- **Static:** a named theme (`sharp`, `soft`, `squircle`, a colour theme) scoped by a data
  attribute, a class or a Tailwind variant. Nothing in a component may depend on which theme
  is active.
- **Dynamic:** a runtime theme (a seed colour at runtime) and `overrides` on
  `PureformProvider`, written as CSS variables on the web and context on React Native. Every
  value a theme or instance can change must be a token, not a literal.

Checklist for every new component and variant:

| Concept                       | Rule                                                                                                                                                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shape**                     | Every radius comes from the theme's roles (`radius("small")`, …), scaled or combined when Material's value has no role (2px is `extraSmall × 0.5`). Add the theme's corner style (`corners.ts`) wherever a radius is set. See §5.1. |
| **Colour**                    | From group tokens or the `color` variant, never a fixed role where a group should apply. Dark, light, high-contrast and a runtime seed all follow.                                                                                  |
| **Density**                   | Sized heights and widths add `densityOffset`.                                                                                                                                                                                       |
| **Direction**                 | Logical properties only (inline insets, `borderStartStartRadius`, block margins). Right-to-left needs nothing extra; the direction suite checks it.                                                                                 |
| **Interaction source**        | Pressed, hovered and focused styles read the state (`:active` or `data-pf-active`, …), so a source forwarded by another element (a shared interaction source) drives the same styles.                                               |
| **Indication**                | The state layer, focus ring (outer or inset) and ripple go through the indication model. A part with no surface says so and hides its declared surface.                                                                             |
| **Motion**                    | Moving tweens go through `motionTransition`, so reduced motion drops them and keeps colour fades.                                                                                                                                   |
| **Type and icons**            | Text uses theme type styles; icon sizes use the icon tokens.                                                                                                                                                                        |
| **Theme and instance tokens** | Per-size and flag tokens can be retuned by a theme or an instance. The variants are the intended interface.                                                                                                                         |
| **Targets**                   | Same result on Panda, Tailwind, the CSS adapter and React Native. A feature a target can't draw says so in the component's docs, and has a fallback that doesn't change meaning.                                                    |

### 5.1 The shape rule, and its exceptions

`packages/preset/src/radii.spec.ts` fails on any fixed px radius in a style or a token, so a
shape theme can't be ignored by accident.

**Exception:** a component whose geometry _is_ the shape doesn't take the theme's radii,
because conforming would break what it is. The example: a **circular progress indicator**
(and a loading indicator's circular forms) must stay round. Under a theme that sets every
radius role to 0 (`sharp`), a role-driven radius would turn the ring into a square. Such a
component:

1. Draws its geometry from its own tokens (an arc, a full circle) rather than from the radius
   roles.
2. Still follows everything else the theme drives: colour, size, density, thickness, motion.
3. Is named on the allow-list in `radii.spec.ts` (`ALLOWED`: component, then the radius's
   path inside it such as `base.borderRadius`, then the reason), so the exception is visible
   and reviewed rather than silent. An entry with an empty reason, or one that no longer
   matches a fixed radius, fails the check.
4. Says so in its docs. A theme that wants a different shape for it sets the component's own
   tokens, not the roles.

Exceptions are for geometry, not taste. A button that "looks better" with a fixed radius is
not an exception.

## 6. Tests every change needs

A change isn't done until these pass, and until the docs say what the code does.

| Check                | Where                                                                     | What it covers                                                                                                  |
| -------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Preset specs         | `packages/preset/src/components/*.spec.ts`, `expressive.spec.ts`          | Tokens, variants, states per component                                                                          |
| Anatomy drift        | `packages/anatomy/src/anatomy.spec.ts` (plus the machines' test, planned) | The preset, the machine and the binding agree on parts                                                          |
| Radii                | `packages/preset/src/radii.spec.ts`                                       | No fixed radius (§5.1)                                                                                          |
| Adapter codegen      | `packages/rn-adapter`, `css-adapter`, `tailwind-adapter`, `panda-adapter` | Every target compiles it; large selection spaces are sampled, not enumerated                                    |
| Browser suite        | `tests/browser-e2e-tests`                                                 | Screenshots, indication fixtures, Panda factories. Fonts are bundled so screenshots don't depend on the machine |
| Component suites     | `tests/component-suites`                                                  | Each binding on each target; direction (rtl mirrors ltr), hydration                                             |
| Type check           | `bunx tsc --noEmit -p tsconfig.json` in each package                      | Use `tsconfig.json`; `tsconfig.project.json` is only a fragment                                                 |
| Targeted build/test  | `omni run build test -p <project>` or `-b <base commit> -w`               | What a change affects; the default while working                                                                |
| Whole build and test | `omni run build test -f all -o continue`                                  | Once per phase, after merging. `-f all` because omni can replay a stale cache                                   |

Test hygiene learned the hard way:

- **Park the pointer** before tests that depend on hover or timers. A pointer left over from an
  earlier test holds a snackbar's timer open and opens tooltips during hydration.
- **Don't depend on the machine:** bundle fonts, round colours Chromium computes with
  `color-mix` to four decimals, and regenerate screenshots and fixtures on purpose, not to
  silence a failure (read the diff first).
- **Sample large spaces:** past about 40,000 combinations, test each value plus an even spread
  (and, for compounds, every pair of values from every two groups).
- **Regenerate generated files** (`bun x pureform generate`, `panda codegen`) before judging a
  failure.

## 7. Docs and commits

- Keep the gap analysis in sync in the same change: the matrix row, the section's verdicts,
  the totals, and §7 (what is done). Rerun the checks in §2 when a number could have moved.
- A phase writes its output context (`docs/roadmap/conventions.md`).
- Conventional Commits (`feat(preset): …`, `docs(design): …`), one coherent unit each. Cocogitto
  (`cog`) may not be installed, so check headers by hand. Format with `bunx oxfmt <paths>`
  first.
- Don't hand-edit `bun.lock` unless unavoidable; `bun install` can re-resolve unrelated
  packages, so check the lockfile diff.

## 8. Before calling a component done

- [ ] Verdict and sources recorded in the gap analysis, with dates.
- [ ] Parts and variants follow §3 and §4; compound count noted.
- [ ] Every row of the theme checklist (§5) passes, or the exception (§5.1) is recorded.
- [ ] Static theme and runtime theme both checked (a named theme, and a seed-colour theme).
- [ ] Deprecated options with a new equivalent removed (replacement named); those without one kept.
- [ ] Machine, preset and binding anatomies agree.
- [ ] All targets pass; screenshots and fixtures reviewed.
- [ ] Docs updated, output context written, commits pushed when asked.
