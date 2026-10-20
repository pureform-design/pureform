import { testIds } from "@pureform/anatomy";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { createToaster, Toaster } from ".";
import { PureformProvider } from "..";
import { overlaysRegistry } from "../__fixtures__/registry";
import { byTestId, mount, settle } from "../testing/mount";

const ids = testIds.toast;

const show = () => {
    const toaster = createToaster({ placement: "bottom-end" });
    mount(() => (
        <PureformProvider registry={overlaysRegistry()}>
            <Toaster toaster={toaster} label="Alerts" closeLabel="Close" />
        </PureformProvider>
    ));
    return toaster;
};

const all = (id: string) =>
    Array.from(document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`));

describe("Toaster, ready-made", () => {
    it("shows each toast in a named region, with its type's icon, title, description and close button", async () => {
        const toaster = show();
        toaster.success({ title: "Saved", description: "All changes saved." });
        await settle();
        const group = byTestId(ids.group);
        expect(group.className).toBe("toast__group");
        expect(group.getAttribute("role")).toBe("region");
        expect(group.getAttribute("aria-label")).toContain("Alerts");
        const root = byTestId(ids.root);
        expect(root.getAttribute("role")).toBe("status");
        expect(root.className).toContain("toast--type-success");
        expect(byTestId(ids.icon).getAttribute("aria-hidden")).toBe("true");
        expect(byTestId(ids.icon).querySelector("svg")).not.toBeNull();
        expect(byTestId(ids.title).textContent).toBe("Saved");
        expect(byTestId(ids.description).textContent).toBe(
            "All changes saved.",
        );
        expect(byTestId(ids.closeTrigger).getAttribute("aria-label")).toBe(
            "Close",
        );
    });

    it("stacks several, each with its own type, and an unknown type as info", async () => {
        const toaster = show();
        toaster.error({ title: "Failed" });
        toaster.warning({ title: "Careful" });
        toaster.create({ title: "Plain", type: "custom" });
        await settle();

        const types = all(ids.root).map((root) => root.dataset.type);
        expect(types.sort()).toEqual(["custom", "error", "warning"]);
        expect(
            all(ids.root).find((root) => root.dataset.type === "custom")!
                .className,
        ).toContain("toast--type-info");
    });

    it("runs the action, then dismisses", async () => {
        const toaster = show();
        const onClick = vi.fn();
        toaster.info({
            title: "Archived",
            duration: Infinity,
            action: { label: "Undo", onClick },
        });
        await settle();
        await userEvent.click(byTestId(ids.actionTrigger));
        expect(onClick).toHaveBeenCalledOnce();
        await vi.waitFor(() =>
            expect(byTestId(ids.root).dataset.state).toBe("closed"),
        );
    });

    it("leaves out the close button when not closable, and the action unless given", async () => {
        const toaster = show();
        toaster.loading({ title: "Uploading", closable: false });
        await settle();
        expect(all(ids.closeTrigger)).toHaveLength(0);
        expect(all(ids.actionTrigger)).toHaveLength(0);
        expect(byTestId(ids.root).className).toContain("toast--type-loading");
    });

    it("moves each toast by Zag's stacking variables", async () => {
        const toaster = show();
        toaster.info({ title: "One" });
        await settle();
        const style = byTestId(ids.root).style;
        expect(style.transform).toContain("var(--y");
        expect(style.getPropertyValue("--offset")).not.toBe("");
    });
});
