// The demo's page, rendered from @pureform/react-native over the generated registry: every
// component draws its generated factory's styles, the runtime styles draw the same, the controls
// change what they say, and the components keep working across engines.

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { registry } from "../.pureform";
import { App } from "./App";

let root: Root;
let host: HTMLElement;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeAll(async () => {
    const style = document.createElement("style");
    style.textContent =
        "html, body, #app { height: 100%; margin: 0 } #app { display: flex }";
    document.head.append(style);
    host = document.createElement("main");
    host.id = "app";
    document.body.append(host);
    root = createRoot(host);
    flushSync(() => root.render(<App />));
    await wait(300);
});

afterAll(() => root.unmount());

// A test that fails with a menu or dialog open must not leave its backdrop over the page for
// the tests after it: close whatever is still open.
afterEach(async () => {
    const open = () =>
        document.querySelector(
            "[role=menu], [role=listbox], [aria-modal=true]",
        );
    for (let attempt = 0; attempt < 3 && open(); attempt++) {
        await userEvent.keyboard("{Escape}");
        await wait(500);
    }
});

const all = (id: string) => [
    ...document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];
const first = (id: string) => {
    const found = all(id)[0];
    if (!found) throw new Error(`no element with test id "${id}"`);
    return found;
};

// A color as the browser computes it.
const computedColor = (color: string) => {
    const probe = document.createElement("i");
    probe.style.color = color;
    document.body.append(probe);
    const out = getComputedStyle(probe).color;
    probe.remove();
    return out;
};

const chip = (label: string) =>
    [...document.querySelectorAll<HTMLElement>("[role=button]")].find(
        (element) => element.textContent === label,
    )!;

const press = async (element: HTMLElement) => {
    await userEvent.click(element);
    // Off the element again, unless the press removed it (a menu item closing its menu).
    if (element.isConnected) await userEvent.unhover(element);
    await wait(500);
};

// Every part's colors and size, in order.
const snapshot = () =>
    [...host.querySelectorAll("[data-testid]")]
        .filter((element) => !element.closest("[role=progressbar]"))
        .map((element) => {
            const style = getComputedStyle(element);
            const box = element.getBoundingClientRect();
            return `${style.color} ${style.backgroundColor} ${Math.round(box.width)}x${Math.round(box.height)}`;
        });

describe("rn-web-demo", () => {
    it("renders every component from the package, with its parts' test ids", () => {
        for (const id of [
            "pf-text-root",
            "pf-button-root",
            "pf-button-label",
            "pf-chip-root",
            "pf-checkbox-box",
            "pf-switch-control-handle",
            "pf-radio-dot",
            "pf-supporting-text-root",
            "pf-icon-root",
            "pf-icon-button-container",
            "pf-fab-container",
            "pf-avatar-root",
            "pf-media-root",
            "pf-list-item-headline",
            "pf-separator-root",
            "pf-linear-progress-indicator",
            "pf-circular-progress-end-arc",
            "pf-scrim-root",
            "pf-text-field-input",
            "pf-text-area-input",
            "pf-select-trailing-icon",
            "pf-search-bar-input",
            "pf-slider-handle",
            "pf-tabs-tab",
            "pf-navigation-bar-item",
            "pf-navigation-rail-item",
            "pf-menu-item",
            "pf-dialog-headline",
            "pf-snackbar-action",
            "pf-tooltip-root",
            "pf-rich-tooltip-subhead",
            "pf-card-root",
        ]) {
            expect(all(id).length, id).toBeGreaterThan(0);
        }
    });

    it("draws each component with its generated factory's styles", () => {
        const button = registry.entry("button").factory({}).root.style;
        expect(getComputedStyle(first("pf-button-root")).backgroundColor).toBe(
            computedColor(String(button.backgroundColor)),
        );
        const label = registry.entry("button").factory({}).label.style;
        expect(getComputedStyle(first("pf-button-label")).color).toBe(
            computedColor(String(label.color)),
        );
        const avatar = registry.entry("avatar").factory({ size: "small" })
            .root.style;
        const avatars = all("pf-avatar-root");
        expect(avatars.at(-3)!.getBoundingClientRect().width).toBe(
            avatar.width,
        );
    });

    it("draws the same from styles resolved at runtime", async () => {
        const precomputed = snapshot();
        await press(chip("runtime"));
        const runtime = snapshot();
        await press(chip("precomputed"));
        // The two chips trade their selected look (each its root, touch target, and label);
        // everything else is the same.
        const differ = precomputed.filter((line, i) => line !== runtime[i]);
        expect(runtime.length).toBe(precomputed.length);
        expect(differ.length).toBe(6);
    });

    it("switches the scheme", async () => {
        const surface = () => getComputedStyle(first("pf-text-root")).color;
        const light = surface();
        await press(chip("dark"));
        expect(surface()).not.toBe(light);
        await press(chip("light"));
        expect(surface()).toBe(light);
    });

    it("checks the checkbox and turns the switch off", async () => {
        const checkbox = first("pf-checkbox-root");
        expect(checkbox.getAttribute("aria-checked")).toBe("true");
        await press(checkbox);
        expect(checkbox.getAttribute("aria-checked")).toBe("false");
        const control = first("pf-switch-control-root");
        await press(control);
        expect(control.getAttribute("aria-checked")).toBe("false");
    });

    it("picks a size from the select's menu", async () => {
        await press(document.querySelector<HTMLElement>("[role=combobox]")!);
        // The select's list is a listbox: its rows are options, not menu items.
        const large = [
            ...document.querySelectorAll<HTMLElement>("[role=option]"),
        ].find((item) => item.textContent === "Large");
        expect(large, "the option labelled Large").toBeDefined();
        await press(large!);
        expect((first("pf-select-input") as HTMLInputElement).value).toBe(
            "Large",
        );
    });

    it("moves between tabs and destinations", async () => {
        const [, chat] = document.querySelectorAll<HTMLElement>("[role=tab]");
        await press(chat!);
        expect(chat!.getAttribute("aria-selected")).toBe("true");
        const rail = all("pf-navigation-rail-item");
        await press(rail[2]!);
        expect(rail[2]!.getAttribute("aria-current")).toBe("page");
    });

    it("draws shapes with SVG under each engine, and keeps the page's state", async () => {
        const shaped = () =>
            all("pf-icon-button-container").filter((container) =>
                container.querySelector("svg path"),
            ).length;
        expect(shaped()).toBeGreaterThan(0);
        await press(chip("no svg"));
        expect(shaped()).toBe(0);
        await press(chip("Reanimated"));
        await press(chip("svg"));
        expect(shaped()).toBeGreaterThan(0);
        expect(first("pf-checkbox-root").getAttribute("aria-checked")).toBe(
            "false",
        );
        await press(chip("Animated"));
    });

    it("ripples in each surface the anatomy names, the controls' and the snackbar's too", async () => {
        // The ripple layer: the surface's last element, which has no test id.
        const ripples = (surface: HTMLElement) => {
            const layer = surface.lastElementChild;
            return layer && !layer.hasAttribute("data-testid")
                ? layer.childElementCount
                : 0;
        };
        for (const [pressed, surface] of [
            ["pf-button-root", "pf-button-root"],
            ["pf-icon-button-root", "pf-icon-button-container"],
            ["pf-checkbox-root", "pf-checkbox-root"],
            ["pf-switch-control-root", "pf-switch-control-state-layer"],
            ["pf-radio-root", "pf-radio-root"],
            ["pf-snackbar-action", "pf-snackbar-action"],
            ["pf-snackbar-close", "pf-snackbar-close"],
        ]) {
            await userEvent.click(first(pressed!));
            expect(ripples(first(surface!)), surface).toBeGreaterThan(0);
            await userEvent.unhover(first(pressed!));
        }
        await wait(1000);
    });

    it("shows a press on every component sharing a source, and switches the indication", async () => {
        const button = all("pf-button-root").find(
            (element) => element.textContent === "Press me",
        )!;
        const other = chip("Or me");
        const rest = getComputedStyle(other).backgroundColor;
        const box = button.getBoundingClientRect();
        const at = {
            bubbles: true,
            button: 0,
            clientX: box.left + 4,
            clientY: box.top + 4,
        };
        button.dispatchEvent(new MouseEvent("mousedown", at));
        await wait(400);
        expect(document.body.textContent).toContain("Pressed");
        expect(getComputedStyle(other).backgroundColor).not.toBe(rest);
        document.dispatchEvent(new MouseEvent("mouseup", at));
        await wait(400);
        expect(document.body.textContent).toContain("At rest");

        // A layer in each surface while the indication draws a ripple, none without one.
        const layered = () =>
            all("pf-button-root").filter((element) => {
                const last = element.lastElementChild;
                return last !== null && !last.hasAttribute("data-testid");
            }).length;
        expect(layered()).toBeGreaterThan(0);
        await press(chip("no indication"));
        expect(layered()).toBe(0);
        await press(chip("material indication"));
        expect(layered()).toBeGreaterThan(0);
    });

    it("opens a menu, a tooltip, a snackbar, and a dialog over the page, and dismisses each", async () => {
        const named = (name: string) =>
            [...document.querySelectorAll<HTMLElement>("[role=button]")].find(
                (element) =>
                    element.getAttribute("aria-label") === name ||
                    element.textContent === name,
            )!;
        const count = (selector: string) =>
            document.querySelectorAll(selector).length;
        // The surfaces shown in the page, besides the overlays.
        const menus = count("[role=menu]");
        const tooltips = count("[role=tooltip]");
        const statuses = count("[role=status]");
        const dialogs = count('[data-testid="pf-dialog-root"]');

        // The menu opens under its trigger, over what follows it, and picking an item closes it.
        await press(named("Edit"));
        expect(count("[role=menu]")).toBe(menus + 1);
        const menu = [...document.querySelectorAll("[role=menu]")].at(-1)!;
        const trigger = named("Edit").getBoundingClientRect();
        expect(menu.getBoundingClientRect().top).toBeGreaterThan(
            trigger.bottom,
        );
        const items = [
            ...menu.querySelectorAll<HTMLElement>("[role=menuitem]"),
        ];
        await press(items.find((item) => item.textContent?.includes("Copy"))!);
        expect(count("[role=menu]")).toBe(menus);
        // Escape closes it too.
        await press(named("Edit"));
        expect(count("[role=menu]")).toBe(menus + 1);
        await userEvent.keyboard("{Escape}");
        await wait(500);
        expect(count("[role=menu]")).toBe(menus);

        // The tooltip shows once the pointer rests on its trigger, and goes when it leaves.
        await userEvent.hover(named("Save"));
        await wait(800);
        expect(count("[role=tooltip]")).toBe(tooltips + 1);
        await userEvent.unhover(named("Save"));
        await wait(600);
        expect(count("[role=tooltip]")).toBe(tooltips);

        // The snackbar comes from the queue, with the page's choice, and its action closes it.
        await press(named("Archive"));
        expect(count("[role=status]")).toBe(statuses + 1);
        const snackbar = [...document.querySelectorAll("[role=status]")].at(
            -1,
        )!;
        expect(snackbar.textContent).toContain("Archived (copy)");
        await press(
            snackbar.querySelector<HTMLElement>(
                '[data-testid="pf-snackbar-action"]',
            )!,
        );
        expect(count("[role=status]")).toBe(statuses);

        // The dialog opens modal over a scrim; Escape closes it, and so does Cancel.
        await press(named("Discard"));
        expect(count('[data-testid="pf-dialog-root"]')).toBe(dialogs + 1);
        expect(count('[aria-modal="true"]')).toBeGreaterThan(0);
        await userEvent.keyboard("{Escape}");
        await wait(800);
        expect(count('[data-testid="pf-dialog-root"]')).toBe(dialogs);
        await press(named("Discard"));
        await wait(300);
        const cancel = [
            ...document.querySelectorAll<HTMLElement>(
                '[aria-modal="true"] [role=button]',
            ),
        ].find((button) => button.textContent === "Cancel")!;
        await press(cancel);
        await wait(300);
        expect(count('[data-testid="pf-dialog-root"]')).toBe(dialogs);
    });

    it("fills the current destination's icon", () => {
        const factory = registry.entry("navigationBar").factory;
        expect(factory({ selected: true }).icon.iconFill).toBe(1);
        expect(factory({}).icon.iconFill).toBe(0);
    });
});
