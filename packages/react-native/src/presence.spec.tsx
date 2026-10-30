import { testIds } from "@pureform/anatomy";
import { stagger } from "@pureform/animate-react-native";
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { commands, userEvent } from "vitest/browser";

import {
    OVERLAY_KEYFRAMES,
    OVERLAY_MOTIONS,
    PureformProvider,
    overlayMotion,
    usePresence,
    useTokens,
} from ".";
import { BottomSheet } from "./bottom-sheet";
import { Dialog } from "./dialog";
import { animated } from "./engine";
import type { MotionEngine } from "./engine";
import { reanimated } from "./engines/reanimated";
import { FabMenu } from "./fab-menu";
import { Menu } from "./menu";
import { themeSpringRatio } from "./presence";
import { Scrim } from "./scrim";
import { Select } from "./select";
import { Snackbar } from "./snackbar";
import { presetRegistry } from "./testing/registry";
import type { TestRegistry } from "./testing/registry";
import { byTestId, interact, mount, outside, until } from "./testing/render";
import { Tooltip } from "./tooltip";

let registry: TestRegistry;

beforeAll(async () => {
    registry = await presetRegistry([
        "select",
        "fabMenu",
        "menu",
        "dialog",
        "snackbar",
        "tooltip",
        "scrim",
        "ripple",
        "bottomSheet",
        "dragHandle",
    ]);
});

// Long enough to look at an overlay partway: the popup's enter is 150ms × 6, its exit 100ms × 6.
const SLOW = 6;

const render = (
    node: ReactNode,
    engine: MotionEngine,
    motion: "full" | "reduce" = "full",
) =>
    mount(
        <PureformProvider
            registry={registry}
            engine={engine}
            motion={motion}
            timeScale={SLOW}
        >
            {node}
        </PureformProvider>,
    );

// An element's opacity, and its transform's scale and vertical move.
const frame = (element: Element) => {
    const style = getComputedStyle(element);
    const matrix = /matrix\(([^)]*)\)/.exec(style.transform)?.[1];
    const [a = 1, , , , , f = 0] = matrix ? matrix.split(",").map(Number) : [];
    return { opacity: Number(style.opacity), scale: a, translateY: f };
};

type Frame = ReturnType<typeof frame>;

const REST: Frame = { opacity: 1, scale: 1, translateY: 0 };

const recording = new Set<() => void>();

afterEach(() => {
    for (const stop of recording) stop();
});

/** Records the element `find` finds at every frame, from now until `stop()`: an overlay's
 *  motion as it runs, however long the user event that started it takes to come back. */
const record = (find: () => Element | null) => {
    const frames: Frame[] = [];
    let id = 0;
    const tick = () => {
        const element = find();
        if (element) frames.push(frame(element));
        id = requestAnimationFrame(tick);
    };
    const stop = () => {
        cancelAnimationFrame(id);
        recording.delete(stop);
    };
    recording.add(stop);
    tick();
    return {
        stop,
        /** The frame nearest halfway through its fade, with the opacity neither 0 nor 1. */
        partway: (): Frame | undefined =>
            frames
                .filter((f) => f.opacity > 0 && f.opacity < 1)
                .sort(
                    (a, b) =>
                        Math.abs(a.opacity - 0.5) - Math.abs(b.opacity - 0.5),
                )[0],
    };
};

const byId = (id: string) =>
    document.querySelector<HTMLElement>(`[data-testid="${id}"]`);

const ITEMS = [
    { value: "s", label: "Small" },
    { value: "l", label: "Large" },
];

const ENGINES = [animated, reanimated];

describe("the overlay motions", () => {
    it("are the preset's", async () => {
        const preset = await commands.overlayMotions();
        expect(OVERLAY_MOTIONS).toEqual(preset.motions);
        const used = new Set(
            Object.values(OVERLAY_MOTIONS).flatMap((motion) =>
                [motion.enter, motion.exit].flatMap((step) =>
                    "rtl" in step
                        ? [step.keyframes, step.rtl]
                        : [step.keyframes],
                ),
            ),
        );
        expect(
            Object.fromEntries(
                Object.entries(preset.keyframes).filter(([name]) =>
                    used.has(name as never),
                ),
            ),
        ).toEqual(OVERLAY_KEYFRAMES);
    });

    it("waits a delay before a step, and not under reduced motion", async () => {
        let tokens!: import("@pureform/rn-adapter/factory").ThemeValues;
        function Read(): ReactNode {
            // oxlint-disable-next-line react/globals -- the test harness captures what it drives from outside the component
            tokens = useTokens();
            return null;
        }
        await mount(
            <PureformProvider registry={registry}>
                <Read />
            </PureformProvider>,
        );
        const size = { width: 0, height: 0 };
        const waiting = overlayMotion("popup", tokens, false, 2, size, false, {
            enter: 50,
            exit: 100,
        });
        expect(waiting.enter).toMatchObject({
            delay: 100,
            fade: { delay: 100 },
        });
        expect(waiting.exit).toMatchObject({
            delay: 200,
            fade: { delay: 200 },
        });
        const reduced = overlayMotion("popup", tokens, true, 2, size, false, {
            enter: 50,
            exit: 100,
        });
        expect(reduced.enter).not.toHaveProperty("delay");
        expect(overlayMotion("popup", tokens, false).enter).not.toHaveProperty(
            "delay",
        );
        // The FAB menu's item is only a fade here (its reveal is its own width spring), which
        // waits its delay the same way.
        const item = overlayMotion(
            "fabMenuItem",
            tokens,
            false,
            2,
            size,
            false,
            {
                enter: 50,
                exit: 100,
            },
        );
        expect(item.enter).toMatchObject({ delay: 100 });
        expect(item.exit).toMatchObject({ delay: 200 });
        expect(item.enter).not.toHaveProperty("fade");
        expect(item.enter.from.scale).toBeUndefined();
        expect(
            overlayMotion("fabMenuItem", tokens, true, 2, size, false, {
                enter: 50,
            }).enter,
        ).not.toHaveProperty("delay");
    });

    it("reads a spring role as the damping ratio the sampler takes, not the coefficient the engines run", async () => {
        let tokens!: import("@pureform/rn-adapter/factory").ThemeValues;
        function Read(): ReactNode {
            // oxlint-disable-next-line react/globals -- the test harness captures what it drives from outside the component
            tokens = useTokens();
            return null;
        }
        await mount(
            <PureformProvider registry={registry}>
                <Read />
            </PureformProvider>,
        );
        // The theme's slow effects spring: stiffness 800, critically damped.
        const spring = themeSpringRatio("effectsSlow", tokens)!;
        expect(spring.stiffness).toBe(800);
        expect(spring.mass).toBe(1);
        expect(spring.damping).toBeCloseTo(1, 3);
        // The engines run the coefficient: 2ζ√(k·m).
        expect(tokens["springs.effectsSlow.damping"]).toBeCloseTo(
            2 * Math.sqrt(800),
            3,
        );
        // The waits are the web's for the same spring: nearest the FAB first, in tens of ms.
        const { delays } = stagger({ count: 3, spring, phase: "enter" });
        expect(delays).toEqual([89, 34, 0]);
        expect(themeSpringRatio("noSuchSpring", tokens)).toBeUndefined();
    });

    it("take the theme's durations and curves, the time scale, and fades under reduced motion", async () => {
        let tokens!: import("@pureform/rn-adapter/factory").ThemeValues;
        function Read(): ReactNode {
            // oxlint-disable-next-line react/globals -- the test harness captures what it drives from outside the component
            tokens = useTokens();
            return null;
        }
        await mount(
            <PureformProvider registry={registry}>
                <Read />
            </PureformProvider>,
        );
        const popup = overlayMotion("popup", tokens, false);
        expect(popup.enter.easing).toBe(tokens["springs.spatialFast.easing"]);
        expect(popup.enter.easing).toMatchObject({
            type: "easing",
            kind: "linear",
        });
        // The growth on the fast spatial spring, its fade alongside on the fast effects spring.
        expect(popup.enter).toMatchObject({
            from: { opacity: 0, scale: 0.8 },
            to: { opacity: 1, scale: 1 },
            duration: Number(tokens["springs.spatialFast.duration"]),
            easing: tokens["springs.spatialFast.easing"],
            spring: {
                type: "spring",
                stiffness: Number(tokens["springs.spatialFast.stiffness"]),
            },
            fade: {
                duration: Number(tokens["springs.effectsFast.duration"]),
                spring: {
                    stiffness: Number(tokens["springs.effectsFast.stiffness"]),
                },
            },
        });
        // It shrinks back to 80% as it fades out, as Compose's menu does.
        expect(popup.exit).toMatchObject({
            from: { opacity: 1, scale: 1 },
            to: { opacity: 0, scale: 0.8 },
            duration: Number(tokens["springs.spatialFast.duration"]),
            fade: { duration: Number(tokens["springs.effectsFast.duration"]) },
        });
        const dialog = overlayMotion("dialog", tokens, false, 2);
        expect(dialog.enter).toMatchObject({
            from: { opacity: 0, translateY: -48 },
            to: { opacity: 1, translateY: 0 },
            duration: Number(tokens["springs.spatialDefault.duration"]) * 2,
            spring: {
                stiffness:
                    Number(tokens["springs.spatialDefault.stiffness"]) / 4,
            },
            fade: {
                duration: Number(tokens["springs.effectsFast.duration"]) * 2,
            },
        });
        expect(dialog.exit).toMatchObject({
            from: { opacity: 1, translateY: 0 },
            to: { opacity: 0, translateY: -48 },
            duration: Number(tokens["springs.effectsFast.duration"]) * 2,
            fade: {
                duration: Number(tokens["springs.effectsFast.duration"]) * 2,
            },
        });
        // The sheets slide in from their edge, out of sight past it (the window's size), and
        // back out; a side sheet from the left under right to left.
        const window = { width: 400, height: 800 };
        const bottom = overlayMotion("bottomSheet", tokens, false, 1, window);
        expect(bottom.enter).toMatchObject({
            from: { opacity: 0, translateY: 800 },
            to: { opacity: 1, translateY: 0 },
            duration: Number(tokens["springs.spatialDefault.duration"]),
            fade: { duration: Number(tokens["springs.effectsFast.duration"]) },
        });
        expect(bottom.exit).toMatchObject({
            from: { translateY: 0 },
            to: { opacity: 0, translateY: 800 },
            duration: Number(tokens["springs.effectsFast.duration"]),
        });
        const side = (rtl: boolean) =>
            overlayMotion("sideSheet", tokens, false, 1, window, rtl);
        expect(side(false).enter).toMatchObject({
            from: { translateX: 400 },
            to: { translateX: 0 },
        });
        expect(side(true).exit).toMatchObject({
            from: { translateX: 0 },
            to: { translateX: -400 },
        });
        expect(
            overlayMotion("sideSheet", tokens, true, 1, window).enter,
        ).toMatchObject({ from: { opacity: 0 }, to: { opacity: 1 } });
        expect(
            overlayMotion("sideSheet", tokens, true, 1, window).enter.from,
        ).not.toHaveProperty("translateX");
        const reduced = overlayMotion("dialog", tokens, true);
        expect(reduced.enter.spring).toMatchObject({
            stiffness: Number(tokens["springs.effectsFast.stiffness"]),
        });
        expect(reduced.enter.fade).toBeUndefined();
        expect(reduced.enter).toMatchObject({
            from: { opacity: 0 },
            to: { opacity: 1 },
            duration: Number(tokens["springs.effectsFast.duration"]),
        });
        // The fades keep their effects spring under reduced motion.
        expect(reduced.enter.easing).toBe(tokens["springs.effectsFast.easing"]);
        expect(reduced.exit).toMatchObject({
            from: { opacity: 1 },
            to: { opacity: 0 },
            duration: Number(tokens["springs.effectsFast.duration"]),
        });
    });
});

describe.each(ENGINES)("with $name", (engine) => {
    // The listbox sits in the keys' view, in the view that grows and fades.
    const menuWrapper = () =>
        document.querySelector('[role="listbox"]')?.parentElement
            ?.parentElement ?? null;

    it("grows the select's menu in, and keeps it until it has faded out", async () => {
        await render(<Select label="Size" items={ITEMS} />, engine);
        expect(document.querySelector('[role="listbox"]')).toBeNull();
        const entering = record(menuWrapper);
        await interact(() =>
            userEvent.click(document.querySelector('[role="combobox"]')!),
        );
        await until(() => expect(frame(menuWrapper()!)).toEqual(REST));
        entering.stop();
        const grown = entering.partway();
        expect(grown).toBeDefined();
        expect(grown!.scale).toBeGreaterThanOrEqual(0.8);
        expect(grown!.scale).toBeLessThan(1);

        const leaving = record(menuWrapper);
        await interact(() =>
            // Escape: the press outside it is out of the accessibility tree.
            userEvent.keyboard("{Escape}"),
        );
        expect(
            document
                .querySelector('[role="combobox"]')!
                .getAttribute("aria-expanded"),
        ).toBe("false");
        await until(() =>
            expect(document.querySelector('[role="listbox"]')).toBeNull(),
        );
        leaving.stop();
        const fading = leaving.partway();
        expect(fading).toBeDefined();
        expect(fading!.scale).toBeGreaterThanOrEqual(0.8);
        expect(fading!.scale).toBeLessThan(1);
    });

    it("only fades under reduced motion, as the web's rule does", async () => {
        await render(<Select label="Size" items={ITEMS} />, engine, "reduce");
        const entering = record(menuWrapper);
        await interact(() =>
            userEvent.click(document.querySelector('[role="combobox"]')!),
        );
        await until(() => expect(frame(menuWrapper()!).opacity).toBe(1));
        entering.stop();
        const fading = entering.partway();
        expect(fading).toBeDefined();
        expect(fading!.scale).toBe(1);
    });

    it("enters again when reopened while it leaves", async () => {
        const open = outside(true);
        await render(
            <open.Holder>
                {(value) => <Menu open={value} items={ITEMS} testId="m" />}
            </open.Holder>,
            engine,
        );
        await until(() => expect(frame(byTestId("m-content"))).toEqual(REST));
        await open.set(false);
        await until(() =>
            expect(frame(byTestId("m-content")).opacity).toBeLessThan(1),
        );
        await open.set(true);
        await until(() => expect(frame(byTestId("m-content"))).toEqual(REST));
    });

    it(
        "staggers the FAB menu's items: the nearest the FAB enters first, the farthest leaves first",
        { timeout: 60_000 },
        async () => {
            const fab = testIds.fabMenu;
            // The engine's view that fades: the item's pressable, its measuring view, and the width wrapper
            // sit inside it.
            const wrapper = (item: Element) =>
                item.parentElement!.parentElement!.parentElement!;
            await render(
                <FabMenu
                    icon="+"
                    fabLabel="Create"
                    items={[
                        { value: "a", label: "A" },
                        { value: "b", label: "B" },
                        { value: "c", label: "C" },
                    ]}
                />,
                engine,
            );
            const opacities = () =>
                [
                    ...document.querySelectorAll(`[data-testid="${fab.item}"]`),
                ].map((item) => frame(wrapper(item)).opacity);
            const samples: number[][] = [];
            let id = 0;
            const tick = () => {
                const now = opacities();
                if (now.length === 3) samples.push(now);
                id = requestAnimationFrame(tick);
            };
            tick();
            const trigger = byTestId(fab.closeTrigger);
            await interact(() => userEvent.click(trigger));
            await until(() => expect(opacities()).toEqual([1, 1, 1]));
            // Never the farther item ahead of the nearer one, and a moment with the nearest in
            // while the farthest hasn't begun.
            const entered = samples.filter((o) =>
                o.some((x) => x > 0 && x < 1),
            );
            expect(
                entered.some(([first, , last]) => last! > 0 && first === 0),
            ).toBe(true);
            expect(
                entered.every(([first, , last]) => first! <= last! + 0.01),
            ).toBe(true);
            samples.length = 0;
            // The back of the list closes it too: the nearest item's press picks and closes.
            await interact(() =>
                userEvent.click(
                    document.querySelectorAll(
                        `[data-testid="${fab.item}"]`,
                    )[2]!,
                ),
            );
            await until(() =>
                expect(
                    document.querySelector(`[data-testid="${fab.list}"]`),
                ).toBeNull(),
            );
            cancelAnimationFrame(id);
            const left = samples.filter((o) => o.some((x) => x > 0 && x < 1));
            expect(
                left.some(([first, , last]) => first! < 1 && last === 1),
            ).toBe(true);
            expect(
                left.every(([first, , last]) => first! <= last! + 0.01),
            ).toBe(true);
        },
    );

    it("brings a dialog down and takes it back up, with its scrim fading", async () => {
        const open = outside(false);
        await render(
            <open.Holder>
                {(value) => (
                    <>
                        <Scrim open={value} />
                        <Dialog open={value} headline="Discard draft?">
                            Body
                        </Dialog>
                    </>
                )}
            </open.Holder>,
            engine,
        );
        const dialog = () => byId("pf-dialog-content");
        const scrim = () => byId("pf-scrim-root");
        expect(document.querySelector('[role="dialog"]')).toBeNull();
        expect(scrim()).toBeNull();
        const entering = record(dialog);
        const scrimEntering = record(scrim);
        await open.set(true);
        await until(() => expect(frame(dialog()!)).toEqual(REST));
        entering.stop();
        scrimEntering.stop();
        const coming = entering.partway();
        expect(coming).toBeDefined();
        expect(coming!.translateY).toBeLessThan(0);
        expect(coming!.translateY).toBeGreaterThanOrEqual(-48);
        expect(scrimEntering.partway()).toBeDefined();

        const leaving = record(dialog);
        await open.set(false);
        await until(() => {
            expect(document.querySelector('[role="dialog"]')).toBeNull();
            expect(scrim()).toBeNull();
        });
        leaving.stop();
        const going = leaving.partway();
        expect(going).toBeDefined();
        expect(going!.translateY).toBeLessThan(0);
    });

    it("slides a bottom sheet by its own height, not the window's", async () => {
        const open = outside(false);
        await render(
            <open.Holder>
                {(value) => (
                    <BottomSheet modal={false} open={value}>
                        Share to
                    </BottomSheet>
                )}
            </open.Holder>,
            engine,
        );
        const root = () => byId("pf-bottom-sheet-content");
        const entering = record(root);
        await open.set(true);
        await until(() => expect(frame(root()!)).toEqual(REST));
        entering.stop();
        const height = root()!.getBoundingClientRect().height;
        expect(height).toBeLessThan(window.innerHeight / 2);
        const coming = entering.partway();
        expect(coming).toBeDefined();
        expect(coming!.translateY).toBeGreaterThan(0);
        expect(coming!.translateY).toBeLessThanOrEqual(height);
    });

    it("shows and hides a snackbar and a tooltip", async () => {
        const open = outside(true);
        const snackbar = () => byId("pf-snackbar-root");
        const tooltip = () => byId("pf-tooltip-content");
        const snackbarEntering = record(snackbar);
        const tooltipEntering = record(tooltip);
        await render(
            <open.Holder>
                {(value) => (
                    <>
                        <Snackbar open={value} supportingText="Archived" />
                        <Tooltip open={value} supportingText="Save" />
                    </>
                )}
            </open.Holder>,
            engine,
        );
        await until(() => {
            expect(frame(snackbar()!)).toEqual(REST);
            expect(frame(tooltip()!)).toEqual(REST);
        });
        snackbarEntering.stop();
        tooltipEntering.stop();
        expect(snackbarEntering.partway()?.scale).toBeLessThan(1);
        expect(tooltipEntering.partway()?.scale).toBeLessThan(1);

        const leaving = record(snackbar);
        await open.set(false);
        await until(() => {
            // The surface leaves; the live region stays mounted, emptied.
            expect(
                document.querySelector('[data-testid="pf-snackbar-root"]'),
            ).toBeNull();
            expect(document.querySelector('[role="status"]')?.textContent).toBe(
                "",
            );
            expect(document.querySelector('[role="tooltip"]')).toBeNull();
        });
        leaving.stop();
        expect(leaving.partway()?.scale).toBeLessThan(1);
    });

    it("leaves a surface without `open` shown and still", async () => {
        await render(<Snackbar supportingText="Archived" />, engine);
        expect(frame(byTestId("pf-snackbar-root"))).toEqual(REST);
    });
});

it("shows and hides at once on an engine without presence", async () => {
    const { presence: _, ...still } = animated;
    const open = outside(true);
    let present: boolean[] = [];
    function Probe(props: { open: boolean }): ReactNode {
        present.push(usePresence(props.open).present);
        return null;
    }
    await render(
        <open.Holder>{(value) => <Probe open={value} />}</open.Holder>,
        {
            ...still,
            name: "still",
        },
    );
    expect(present.at(-1)).toBe(true);
    present = [];
    await open.set(false);
    expect(new Set(present)).toEqual(new Set([false]));
});
