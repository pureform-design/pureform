import type { ReactNode } from "react";
import { beforeAll, describe, expect, it } from "vitest";
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
import { byTestId, interact, mount, outside, settle } from "./testing/render";
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
        expect(overlayMotion("popup", tokens, false)).toEqual({
            enter: {
                from: { opacity: 0, scale: 0.8 },
                to: { opacity: 1, scale: 1 },
                duration: 150,
                easing: tokens["easings.emphasizedDecelerate"],
            },
            exit: {
                from: { opacity: 1 },
                to: { opacity: 0 },
                duration: 100,
                easing: tokens["easings.emphasizedAccelerate"],
            },
        });
        const dialog = overlayMotion("dialog", tokens, false, 2);
        expect(dialog.enter).toMatchObject({
            from: { opacity: 0, translateY: -48 },
            to: { opacity: 1, translateY: 0 },
            duration: 1000,
        });
        expect(dialog.exit).toMatchObject({
            from: { opacity: 1, translateY: 0 },
            to: { opacity: 0, translateY: -48 },
            duration: 300,
        });
        const reduced = overlayMotion("dialog", tokens, true);
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
        await interact(() =>
            userEvent.click(document.querySelector('[role="combobox"]')!),
        );
        await settle(100);
        const entering = frame(menuWrapper()!);
        expect(entering.opacity).toBeGreaterThan(0);
        expect(entering.opacity).toBeLessThan(1);
        expect(entering.scale).toBeGreaterThanOrEqual(0.8);
        expect(entering.scale).toBeLessThan(1);
        await settle(1100);
        expect(frame(menuWrapper()!)).toEqual({
            opacity: 1,
            scale: 1,
            translateY: 0,
        });

        await interact(() =>
            userEvent.click(document.querySelector('[aria-label="Close"]')!),
        );
        expect(
            document
                .querySelector('[role="combobox"]')!
                .getAttribute("aria-expanded"),
        ).toBe("false");
        await settle(150);
        const leaving = frame(menuWrapper()!);
        expect(leaving.opacity).toBeGreaterThan(0);
        expect(leaving.opacity).toBeLessThan(1);
        expect(leaving.scale).toBe(1);
        await settle(800);
        expect(document.querySelector('[role="menu"]')).toBeNull();
    });

    it("only fades under reduced motion, as the web's rule does", async () => {
        await render(<Select label="Size" items={ITEMS} />, engine, "reduce");
        await interact(() =>
            userEvent.click(document.querySelector('[role="combobox"]')!),
        );
        await settle(100);
        const entering = frame(menuWrapper()!);
        expect(entering.opacity).toBeLessThan(1);
        expect(entering.scale).toBe(1);
        await settle(1100);
        expect(frame(menuWrapper()!).opacity).toBe(1);
    });

    it("enters again when reopened while it leaves", async () => {
        const open = outside(true);
        await render(
            <open.Holder>
                {(value) => <Menu open={value} items={ITEMS} testId="m" />}
            </open.Holder>,
            engine,
        );
        await settle(1100);
        await open.set(false);
        await settle(150);
        expect(frame(byTestId("m-root")).opacity).toBeLessThan(1);
        await open.set(true);
        await settle(1200);
        expect(frame(byTestId("m-root"))).toEqual({
            opacity: 1,
            scale: 1,
            translateY: 0,
        });
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
        expect(document.querySelector('[role="dialog"]')).toBeNull();
        expect(
            document.querySelector('[data-testid="pf-scrim-root"]'),
        ).toBeNull();
        await open.set(true);
        await settle(300);
        const entering = frame(byTestId("pf-dialog-root"));
        expect(entering.opacity).toBeLessThan(1);
        expect(entering.translateY).toBeLessThan(0);
        expect(entering.translateY).toBeGreaterThanOrEqual(-48);
        expect(frame(byTestId("pf-scrim-root")).opacity).toBeLessThan(1);
        await settle(3000);
        expect(frame(byTestId("pf-dialog-root"))).toEqual({
            opacity: 1,
            scale: 1,
            translateY: 0,
        });
        await open.set(false);
        await settle(300);
        const leaving = frame(byTestId("pf-dialog-root"));
        expect(leaving.translateY).toBeLessThan(0);
        expect(leaving.opacity).toBeLessThan(1);
        await settle(1000);
        expect(document.querySelector('[role="dialog"]')).toBeNull();
        expect(
            document.querySelector('[data-testid="pf-scrim-root"]'),
        ).toBeNull();
    });

    it("shows and hides a snackbar and a tooltip", async () => {
        const open = outside(true);
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
        await settle(100);
        expect(frame(byTestId("pf-snackbar-root")).scale).toBeLessThan(1);
        expect(frame(byTestId("pf-tooltip-root")).scale).toBeLessThan(1);
        await settle(1100);
        await open.set(false);
        await settle(100);
        expect(byTestId("pf-snackbar-root")).toBeTruthy();
        await settle(800);
        expect(document.querySelector('[role="status"]')).toBeNull();
        expect(document.querySelector('[role="tooltip"]')).toBeNull();
    });

    it("leaves a surface without `open` shown and still", async () => {
        await render(<Snackbar supportingText="Archived" />, engine);
        expect(frame(byTestId("pf-snackbar-root"))).toEqual({
            opacity: 1,
            scale: 1,
            translateY: 0,
        });
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
