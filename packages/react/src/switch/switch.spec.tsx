import { switchControlAnatomy, testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Switch } from ".";
import { PureformProvider } from "..";
import { togglesRegistry } from "../__fixtures__/registry";
import { Errored, interact, mount, quietly, settle } from "../testing/render";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const ids = testIds.switchControl;

// The preset's layout, enough for real clicks: the input stretched invisibly over the track.
const layout = `
    [data-scope="switch-control"][data-pf-part="root"] { position: relative; display: inline-flex; width: 52px; height: 32px; }
    [data-scope="switch-control"][data-pf-part="input"] { position: absolute; inset: 0; margin: 0; opacity: 0; z-index: 1; }
`;

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={togglesRegistry()}>
            <style>{layout}</style>
            {view}
        </PureformProvider>,
    );

describe("Switch, ready-made", () => {
    it("renders a label around a native checkbox with the switch role, in the anatomy's structure", async () => {
        withRegistry(<Switch aria-label="Wi-Fi" color="secondary" />);
        await settle();
        const root = byTestId(ids.root);
        expect(root.tagName).toBe("LABEL");
        expect(root.getAttribute("data-scope")).toBe("switch-control");
        expect(root.className).toBe("switch switch--color-secondary");
        expect(
            [...root.querySelectorAll("[data-pf-part]")].map((part) =>
                part.getAttribute("data-pf-part"),
            ),
        ).toEqual(["touch-target", "input", "track", "state-layer", "handle"]);
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(input.type).toBe("checkbox");
        expect(input.getAttribute("role")).toBe("switch");
        expect(input.getAttribute("aria-label")).toBe("Wi-Fi");
        expect(input.hasAttribute("aria-labelledby")).toBe(false);
        expect(input.getAttribute("style")).toBeNull();
        expect(byTestId(ids.track).getAttribute("aria-hidden")).toBe("true");
        expect(byTestId(ids.handle).className).toBe("switch__handle");
    });

    it("renders the handle's icon only when given", async () => {
        withRegistry(<Switch aria-label="Wi-Fi" icon="✓" />);
        await settle();
        expect(byTestId(ids.icon).parentElement).toBe(byTestId(ids.handle));
        expect(byTestId(ids.icon).textContent).toBe("✓");
    });

    it("toggles with a click and Space, reporting each change once", async () => {
        const onCheckedChange = vi.fn();
        withRegistry(
            <Switch aria-label="Wi-Fi" onCheckedChange={onCheckedChange} />,
        );
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        await interact(() => userEvent.click(input));
        expect(input.checked).toBe(true);
        expect(byTestId(ids.root).dataset.state).toBe("checked");
        await interact(() => userEvent.keyboard(" "));
        expect(input.checked).toBe(false);
        expect(onCheckedChange.mock.calls.map(([d]) => d)).toEqual([
            { checked: true },
            { checked: false },
        ]);
    });

    it("marks a read-only switch and ignores the user", async () => {
        withRegistry(<Switch aria-label="Wi-Fi" readOnly />);
        await settle();
        const input = byTestId<HTMLInputElement>(ids.input);
        expect(input.getAttribute("aria-readonly")).toBe("true");
        await interact(() => userEvent.click(input));
        expect(input.checked).toBe(false);
    });

    it("prefixes every part's test id", async () => {
        withRegistry(<Switch aria-label="Wi-Fi" testId="wifi" icon="✓" />);
        await settle();
        for (const part of switchControlAnatomy.partNames) {
            const attribute = switchControlAnatomy.parts[part].attribute;
            expect(byTestId(`wifi-${attribute}`)).toBeTruthy();
        }
    });

    it("throws for a part outside Root", () => {
        quietly(() =>
            mount(
                <Errored>
                    <Switch.Handle />
                </Errored>,
            ),
        );
        expect(byTestId("error").textContent).toMatch(
            /<Switch.Handle> must be inside <Switch.Root>/,
        );
    });
});
