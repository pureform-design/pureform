import { checkboxAnatomy, testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { Checkbox } from ".";
import type { CheckedState } from ".";
import { PureformProvider } from "..";
import type { PureformProviderProps } from "..";
import { fakeRegistry } from "../__fixtures__/registry";
import { interact, mount, outside, settle } from "../testing/render";

const ids = testIds.checkbox;
const neverLoads = () => new Promise<never>(() => {});
const registry = fakeRegistry(neverLoads);

// The preset's layout, enough for real clicks: the input stretched invisibly over the control,
// and a touch target larger than it.
const layout = `
    [data-scope="checkbox"][data-pf-part="root"] { position: relative; display: inline-flex; width: 40px; height: 40px; }
    [data-scope="checkbox"][data-pf-part="input"] { position: absolute; inset: 0; margin: 0; opacity: 0; }
    [data-scope="checkbox"][data-pf-part="touch-target"] { position: absolute; inset: -4px; }
`;

const withRegistry = (
    view: ReactNode,
    extra: Omit<PureformProviderProps, "registry"> = {},
) =>
    mount(
        <PureformProvider registry={registry} {...extra}>
            <style>{layout}</style>
            <div style={{ padding: "24px" }}>{view}</div>
        </PureformProvider>,
    );

const byTestId = <E extends HTMLElement = HTMLElement>(id: string) =>
    screen.getByTestId<E>(id);
const inputOf = (prefix = "pf-checkbox") =>
    byTestId<HTMLInputElement>(`${prefix}-input`);
const formOf = () => byTestId<HTMLFormElement>("form");
const click = (element: Element) => interact(() => userEvent.click(element));

/** Waits out a form reset: the browser's, then the binding's in the next task. */
const resetForm = async () => {
    await interact(async () => formOf().reset());
    await settle();
};

describe("Checkbox, ready-made", () => {
    it("renders the preset's structure, with the native input over the control", async () => {
        withRegistry(<Checkbox aria-label="Terms" color="error" />);
        await settle();
        const root = byTestId(ids.root);
        expect(root.tagName).toBe("LABEL");
        expect(root.className).toBe("checkbox checkbox--error");
        expect(
            [...root.children].map((child) =>
                child.getAttribute("data-pf-part"),
            ),
        ).toEqual(["touch-target", "input", "box"]);
        expect(
            [...byTestId(ids.box).children].map((child) =>
                child.getAttribute("data-pf-part"),
            ),
        ).toEqual(["check-icon", "indeterminate-icon"]);
        const input = inputOf();
        expect(input.type).toBe("checkbox");
        expect(input.className).toBe("checkbox__input");
        expect(input.getAttribute("style")).toBeNull();
        expect(byTestId(ids.box).getAttribute("aria-hidden")).toBe("true");
        expect(byTestId(ids.checkIcon).hidden).toBe(false);
        expect(byTestId(ids.indeterminateIcon).hidden).toBe(false);
    });

    it("names the input, not the root, with the ARIA label props", async () => {
        withRegistry(
            <>
                <Checkbox aria-label="Terms" aria-describedby="hint" />
                <p id="hint">Read them first</p>
            </>,
        );
        await settle();
        const input = inputOf();
        expect(input.getAttribute("aria-label")).toBe("Terms");
        expect(input.getAttribute("aria-describedby")).toBe("hint");
        expect(input.hasAttribute("aria-labelledby")).toBe(false);
        expect(byTestId(ids.root).hasAttribute("aria-label")).toBe(false);
        await expect
            .element(page.getByRole("checkbox", { name: "Terms" }))
            .toBeInTheDocument();
    });

    it("addresses each part through slot-keyed className, style, and slotProps", () => {
        withRegistry(
            <Checkbox
                aria-label="Terms"
                className={{ root: "mine", box: ["boxed", { on: true }] }}
                style={{ box: { borderWidth: "3px" } }}
                slotProps={{ input: { title: "the input" } }}
                tokens={{ boxSize: "30px" }}
            />,
        );
        const root = byTestId(ids.root);
        expect(root.className).toBe("checkbox checkbox--primary mine");
        expect(root.style.getPropertyValue("--pf-checkbox-box-size")).toBe(
            "30px",
        );
        expect(byTestId(ids.box).className).toBe("checkbox__box boxed on");
        expect(byTestId(ids.box).style.borderWidth).toBe("3px");
        expect(inputOf().title).toBe("the input");
    });

    it("prefixes every test id, or sets them by part", () => {
        withRegistry(
            <>
                <Checkbox aria-label="a" testId="terms" />
                <Checkbox aria-label="b" testId={{ input: "only-input" }} />
            </>,
        );
        for (const part of checkboxAnatomy.partNames)
            expect(
                byTestId(`terms-${checkboxAnatomy.parts[part].attribute}`),
            ).toBeTruthy();
        expect(byTestId("only-input").getAttribute("aria-label")).toBe("b");
    });

    it("drops the registry's styles when unstyled, for every part or some", () => {
        withRegistry(
            <>
                <Checkbox aria-label="a" testId="a" unstyled />
                <Checkbox aria-label="b" testId="b" unstyled={{ box: true }} />
            </>,
        );
        for (const part of checkboxAnatomy.partNames)
            expect(
                byTestId(`a-${checkboxAnatomy.parts[part].attribute}`)
                    .className,
            ).toBe("");
        expect(byTestId("b-root").className).toContain("checkbox");
        expect(byTestId("b-box").className).toBe("");
        expect(byTestId("b-check-icon").className).toBe("checkbox__check-icon");
    });

    it("takes the provider's defaults and slot props", () => {
        withRegistry(<Checkbox aria-label="Terms" />, {
            defaults: { checkbox: { color: "error" } },
            slotProps: { checkbox: { box: { className: "provided" } } },
        });
        expect(byTestId(ids.root).className).toContain("checkbox--error");
        expect(byTestId(ids.box).className).toBe("checkbox__box provided");
    });

    it("sets the input's ids for a label elsewhere, and the root's id", async () => {
        withRegistry(
            <>
                <label htmlFor="terms">Terms</label>
                <Checkbox id="terms-root" ids={{ input: "terms" }} />
            </>,
        );
        await settle();
        expect(byTestId(ids.root).id).toBe("terms-root");
        expect(inputOf().id).toBe("terms");
        await expect
            .element(page.getByRole("checkbox", { name: "Terms" }))
            .toBeInTheDocument();
    });
});

describe("Checkbox, pointer and keyboard", () => {
    it("toggles uncontrolled state on a click, reporting each change once", async () => {
        const onCheckedChange = vi.fn();
        withRegistry(
            <Checkbox aria-label="Terms" onCheckedChange={onCheckedChange} />,
        );
        await settle();
        await click(inputOf());
        expect(inputOf().checked).toBe(true);
        expect(byTestId(ids.root).dataset.state).toBe("checked");
        expect(onCheckedChange).toHaveBeenCalledTimes(1);
        expect(onCheckedChange).toHaveBeenCalledWith({ checked: true });
    });

    it("toggles from its touch target, outside the control", async () => {
        withRegistry(<Checkbox aria-label="Terms" />);
        await settle();
        await interact(() =>
            userEvent.click(byTestId(ids.touchTarget), {
                position: { x: 1, y: 1 },
            }),
        );
        expect(inputOf().checked).toBe(true);
    });

    it("toggles on Space, marking the press while the key is down", async () => {
        const onCheckedChange = vi.fn();
        withRegistry(
            <Checkbox
                aria-label="Terms"
                defaultChecked
                onCheckedChange={onCheckedChange}
            />,
        );
        await settle();
        inputOf().focus();
        await interact(() => userEvent.keyboard("{ >}"));
        expect(byTestId(ids.root).hasAttribute("data-pf-active")).toBe(true);
        await interact(() => userEvent.keyboard("{/ }"));
        expect(byTestId(ids.root).hasAttribute("data-pf-active")).toBe(false);
        expect(inputOf().checked).toBe(false);
        expect(onCheckedChange).toHaveBeenCalledWith({ checked: false });
    });

    it("can be reached with Tab, and not when disabled", async () => {
        withRegistry(
            <>
                <Checkbox aria-label="a" testId="a" />
                <Checkbox aria-label="b" testId="b" disabled />
                <Checkbox aria-label="c" testId="c" />
            </>,
        );
        await settle();
        inputOf("a").focus();
        await interact(() => userEvent.tab());
        expect(document.activeElement).toBe(inputOf("c"));
    });

    it("shows the indeterminate state on the input, and checks from it", async () => {
        withRegistry(
            <Checkbox aria-label="All" defaultChecked="indeterminate" />,
        );
        await settle();
        expect(inputOf().indeterminate).toBe(true);
        expect(byTestId(ids.root).dataset.state).toBe("indeterminate");
        await click(inputOf());
        expect(inputOf().indeterminate).toBe(false);
        expect(inputOf().checked).toBe(true);
    });

    it("ignores the user while read-only, and says so", async () => {
        const onCheckedChange = vi.fn();
        withRegistry(
            <Checkbox
                aria-label="Terms"
                readOnly
                onCheckedChange={onCheckedChange}
            />,
        );
        await settle();
        expect(inputOf().getAttribute("aria-readonly")).toBe("true");
        await click(inputOf());
        expect(inputOf().checked).toBe(false);
        expect(onCheckedChange).not.toHaveBeenCalled();
    });

    it("marks an invalid or required input", async () => {
        withRegistry(<Checkbox aria-label="Terms" invalid required />);
        await settle();
        expect(inputOf().getAttribute("aria-invalid")).toBe("true");
        expect(inputOf().required).toBe(true);
        expect(byTestId(ids.root).matches(":has([aria-invalid=true])")).toBe(
            true,
        );
    });
});

describe("Checkbox, controlled", () => {
    it("asks to change, and moves only with the prop", async () => {
        const checked = outside<CheckedState>(false);
        const onCheckedChange = vi.fn();
        withRegistry(
            <checked.Holder>
                {(value) => (
                    <Checkbox
                        aria-label="Terms"
                        checked={value}
                        onCheckedChange={onCheckedChange}
                    />
                )}
            </checked.Holder>,
        );
        await settle();
        await click(inputOf());
        expect(onCheckedChange).toHaveBeenCalledWith({ checked: true });
        expect(inputOf().checked).toBe(false);
        expect(byTestId(ids.root).dataset.state).toBe("unchecked");

        await checked.set("indeterminate");
        await settle();
        expect(inputOf().indeterminate).toBe(true);
        await checked.set(true);
        await settle();
        expect(inputOf().checked).toBe(true);
        expect(onCheckedChange).toHaveBeenCalledTimes(1);
    });

    it("follows an owner who takes the change", async () => {
        let current: CheckedState | undefined;
        function Owner() {
            const [checked, setChecked] =
                useState<CheckedState>("indeterminate");
            current = checked;
            return (
                <Checkbox
                    aria-label="All"
                    checked={checked}
                    onCheckedChange={(details) => setChecked(details.checked)}
                />
            );
        }
        withRegistry(<Owner />);
        await settle();
        await click(inputOf());
        expect(current).toBe(true);
        expect(inputOf().checked).toBe(true);
        expect(inputOf().indeterminate).toBe(false);
        await click(inputOf());
        expect(inputOf().checked).toBe(false);
    });

    it("stays indeterminate when the owner ignores a click", async () => {
        withRegistry(<Checkbox aria-label="All" checked="indeterminate" />);
        await settle();
        await click(inputOf());
        expect(inputOf().indeterminate).toBe(true);
        expect(inputOf().checked).toBe(false);
    });
});

describe("Checkbox, forms", () => {
    it("submits its value under its name when checked", async () => {
        withRegistry(
            <form data-testid="form">
                <Checkbox
                    aria-label="a"
                    testId="a"
                    name="terms"
                    defaultChecked
                />
                <Checkbox aria-label="b" testId="b" name="news" value="yes" />
            </form>,
        );
        await settle();
        let data = new FormData(formOf());
        expect(data.get("terms")).toBe("on");
        expect(data.get("news")).toBeNull();

        await click(inputOf("b"));
        data = new FormData(formOf());
        expect(data.get("news")).toBe("yes");
    });

    it("resets uncontrolled state to its default, reporting the reset", async () => {
        const onCheckedChange = vi.fn();
        withRegistry(
            <form data-testid="form">
                <Checkbox
                    aria-label="Terms"
                    name="terms"
                    defaultChecked
                    onCheckedChange={onCheckedChange}
                />
            </form>,
        );
        await settle();
        await click(inputOf());
        expect(inputOf().checked).toBe(false);

        await resetForm();
        expect(inputOf().checked).toBe(true);
        expect(byTestId(ids.root).dataset.state).toBe("checked");
        expect(onCheckedChange).toHaveBeenLastCalledWith({
            checked: true,
            reason: "reset",
        });
    });

    it("asks controlled state to reset, leaving the input where the prop says", async () => {
        const onCheckedChange = vi.fn();
        withRegistry(
            <form data-testid="form">
                <Checkbox
                    aria-label="Terms"
                    checked
                    onCheckedChange={onCheckedChange}
                />
            </form>,
        );
        await settle();
        await resetForm();
        expect(inputOf().checked).toBe(true);
        expect(onCheckedChange).toHaveBeenCalledTimes(1);
        expect(onCheckedChange).toHaveBeenCalledWith({
            checked: false,
            reason: "reset",
        });
    });

    it("is disabled by its prop or any disabled fieldset around it", async () => {
        const disabled = outside(true);
        withRegistry(
            <>
                <Checkbox aria-label="a" testId="a" disabled />
                <disabled.Holder>
                    {(value) => (
                        <fieldset disabled={value}>
                            <fieldset>
                                <Checkbox aria-label="b" testId="b" />
                            </fieldset>
                        </fieldset>
                    )}
                </disabled.Holder>
            </>,
        );
        await settle();
        expect(inputOf("a").disabled).toBe(true);
        expect(inputOf("b").matches(":disabled")).toBe(true);
        expect(byTestId("b-root").dataset.disabled).toBe("");

        await disabled.set(false);
        await settle();
        expect(inputOf("b").matches(":disabled")).toBe(false);
        await click(inputOf("b"));
        expect(inputOf("b").checked).toBe(true);
    });
});

describe("Checkbox, compound parts", () => {
    it("compose under Root, the input taking its own props", async () => {
        const onCheckedChange = vi.fn();
        withRegistry(
            <Checkbox.Root
                testId="c"
                defaultChecked
                onCheckedChange={onCheckedChange}
            >
                <Checkbox.TouchTarget />
                <Checkbox.Input aria-label="Terms" unstyled />
                <Checkbox.Box>
                    <Checkbox.CheckIcon />
                    <Checkbox.IndeterminateIcon />
                </Checkbox.Box>
            </Checkbox.Root>,
        );
        await settle();
        expect(inputOf("c").checked).toBe(true);
        expect(inputOf("c").className).toBe("");
        expect(byTestId("c-box").className).toBe("checkbox__box");
        await click(inputOf("c"));
        expect(onCheckedChange).toHaveBeenCalledWith({ checked: false });
    });
});
