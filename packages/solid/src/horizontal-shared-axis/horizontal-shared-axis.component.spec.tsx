import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { HorizontalSharedAxis } from ".";
import { PureformProvider } from "..";
import { displayRegistry, navigationRegistry } from "../__fixtures__/registry";
import { Stepper } from "../stepper";
import { Tabs } from "../tabs";
import { mount, settle, until } from "../testing/mount";

const PAGE = "pf-horizontal-shared-axis-page";
const SCRIM = "pf-horizontal-shared-axis-scrim";

const pages = () => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${PAGE}"]`),
];
const scrim = () => document.querySelector(`[data-testid="${SCRIM}"]`);

// The fake registry has no styles: a page that moves gets an animation here, as the preset's
// would, so a change holds until it ends.
let style: HTMLStyleElement;
beforeEach(() => {
    style = document.createElement("style");
    style.textContent = `
        @keyframes m3b-move { from { opacity: 0.5 } to { opacity: 1 } }
        [data-pf-part="page"][data-state="entering"],
        [data-pf-part="page"][data-state="leaving"] {
            animation: m3b-move 10s;
        }
    `;
    document.head.append(style);
});
afterEach(() => style.remove());

const finish = async () => {
    for (const page of pages()) {
        for (const animation of page.getAnimations()) animation.finish();
    }
    await settle();
};

const withRegistry = (
    view: () => unknown,
    registry:
        | ReturnType<typeof navigationRegistry>
        | ReturnType<typeof displayRegistry> = navigationRegistry(),
) =>
    mount(() => (
        <PureformProvider registry={registry}>
            {view() as never}
        </PureformProvider>
    ));

describe("HorizontalSharedAxis", () => {
    it("shows the page still, then slides forward to a later one while the old one leaves", async () => {
        const [index, setIndex] = createSignal(0);
        withRegistry(() => (
            <HorizontalSharedAxis index={index()}>
                {(at: number) => `Page ${at}`}
            </HorizontalSharedAxis>
        ));
        await settle();
        expect(pages().map((page) => page.dataset["state"])).toEqual([
            "current",
        ]);
        setIndex(2);
        await settle();
        expect(
            pages().map((page) => [
                page.textContent,
                page.dataset["state"],
                page.dataset["direction"],
            ]),
        ).toEqual([
            ["Page 0", "leaving", "forward"],
            ["Page 2", "entering", "forward"],
        ]);
        // The root clips while the pages move, and not at rest.
        expect(
            pages()[0]!.parentElement!.hasAttribute("data-transitioning"),
        ).toBe(true);
        expect(pages()[0]!.inert).toBe(true);
        expect(pages()[0]!.getAttribute("aria-hidden")).toBe("true");
        await finish();
        await until(() =>
            expect(
                pages().map((page) => [
                    page.textContent,
                    page.dataset["state"],
                ]),
            ).toEqual([["Page 2", "current"]]),
        );
        expect(
            pages()[0]!.parentElement!.hasAttribute("data-transitioning"),
        ).toBe(false);
        setIndex(1);
        await settle();
        expect(pages().map((page) => page.dataset["direction"])).toEqual([
            "backward",
            "backward",
        ]);
    });

    it("veils the page underneath with the scrim only while a change runs", async () => {
        const [index, setIndex] = createSignal(0);
        withRegistry(() => (
            <HorizontalSharedAxis index={index()} scrim>
                {(at: number) => `Page ${at}`}
            </HorizontalSharedAxis>
        ));
        await settle();
        expect(scrim()).toBeNull();
        setIndex(1);
        await settle();
        expect(scrim()?.getAttribute("data-direction")).toBe("forward");
        expect(scrim()?.getAttribute("aria-hidden")).toBe("true");
        await finish();
        await until(() => expect(scrim()).toBeNull());
    });

    it("swaps at once when nothing animates", async () => {
        style.textContent = "";
        const [index, setIndex] = createSignal(0);
        withRegistry(() => (
            <HorizontalSharedAxis index={index()}>
                {(at: number) => `Page ${at}`}
            </HorizontalSharedAxis>
        ));
        await settle();
        setIndex(1);
        await until(() =>
            expect(pages().map((page) => page.textContent)).toEqual(["Page 1"]),
        );
    });
});

describe("Tabs and Stepper with transition=sharedAxis", () => {
    it("keeps the tab's old panel drawn while it leaves", async () => {
        withRegistry(() => (
            <Tabs
                aria-label="Trips"
                transition="sharedAxis"
                items={[
                    { value: "a", label: "A", content: "Panel A" },
                    { value: "b", label: "B", content: "Panel B" },
                ]}
            />
        ));
        await settle();
        const tabs = [
            ...document.querySelectorAll<HTMLElement>('[role="tab"]'),
        ];
        await userEvent.click(tabs[1]!);
        await settle();
        const panels = () => [
            ...document.querySelectorAll<HTMLElement>('[role="tabpanel"]'),
        ];
        expect(
            panels().map((panel) => [panel.textContent, panel.hidden]),
        ).toEqual([
            ["Panel A", false],
            ["Panel B", false],
        ]);
        await finish();
        await until(() =>
            expect(panels().map((panel) => panel.textContent)).toEqual([
                "Panel B",
            ]),
        );
    });

    it("moves a row's steps backward to an earlier step", async () => {
        const [step, setStep] = createSignal(1);
        withRegistry(
            () => (
                <Stepper
                    aria-label="Checkout"
                    transition="sharedAxis"
                    step={step()}
                    items={[
                        { label: "One", content: "Step one" },
                        { label: "Two", content: "Step two" },
                    ]}
                />
            ),
            displayRegistry(),
        );
        await settle();
        setStep(0);
        await settle();
        expect(
            pages().map((page) => [
                page.textContent,
                page.dataset["direction"],
            ]),
        ).toEqual([
            ["Step two", "backward"],
            ["Step one", "backward"],
        ]);
    });
});
