# r6: Final refactor and doc sync

**Depends on:** c7 (and r5). **Single agent, may split by area.**

The last pass over the whole library, after all waves.

1. Follow the [refactor procedure](../conventions.md#refactor-phases) across every component,
   looking for anything the per-wave refactors missed (r1 to r5 contexts say what they did).
2. Run the whole-library checks: the radii spec (every exception still has a reason), the
   anatomy drift tests, the compound-variant count (record it in the gap analysis), the
   sampled adapter tests, and the browser and component suites on all targets.
3. **Doc sync:** the gap analysis' matrix, totals (§1.8), summary (§2.7) and §7 match the
   code; the guidelines' checklist still describes what we do; every package README is
   current; the component-recipe lists the real steps.
4. Rerun the [recheck](../../design/component-guidelines.md#2-rechecking-against-the-spec)
   against the then-current spec and record anything new as the start of the next roadmap.
5. Write `context/r6.md`.

## Done when

The gate passes with a clean cache, no duplication the hints named is left, and the gap
analysis' "missing" list is empty or each item has a recorded reason.
