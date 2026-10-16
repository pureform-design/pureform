import * as checkbox from "@zag-js/checkbox";
import { trackFormControl as zagTrackFormControl } from "@zag-js/dom-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import {
    getFormOf,
    isFieldsetDisabled,
    setNativeDefault,
    trackFieldsetDisabled,
    trackFormControl,
    trackFormReset,
} from ".";
import { run, settle } from "../testing/vanilla";

const cleanups: VoidFunction[] = [];
afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup();
    document.body.innerHTML = "";
});

const html = (markup: string) => {
    const host = document.createElement("div");
    host.innerHTML = markup;
    document.body.append(host);
    return host;
};

const $ = <E extends Element = HTMLInputElement>(selector: string) =>
    document.querySelector<E>(selector)!;

const formData = (form: HTMLFormElement) =>
    [...new FormData(form)].map(([k, v]) => `${k}=${String(v)}`).join("&");

describe("setNativeDefault", () => {
    it("sets what each native control resets to", () => {
        html(`
            <form>
                <input id="check" type="checkbox" name="check" checked>
                <input id="radio-a" type="radio" name="radio" value="a" checked>
                <input id="radio-b" type="radio" name="radio" value="b">
                <input id="text" name="text" value="current">
                <input id="range" type="range" name="range" value="10">
                <textarea id="area" name="area">current</textarea>
                <select id="select" name="select" multiple>
                    <option value="a" selected>A</option>
                    <option value="b">B</option>
                    <option value="c">C</option>
                </select>
            </form>
        `);
        setNativeDefault($("#check"), false);
        setNativeDefault($("#radio-a"), false);
        setNativeDefault($("#radio-b"), true);
        setNativeDefault($("#text"), "default");
        setNativeDefault($("#range"), 40);
        setNativeDefault($("#area"), "default");
        setNativeDefault($("#select"), ["b", "c"]);

        const form = $<HTMLFormElement>("form");
        form.reset();
        expect(formData(form)).toBe(
            "radio=b&text=default&range=40&area=default&select=b&select=c",
        );
    });

    it("clears a value for null and undefined, and ignores other elements", () => {
        html(`<input id="text" value="x"><div id="div"></div>`);
        setNativeDefault($("#text"), undefined);
        expect($("#text").defaultValue).toBe("");
        setNativeDefault($("#div"), "x");
        setNativeDefault(null, "x");
        expect($("#div").outerHTML).toBe('<div id="div"></div>');
    });
});

describe("getFormOf", () => {
    it("follows a control's form attribute, else the closest form", () => {
        html(`
            <form id="outer"><div id="inside"></div></form>
            <input id="outside" form="outer">
            <div id="lost"></div>
        `);
        expect(getFormOf($("#outside"))?.id).toBe("outer");
        expect(getFormOf($("#inside"))?.id).toBe("outer");
        expect(getFormOf($("#lost"))).toBe(null);
    });
});

describe("trackFormReset", () => {
    it("runs before the browser's reset, then after it", async () => {
        html(`<form><input id="text" value="start"></form>`);
        const input = $("#text");
        input.value = "typed";
        const seen: string[] = [];
        cleanups.push(
            trackFormReset(input, {
                onBeforeReset: () => seen.push(`before:${input.value}`),
                onReset: () => seen.push(`after:${input.value}`),
            }),
        );
        $<HTMLFormElement>("form").reset();
        await settle();
        expect(seen).toEqual(["before:typed", "after:start"]);
    });

    it("follows a reset button the user clicks", async () => {
        html(
            `<form><input id="text" value="start"><button type="reset">Reset</button></form>`,
        );
        const input = $("#text");
        await userEvent.fill(input, "typed");
        const values: string[] = [];
        cleanups.push(
            trackFormReset(input, { onReset: () => values.push(input.value) }),
        );
        await userEvent.click($("button"));
        await settle();
        expect(values).toEqual(["start"]);
    });

    it("skips a reset a listener prevents", async () => {
        html(`<form><input id="text"></form>`);
        const onReset = vi.fn();
        cleanups.push(trackFormReset($("#text"), { onReset }));
        $("form").addEventListener("reset", (e) => e.preventDefault());
        $<HTMLFormElement>("form").reset();
        await settle();
        expect(onReset).not.toHaveBeenCalled();
    });

    it("follows a control outside its form", async () => {
        html(`<form id="f"></form><input id="text" form="f">`);
        const onReset = vi.fn();
        cleanups.push(trackFormReset($("#text"), { onReset }));
        $<HTMLFormElement>("form").reset();
        await settle();
        expect(onReset).toHaveBeenCalledOnce();
    });

    it("stops when cleaned up, including a pending reset", async () => {
        html(`<form><input id="text"></form>`);
        const onReset = vi.fn();
        const stop = trackFormReset($("#text"), { onReset });
        $<HTMLFormElement>("form").reset();
        stop();
        $<HTMLFormElement>("form").reset();
        await settle();
        expect(onReset).not.toHaveBeenCalled();
    });

    it("does nothing without a form", () => {
        html(`<input id="text">`);
        expect(() =>
            trackFormReset($("#text"), { onReset() {} })(),
        ).not.toThrow();
    });
});

// The fixtures name what the browser decides for a native input inside them.
const FIELDSET_FIXTURES = {
    "no fieldset": `<input id="probe">`,
    "an enabled fieldset": `<fieldset><input id="probe"></fieldset>`,
    "a disabled fieldset": `<fieldset disabled><input id="probe"></fieldset>`,
    "an enabled fieldset in a disabled one": `<fieldset disabled><fieldset><input id="probe"></fieldset></fieldset>`,
    "the first legend of a disabled fieldset": `<fieldset disabled><legend><input id="probe"></legend></fieldset>`,
    "the second legend of a disabled fieldset": `<fieldset disabled><legend></legend><legend><input id="probe"></legend></fieldset>`,
    "the first legend of a fieldset in a disabled one": `<fieldset disabled><fieldset disabled><legend><input id="probe"></legend></fieldset></fieldset>`,
};

describe("isFieldsetDisabled", () => {
    for (const [name, markup] of Object.entries(FIELDSET_FIXTURES)) {
        it(`agrees with the browser in ${name}`, () => {
            html(markup);
            const probe = $("#probe");
            expect(isFieldsetDisabled(probe)).toBe(probe.matches(":disabled"));
        });
    }

    it("is false for nothing", () => {
        expect(isFieldsetDisabled(null)).toBe(false);
    });

    // Why it doesn't use Zag's `trackFormControl`: Zag reads only the closest fieldset.
    it("differs from Zag's tracking where Zag misses a fieldset", () => {
        const zag = (markup: string) => {
            html(markup);
            let disabled = false;
            zagTrackFormControl($("#probe"), {
                onFieldsetDisabledChange: (d) => (disabled = d),
                onFormReset() {},
            })?.();
            document.body.innerHTML = "";
            return disabled;
        };
        expect(
            zag(FIELDSET_FIXTURES["an enabled fieldset in a disabled one"]),
        ).toBe(false);
        expect(
            zag(FIELDSET_FIXTURES["the first legend of a disabled fieldset"]),
        ).toBe(true);
    });
});

describe("trackFieldsetDisabled", () => {
    it("reports at the start and on every change", async () => {
        html(
            `<fieldset id="outer"><fieldset id="inner"><input id="probe"></fieldset></fieldset>`,
        );
        const changes: boolean[] = [];
        cleanups.push(
            trackFieldsetDisabled($("#probe"), (d) => changes.push(d)),
        );
        $<HTMLFieldSetElement>("#outer").disabled = true;
        await settle();
        $<HTMLFieldSetElement>("#inner").disabled = true;
        await settle();
        $<HTMLFieldSetElement>("#outer").disabled = false;
        await settle();
        $<HTMLFieldSetElement>("#inner").disabled = false;
        await settle();
        expect(changes).toEqual([false, true, false]);
    });

    it("follows a legend moving around the control", async () => {
        html(`<fieldset id="set" disabled><input id="probe"></fieldset>`);
        const changes: boolean[] = [];
        cleanups.push(
            trackFieldsetDisabled($("#probe"), (d) => changes.push(d)),
        );
        const legend = document.createElement("legend");
        $("#set").prepend(legend);
        legend.append($("#probe"));
        await settle();
        expect(changes).toEqual([true, false]);
    });

    it("reports once without a fieldset", () => {
        html(`<input id="probe">`);
        const onChange = vi.fn();
        trackFieldsetDisabled($("#probe"), onChange)();
        expect(onChange).toHaveBeenCalledExactlyOnceWith(false);
    });
});

describe("trackFormControl", () => {
    it("tracks both halves in Zag's shape", async () => {
        html(`<form><fieldset><input id="probe"></fieldset></form>`);
        const onFieldsetDisabledChange = vi.fn();
        const onFormReset = vi.fn();
        cleanups.push(
            trackFormControl($("#probe"), {
                onFieldsetDisabledChange,
                onFormReset,
            }),
        );
        $<HTMLFieldSetElement>("fieldset").disabled = true;
        $<HTMLFormElement>("form").reset();
        await settle();
        expect(onFieldsetDisabledChange.mock.calls).toEqual([[false], [true]]);
        expect(onFormReset).toHaveBeenCalledOnce();
    });
});

// How a binding wires these into a Zag machine: the native default is what a reset should
// show (`defaultChecked` when uncontrolled, the controlled value otherwise, since the owner
// decides), not Zag's current state, and the machine hears of the reset once the browser has
// run it.
describe("wired into Zag's checkbox", () => {
    function mountCheckbox(props: Partial<checkbox.Props>) {
        html(`<form><label id="root"><input id="input"></label></form>`);
        const root = $("#root");
        const input = $("#input");
        const resetsTo = () => (props.checked ?? props.defaultChecked) === true;
        const running = run(
            checkbox.machine,
            checkbox.connect,
            { id: "terms", name: "terms", ...props },
            (api, spread) => {
                spread(root, api.getRootProps());
                // Without Zag's visually hidden style, so the pointer can reach it.
                const { style, ...inputProps } = api.getHiddenInputProps();
                void style;
                spread(input, inputProps);
                // After Zag's props, which write the current state as the default.
                setNativeDefault(input, resetsTo());
            },
        );
        cleanups.push(running.stop);
        cleanups.push(
            trackFormReset(input, {
                onBeforeReset: () => setNativeDefault(input, resetsTo()),
                onReset: () =>
                    running.service.send({
                        type: "CHECKED.SET",
                        checked: props.defaultChecked ?? false,
                        isTrusted: true,
                    }),
            }),
        );
        return { ...running, input, form: $<HTMLFormElement>("form") };
    }

    it("puts an uncontrolled checkbox back to its default", async () => {
        const onCheckedChange = vi.fn();
        const { input, form, api } = mountCheckbox({
            defaultChecked: false,
            onCheckedChange,
        });
        await userEvent.click(input);
        await settle();
        expect(api().checked).toBe(true);
        expect(formData(form)).toBe("terms=on");

        form.reset();
        await settle();
        expect(input.checked).toBe(false);
        expect(api().checked).toBe(false);
        expect(formData(form)).toBe("");
        expect(onCheckedChange.mock.calls).toEqual([
            [{ checked: true }],
            [{ checked: false }],
        ]);
    });

    it("asks a controlled checkbox's owner, and keeps its state", async () => {
        const onCheckedChange = vi.fn();
        const { input, form, api } = mountCheckbox({
            checked: true,
            defaultChecked: false,
            onCheckedChange,
        });
        form.reset();
        await settle();
        expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith({
            checked: false,
        });
        expect(api().checked).toBe(true);
        expect(input.checked).toBe(true);
    });
});
