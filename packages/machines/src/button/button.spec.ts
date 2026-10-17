import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import * as button from ".";
import { run, settle } from "../testing/vanilla";

let cleanup: (() => void) | undefined;
afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    document.body.innerHTML = "";
});

function mount(
    props: Partial<button.Props> = {},
    host: Element = document.body,
) {
    const root = document.createElement("button");
    const icon = document.createElement("span");
    const label = document.createElement("span");
    label.textContent = "Save";
    root.append(icon, label);
    host.append(root);
    const running = run(
        button.machine,
        button.connect,
        { id: "save", ...props },
        (api, spread) => {
            spread(root, api.getRootProps());
            spread(icon, api.getIconProps());
            spread(label, api.getLabelProps());
        },
    );
    cleanup = running.stop;
    return { ...running, root, icon, label };
}

const pointer = (type: string, init: PointerEventInit = {}) =>
    new PointerEvent(type, {
        bubbles: true,
        button: 0,
        pointerType: "mouse",
        ...init,
    });

describe("button machine", () => {
    it("renders a native button with its parts", () => {
        const { root, icon, label, api } = mount();
        expect(root.type).toBe("button");
        expect(root.id).toBe("button:save");
        expect(root.dataset["scope"]).toBe("button");
        expect(root.dataset["part"]).toBe("root");
        expect(root.hasAttribute("aria-pressed")).toBe(false);
        expect(icon.getAttribute("aria-hidden")).toBe("true");
        expect(label.id).toBe("button:save:label");
        expect(api().toggle).toBe(false);
        expect(api().selected).toBe(false);
    });

    it("forwards the native form props", () => {
        const { root } = mount({
            type: "submit",
            name: "action",
            value: "save",
            form: "editor",
        });
        expect(root.type).toBe("submit");
        expect(root.name).toBe("action");
        expect(root.value).toBe("save");
        expect(root.getAttribute("form")).toBe("editor");
    });

    describe("pressing", () => {
        it("is pressed from pointer down until the pointer is released anywhere", async () => {
            const { root, api, service } = mount();
            expect(service.state.get()).toBe("idle");

            root.dispatchEvent(pointer("pointerdown"));
            await settle();
            expect(service.state.matches("pressed")).toBe(true);
            expect(api().pressed).toBe(true);

            document.body.dispatchEvent(pointer("pointerup"));
            await settle();
            expect(service.state.get()).toBe("idle");
            expect(api().pressed).toBe(false);
        });

        it("ends a press the browser cancels", async () => {
            const { root, api } = mount();
            root.dispatchEvent(pointer("pointerdown"));
            await settle();
            window.dispatchEvent(pointer("pointercancel"));
            await settle();
            expect(api().pressed).toBe(false);
        });

        it("ignores buttons other than the primary one", async () => {
            const { root, api } = mount();
            root.dispatchEvent(pointer("pointerdown", { button: 2 }));
            await settle();
            expect(api().pressed).toBe(false);
        });

        it("is pressed while Enter or Space is held", async () => {
            const { root, api } = mount();
            root.focus();
            for (const key of ["Enter", "Space"]) {
                await userEvent.keyboard(`{${key}>}`);
                await settle();
                expect(api().pressed).toBe(true);
                await userEvent.keyboard(`{/${key}}`);
                await settle();
                expect(api().pressed).toBe(false);
            }
        });

        it("ends a keyboard press when focus leaves", async () => {
            const { root, api } = mount();
            root.focus();
            await userEvent.keyboard("{Enter>}");
            await settle();
            expect(api().pressed).toBe(true);
            root.blur();
            await settle();
            expect(api().pressed).toBe(false);
        });

        it("keeps a pointer press when focus leaves", async () => {
            const { root, api } = mount();
            root.focus();
            root.dispatchEvent(pointer("pointerdown"));
            await settle();
            root.blur();
            await settle();
            expect(api().pressed).toBe(true);
            window.dispatchEvent(pointer("pointerup"));
            await settle();
            expect(api().pressed).toBe(false);
        });
    });

    describe("focus and hover", () => {
        it("tracks focus, and whether it's visible", async () => {
            const { root, api } = mount();
            await userEvent.tab();
            await settle();
            expect(document.activeElement).toBe(root);
            expect(api().focused).toBe(true);
            expect(api().focusVisible).toBe(true);

            root.blur();
            await settle();
            expect(api().focused).toBe(false);
            expect(api().focusVisible).toBe(false);

            await userEvent.click(root);
            await settle();
            expect(api().focused).toBe(true);
            expect(api().focusVisible).toBe(false);
        });

        it("tracks a hovering mouse", async () => {
            const { root, api } = mount();
            await userEvent.hover(root);
            await settle();
            expect(api().hovered).toBe(true);
            await userEvent.unhover(root);
            await settle();
            expect(api().hovered).toBe(false);
        });
    });

    it("marks none of Zag's interaction attributes, which no style matches", async () => {
        const { root } = mount();
        await userEvent.hover(root);
        root.focus();
        root.dispatchEvent(pointer("pointerdown"));
        await settle();
        for (const name of [
            "data-active",
            "data-hover",
            "data-focus-visible",
        ]) {
            expect(root.hasAttribute(name), name).toBe(false);
        }
        window.dispatchEvent(pointer("pointerup"));
    });

    describe("disabled", () => {
        it("disables the native button and ignores presses", async () => {
            const onSelectedChange = vi.fn();
            const { root, api } = mount({
                disabled: true,
                defaultSelected: false,
                onSelectedChange,
            });
            expect(root.disabled).toBe(true);
            expect(api().disabled).toBe(true);
            root.dispatchEvent(pointer("pointerdown"));
            root.click();
            api().toggleSelected();
            await settle();
            expect(api().pressed).toBe(false);
            expect(api().selected).toBe(false);
            expect(onSelectedChange).not.toHaveBeenCalled();
        });

        it("ends a press and clears focus when it becomes disabled", async () => {
            const { root, api, setProps } = mount();
            root.focus();
            root.dispatchEvent(pointer("pointerdown"));
            await settle();
            expect(api().pressed).toBe(true);
            setProps({ id: "save", disabled: true });
            await settle();
            expect(api().pressed).toBe(false);
            expect(api().focused).toBe(false);
            expect(root.disabled).toBe(true);
        });

        it("follows a disabled fieldset around it", async () => {
            const fieldset = document.createElement("fieldset");
            fieldset.disabled = true;
            document.body.append(fieldset);
            const { root, api } = mount({}, fieldset);
            await settle();
            expect(api().disabled).toBe(true);
            root.dispatchEvent(pointer("pointerdown"));
            await settle();
            expect(api().pressed).toBe(false);

            fieldset.disabled = false;
            await settle();
            expect(api().disabled).toBe(false);
            expect(root.disabled).toBe(false);
        });
    });

    describe("toggle", () => {
        it("is a toggle when it has a selected state, or says so", () => {
            expect(mount({ defaultSelected: false }).api().toggle).toBe(true);
            cleanup?.();
            expect(mount({ selected: true }).api().toggle).toBe(true);
            cleanup?.();
            expect(mount({ toggle: true }).api().toggle).toBe(true);
            cleanup?.();
            expect(
                mount({ toggle: false, defaultSelected: true }).api().toggle,
            ).toBe(false);
        });

        it("toggles on click when uncontrolled, reporting each change", async () => {
            const onSelectedChange = vi.fn();
            const { root, api } = mount({
                defaultSelected: false,
                onSelectedChange,
            });
            expect(root.getAttribute("aria-pressed")).toBe("false");
            expect(root.dataset["state"]).toBe("off");

            await userEvent.click(root);
            await settle();
            expect(api().selected).toBe(true);
            expect(root.getAttribute("aria-pressed")).toBe("true");
            expect(root.dataset["state"]).toBe("on");
            expect(onSelectedChange).toHaveBeenCalledExactlyOnceWith({
                selected: true,
            });

            root.focus();
            await userEvent.keyboard("{Enter}");
            await settle();
            expect(api().selected).toBe(false);
            expect(onSelectedChange).toHaveBeenLastCalledWith({
                selected: false,
            });
            expect(onSelectedChange).toHaveBeenCalledTimes(2);
        });

        it("starts from defaultSelected", () => {
            const { root, api } = mount({ defaultSelected: true });
            expect(api().selected).toBe(true);
            expect(root.getAttribute("aria-pressed")).toBe("true");
        });

        it("only asks to change when controlled", async () => {
            const onSelectedChange = vi.fn();
            const { root, api, setProps } = mount({
                selected: false,
                onSelectedChange,
            });
            await userEvent.click(root);
            await settle();
            expect(onSelectedChange).toHaveBeenCalledExactlyOnceWith({
                selected: true,
            });
            expect(api().selected).toBe(false);
            expect(root.getAttribute("aria-pressed")).toBe("false");

            setProps({ id: "save", selected: true, onSelectedChange });
            await settle();
            expect(api().selected).toBe(true);
            expect(root.getAttribute("aria-pressed")).toBe("true");
            // A prop change isn't a user action.
            expect(onSelectedChange).toHaveBeenCalledTimes(1);
        });

        it("sets and toggles through the API", async () => {
            const onSelectedChange = vi.fn();
            const { api } = mount({ defaultSelected: false, onSelectedChange });
            api().setSelected(true);
            await settle();
            expect(api().selected).toBe(true);
            api().setSelected(true);
            await settle();
            api().toggleSelected();
            await settle();
            expect(api().selected).toBe(false);
            expect(onSelectedChange.mock.calls).toEqual([
                [{ selected: true }],
                [{ selected: false }],
            ]);
        });

        it("never selects a plain button", async () => {
            const onSelectedChange = vi.fn();
            const { root, api } = mount({ onSelectedChange });
            await userEvent.click(root);
            api().setSelected(true);
            api().toggleSelected();
            await settle();
            expect(api().selected).toBe(false);
            expect(root.hasAttribute("aria-pressed")).toBe(false);
            expect(onSelectedChange).not.toHaveBeenCalled();
        });
    });
});
