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
import { Dialog } from "./dialog";
import { animated } from "./engine";
import type { MotionEngine } from "./engine";
import { reanimated } from "./engines/reanimated";
import { Menu } from "./menu";
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
        "menu",
        "dialog",
        "snackbar",
        "tooltip",
        "scrim",
        "ripple",
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
            Object.values(OVERLAY_MOTIONS).flatMap((motion) => [
                motion.enter.keyframes,
                motion.exit.keyframes,
            ]),
        );
        expect(
            Object.fromEntries(
                Object.entries(preset.keyframes).filter(([name]) =>
                    used.has(name as never),
                ),
            ),
        ).toEqual(OVERLAY_KEYFRAMES);
    });

    it("take the theme's durations and curves, the time scale, and fades under reduced motion", async () => {
        let tokens!: Record<string, string | number>;
        function Read(): ReactNode {
            tokens = useTokens();
            return null;
        }
        await mount(
            <PureformProvider registry={registry}>
                <Read />
            </PureformProvider>,
        );
        const popup = overlayMotion("popup", tokens, false);
        // The growth on the fast spatial spring, its fade alongside on the fade's tween.
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
                duration: 150,
                easing: tokens["easings.emphasizedDecelerate"],
            },
        });
        expect(popup.exit).toEqual({
            from: { opacity: 1 },
            to: { opacity: 0 },
            duration: 100,
            easing: tokens["easings.emphasizedAccelerate"],
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
            fade: { duration: 1000 },
        });
        expect(dialog.exit).toMatchObject({
            from: { opacity: 1, translateY: 0 },
            to: { opacity: 0, translateY: -48 },
            duration: Number(tokens["springs.effectsFast.duration"]) * 2,
            fade: { duration: 300 },
        });
        const reduced = overlayMotion("dialog", tokens, true);
        expect(reduced.enter.spring).toBeUndefined();
        expect(reduced.enter.fade).toBeUndefined();
        expect(reduced.enter).toMatchObject({
            from: { opacity: 0 },
            to: { opacity: 1 },
            duration: 500,
        });
        expect(reduced.exit).toMatchObject({
            from: { opacity: 1 },
            to: { opacity: 0 },
            duration: 150,
        });
    });
});

describe.each(ENGINES)("with $name", (engine) => {
    const menuWrapper = () =>
        document.querySelector('[role="menu"]')?.parentElement ?? null;

    it("grows the select's menu in, and keeps it until it has faded out", async () => {
        await render(<Select label="Size" items={ITEMS} />, engine);
        expect(document.querySelector('[role="menu"]')).toBeNull();
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
            userEvent.click(document.querySelector('[aria-label="Close"]')!),
        );
        expect(
            document
                .querySelector('[role="combobox"]')!
                .getAttribute("aria-expanded"),
        ).toBe("false");
        await until(() =>
            expect(document.querySelector('[role="menu"]')).toBeNull(),
        );
        leaving.stop();
        const fading = leaving.partway();
        expect(fading).toBeDefined();
        expect(fading!.scale).toBe(1);
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
        await until(() => expect(frame(byTestId("m-root"))).toEqual(REST));
        await open.set(false);
        await until(() =>
            expect(frame(byTestId("m-root")).opacity).toBeLessThan(1),
        );
        await open.set(true);
        await until(() => expect(frame(byTestId("m-root"))).toEqual(REST));
    });

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
        const dialog = () => byId("pf-dialog-root");
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

    it("shows and hides a snackbar and a tooltip", async () => {
        const open = outside(true);
        const snackbar = () => byId("pf-snackbar-root");
        const tooltip = () => byId("pf-tooltip-root");
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
            expect(document.querySelector('[role="status"]')).toBeNull();
            expect(document.querySelector('[role="tooltip"]')).toBeNull();
        });
        leaving.stop();
        expect(leaving.partway()).toBeDefined();
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
        { ...still, name: "still" },
    );
    expect(present.at(-1)).toBe(true);
    present = [];
    await open.set(false);
    expect(new Set(present)).toEqual(new Set([false]));
});
