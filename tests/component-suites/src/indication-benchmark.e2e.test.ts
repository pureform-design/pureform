// The indication benchmark (design doc §9.8, "The layer stays eager for now"): mounts 1,000
// interactive list items, with and without the layer element each surface holds, and with sources
// each component creates as it mounts (eager) or none created then (the app's, made beforehand,
// which is what a lazy source would save), and records the mount time and Chromium's style
// recalculation and layout. Skipped unless `VITE_PUREFORM_BENCH` is set:
//
//     VITE_PUREFORM_BENCH=1 bun x vitest --config vitest.config.e2e.ts run src/indication-benchmark \
//         --project '*/panda' --silent=false

import { describe, expect, it } from "vitest";
import { commands } from "vitest/browser";

import { harness } from "#binding";

import type { SceneIndication } from "./harness/scene";

const ITEMS = 1000;
const RUNS = 7;

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

const median = (values: number[]) =>
    [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;

interface Sample {
    /** From mounting to the first style and layout, forced at once. */
    readonly mount: number;
    /** Until the binding settled: effects attached, the next frame drawn. */
    readonly settled: number;
    readonly recalcStyle: number;
    readonly recalcStyleCount: number;
    readonly layout: number;
}

const measure = async (
    indication: SceneIndication,
    sources: "eager" | "given",
): Promise<Sample> => {
    // An app's sources, made before the clock starts.
    const given = sources === "given" ? harness.sources(ITEMS) : [];
    const items = Array.from({ length: ITEMS }, (_, index) => ({
        headline: `Item ${index}`,
        href: `#item-${index}`,
        ...(sources === "given" ? { interactionSource: given[index] } : {}),
    }));
    await frame();
    const before = await commands.performanceMetrics();
    const start = performance.now();
    const mounted = harness.mount({
        component: "List",
        props: { "aria-label": "Items", items },
        provider: { indication },
    });
    void document.body.offsetHeight;
    const mount = performance.now() - start;
    await harness.settle();
    await frame();
    const settled = performance.now() - start;
    const after = await commands.performanceMetrics();
    const count = mounted.host.querySelectorAll("[data-ripple-layer]").length;
    expect(count).toBe(indication === "material" ? ITEMS : 0);
    mounted.unmount();
    document.body.innerHTML = "";
    const delta = (name: string) => (after[name] ?? 0) - (before[name] ?? 0);
    return {
        mount,
        settled,
        recalcStyle: delta("RecalcStyleDuration") * 1000,
        recalcStyleCount: delta("RecalcStyleCount"),
        layout: delta("LayoutDuration") * 1000,
    };
};

const VARIANTS = [
    ["layer, eager sources", "material", "eager"],
    ["no layer, eager sources", "no-layer", "eager"],
    ["layer, sources made beforehand", "material", "given"],
] as const;

describe.runIf(import.meta.env.VITE_PUREFORM_BENCH)(
    `indication benchmark (${ITEMS} list items, median of ${RUNS})`,
    () => {
        // oxlint-disable-next-line vitest/expect-expect -- a benchmark: it reports timings and has nothing to assert
        it("mounts with and without the layer, with eager and given sources", async () => {
            // A warm-up of each, then the runs interleaved, so drift hits every variant alike.
            for (const [, indication, sources] of VARIANTS) {
                await measure(indication, sources);
            }
            const samples = new Map<string, Sample[]>();
            for (let run = 0; run < RUNS; run++) {
                for (const [name, indication, sources] of VARIANTS) {
                    const sample = await measure(indication, sources);
                    samples.set(name, [...(samples.get(name) ?? []), sample]);
                }
            }
            const rows = [...samples].map(([name, runs]) => {
                const of = (key: keyof Sample) =>
                    median(runs.map((sample) => sample[key])).toFixed(1);
                return `${name.padEnd(32)} mount ${of("mount").padStart(7)} ms, settled ${of("settled").padStart(7)} ms, style ${of("recalcStyle").padStart(6)} ms (${of("recalcStyleCount")}), layout ${of("layout").padStart(6)} ms`;
            });
            console.log(
                `${harness.name}: ${ITEMS} list items\n${rows.join("\n")}`,
            );
        });
    },
);
