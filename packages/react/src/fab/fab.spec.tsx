import { testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { Fab } from ".";
import type { FabProps } from ".";
import { PureformProvider } from "..";
import { togglesRegistry } from "../__fixtures__/registry";
import { mount, settle } from "../testing/render";

const byTestId = <E extends HTMLElement = HTMLElement>(id: string): E =>
    screen.getByTestId(id) as E;

const ids = testIds.fab;

const withRegistry = (view: ReactNode) =>
    mount(
        <PureformProvider registry={togglesRegistry()}>
            {view}
        </PureformProvider>,
    );

const queryTestId = (id: string) =>
    document.querySelector(`[data-testid="${id}"]`);

describe("Fab, ready-made", () => {
    it("renders a native button with the icon in its container, and no label without one", async () => {
        withRegistry(<Fab icon="✎" aria-label="Compose" size="large" />);
        await settle();
        const root = byTestId(ids.root);
        expect(root.tagName).toBe("BUTTON");
        expect(root.className).toBe("fab fab--size-large fab--extended-false");
        expect(
            [...root.children].map((child) =>
                child.getAttribute("data-pf-part"),
            ),
        ).toEqual(["touch-target", "container"]);
        expect(byTestId(ids.icon).parentElement).toBe(byTestId(ids.container));
        expect(queryTestId(ids.label)).toBeNull();
        expect(root.hasAttribute("aria-pressed")).toBe(false);
    });

    it("is extended with a label, unless told otherwise", async () => {
        withRegistry(<Fab icon="✎" label="Compose" />);
        await settle();
        expect(byTestId(ids.root).className).toBe("fab fab--extended-true");
        expect(byTestId(ids.label).textContent).toBe("Compose");
        expect(byTestId(ids.label).previousElementSibling).toBe(
            byTestId(ids.icon),
        );
    });

    it("warns in development when it has neither a label nor a name", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const unnamed = { icon: "✎" } as unknown as FabProps;
        withRegistry(<Fab {...unnamed} />);
        await settle();
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("Fab shows only an icon"),
        );
        warn.mockRestore();
    });
});
