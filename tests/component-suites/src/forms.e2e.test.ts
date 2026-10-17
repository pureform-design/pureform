// The forms rules (design doc §9.5), for every component that takes part in a form: it submits
// its entries, a reset puts its state back to the default (the binding owns it, not Zag), a
// disabled fieldset disables it by the browser's rule, and `required`, `invalid`, and `error`
// validate as the native control does.

import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { harness } from "#binding";

import { COMPONENTS } from "./components";
import type { ComponentCase, FormCase } from "./components";
import type { Mounted } from "./harness/harness";
import {
    afterReset,
    hostIn,
    mountCase,
    stateNames,
    submitted,
} from "./harness/page";

const controls = COMPONENTS.filter(
    (component): component is ComponentCase & { form: FormCase } =>
        component.form !== undefined,
);

/** A form around a host, with a plain submit button when the component isn't one. */
const inForm = (inner = "<div data-host></div>") => {
    const host = hostIn(
        `<form data-form>${inner}<button data-submit type="submit">Submit</button></form>`,
    );
    const form = host.closest("form")!;
    return { host, form };
};

/** Submits the form the way the component takes part: by clicking it when it's the submitter,
 *  else with the form's own submit button. */
const submit = (
    component: ComponentCase & { form: FormCase },
    host: HTMLElement,
) => {
    const form = host.closest("form")!;
    return submitted(form, async () => {
        const by = component.form.submitter
            ? component.form.control(host)
            : form.querySelector<HTMLButtonElement>("[data-submit]")!;
        await userEvent.click(by, { force: true });
    });
};

describe.each(controls)("$component", (component) => {
    const form = component.form;

    describe("submitting", () => {
        it("adds its entries to the form's data", async () => {
            const { host } = inForm();
            mountCase(component, form.submits.props, { host });
            expect(await submit(component, host)).toEqual(form.submits.entries);
        });

        it.runIf(form.omits)("adds nothing when it isn't on", async () => {
            const { host } = inForm();
            mountCase(component, form.omits, { host });
            expect(await submit(component, host)).toEqual([]);
        });

        it("submits a form it names with `form` from outside it", async () => {
            const host = hostIn(`<div><div data-host></div></div>`);
            const outside = document.createElement("form");
            outside.id = "outside";
            outside.innerHTML = `<button data-submit type="submit">Submit</button>`;
            document.body.append(outside);
            mountCase(
                component,
                { ...form.submits.props, form: "outside" },
                { host },
            );
            expect(form.control(host).form).toBe(outside);
            const entries = await submitted(outside, () =>
                userEvent.click(
                    form.submitter
                        ? form.control(host)
                        : outside.querySelector<HTMLButtonElement>(
                              "[data-submit]",
                          )!,
                    { force: true },
                ),
            );
            expect(entries).toEqual(form.submits.entries);
        });
    });

    describe.runIf(form.resets && component.state)("reset", () => {
        // Collected even when skipped: a component without a state has nothing to reset.
        const state = component.state;
        if (!state) return;
        const names = stateNames(state.prop);

        it("uncontrolled: goes back to the default, reported with reason reset", async () => {
            const { host, form: element } = inForm();
            const onChange = vi.fn();
            mountCase(
                component,
                {
                    ...state.props,
                    [names.defaultValue]: state.from,
                    [names.onChange]: onChange,
                },
                { host },
            );
            await state.act(host);
            await harness.settle();
            expect(state.read(host)).toEqual(state.to);
            element.reset();
            await afterReset();
            expect(state.read(host)).toEqual(state.from);
            expect(onChange).toHaveBeenCalledTimes(2);
            expect(onChange.mock.calls[1]![0]).toEqual({
                [state.prop]: state.from,
                reason: "reset",
            });
        });

        it("controlled: asks for the default, and moves when the owner takes it", async () => {
            const { host, form: element } = inForm();
            let scene!: Mounted;
            const onChange = vi.fn((details: Record<string, unknown>) => {
                void scene.update({ [names.value]: details[state.prop] });
            });
            scene = mountCase(
                component,
                {
                    ...state.props,
                    [names.value]: state.to,
                    [names.defaultValue]: state.from,
                    [names.onChange]: onChange,
                },
                { host },
            );
            element.reset();
            await afterReset();
            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange.mock.calls[0]![0]).toEqual({
                [state.prop]: state.from,
                reason: "reset",
            });
            expect(state.read(host)).toEqual(state.from);
        });

        it("controlled: stays put when the owner ignores the reset", async () => {
            const { host, form: element } = inForm();
            const onChange = vi.fn();
            mountCase(
                component,
                {
                    ...state.props,
                    [names.value]: state.to,
                    [names.defaultValue]: state.from,
                    [names.onChange]: onChange,
                },
                { host },
            );
            element.reset();
            await afterReset();
            expect(onChange).toHaveBeenCalledTimes(1);
            expect(state.read(host)).toEqual(state.to);
        });

        it("a reset button in the form resets it", async () => {
            const { host, form: element } = inForm();
            const reset = document.createElement("button");
            reset.type = "reset";
            reset.textContent = "Reset";
            element.append(reset);
            mountCase(
                component,
                { ...state.props, [names.defaultValue]: state.from },
                { host },
            );
            await state.act(host);
            await harness.settle();
            await userEvent.click(reset);
            await afterReset();
            expect(state.read(host)).toEqual(state.from);
        });
    });

    describe("disabled fieldsets", () => {
        const expectDisabled = async (host: HTMLElement, disabled: boolean) => {
            await harness.settle();
            expect(form.control(host).matches(":disabled")).toBe(disabled);
            expect(form.disabled(host)).toBe(disabled);
        };

        it("a disabled fieldset disables it, and leaves it out of the form's data", async () => {
            const { host } = inForm(
                `<fieldset disabled><div data-host></div></fieldset>`,
            );
            mountCase(component, form.submits.props, { host });
            await expectDisabled(host, true);
            const entries = await submitted(host.closest("form")!, () =>
                host.closest("form")!.requestSubmit(),
            );
            expect(entries).toEqual([]);
        });

        it("a disabled fieldset around an enabled one disables it", async () => {
            const { host } = inForm(
                `<fieldset disabled><fieldset><div data-host></div></fieldset></fieldset>`,
            );
            mountCase(component, form.submits.props, { host });
            await expectDisabled(host, true);
        });

        it("the first legend of a disabled fieldset stays enabled", async () => {
            const { host } = inForm(
                `<fieldset disabled><legend><div data-host></div></legend></fieldset>`,
            );
            mountCase(component, form.submits.props, { host });
            await expectDisabled(host, false);
        });

        it("follows the fieldset when it changes", async () => {
            const { host } = inForm(
                `<fieldset><div data-host></div></fieldset>`,
            );
            mountCase(component, form.submits.props, { host });
            const fieldset = host.closest("fieldset")!;
            await expectDisabled(host, false);
            fieldset.disabled = true;
            await expectDisabled(host, true);
            fieldset.disabled = false;
            await expectDisabled(host, false);
        });

        it.runIf(component.state)(
            "ignores the user while disabled",
            async () => {
                const state = component.state!;
                const names = stateNames(state.prop);
                const { host } = inForm(
                    `<fieldset disabled><div data-host></div></fieldset>`,
                );
                const onChange = vi.fn();
                mountCase(
                    component,
                    {
                        ...state.props,
                        [names.defaultValue]: state.from,
                        [names.onChange]: onChange,
                    },
                    { host },
                );
                await harness.settle();
                await state.act(host, { force: true });
                await harness.settle();
                expect(state.read(host)).toEqual(state.from);
                expect(onChange).not.toHaveBeenCalled();
            },
        );
    });

    describe("validation", () => {
        it.runIf(form.required)(
            "`required` blocks submitting until it's satisfied",
            async () => {
                const required = form.required!;
                const { host, form: element } = inForm();
                mountCase(component, required.props, { host });
                expect(form.control(host).matches(":required")).toBe(true);
                expect(element.checkValidity()).toBe(false);
                expect(
                    await submitted(element, () => element.requestSubmit()),
                ).toBeNull();
                await required.satisfy(host);
                await harness.settle();
                expect(element.checkValidity()).toBe(true);
                expect(
                    await submitted(element, () => element.requestSubmit()),
                ).not.toBeNull();
            },
        );

        it.runIf(form.invalid)(
            "`invalid` marks the control with aria-invalid",
            async () => {
                const { host } = inForm();
                const scene = mountCase(component, form.invalid!.props, {
                    host,
                });
                expect(form.control(host).getAttribute("aria-invalid")).toBe(
                    "true",
                );
                await scene.update({ invalid: false });
                expect(
                    form.control(host).getAttribute("aria-invalid"),
                ).not.toBe("true");
            },
        );

        it.runIf(form.error)(
            "`error` blocks submitting with its message",
            async () => {
                const error = form.error!;
                const { host, form: element } = inForm();
                mountCase(component, error.props, { host });
                expect(form.control(host).getAttribute("aria-invalid")).toBe(
                    "true",
                );
                expect(form.control(host).validationMessage).toBe(
                    error.message,
                );
                expect(
                    await submitted(element, () => element.requestSubmit()),
                ).toBeNull();
            },
        );
    });
});

// No component takes `error` yet: the text inputs bring it (p6b), and their cases set
// `form.error`, which runs the case above.
if (!controls.some((component) => component.form.error)) {
    it.todo(
        "`error` blocks submitting with its message (no component takes `error` yet; p6b)",
    );
}
