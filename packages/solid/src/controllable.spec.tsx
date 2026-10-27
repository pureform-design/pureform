import * as checkbox from "@zag-js/checkbox";
import { createMemo, createSignal, createUniqueId, flush } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";

import {
    PureformProvider,
    useControllable,
    useFieldsetDisabled,
    useFormReset,
    useReducedMotion,
} from ".";
import type { ChangeDetails, Controllable } from ".";
import { normalizeProps, useMachine } from "./internal/zag";
import { byTestId, mount, settle } from "./testing/mount";

// The preset's `input` slot: a native input stretched invisibly over the control.
const OVERLAY = {
    position: "absolute",
    inset: "0",
    opacity: "0",
    margin: "0",
} as const;

type CheckedState = boolean | "indeterminate";

interface CheckboxProps extends Controllable<"checked", CheckedState> {
    name?: string;
    disabled?: boolean;
}

// The checkbox as the components phase wires it: controllable props onto Zag, the form reset
// recipe, and the fieldset rule.
function Checkbox(props: CheckboxProps) {
    const id = createUniqueId();
    const checked = useControllable<
        "checked",
        CheckedState,
        ChangeDetails<"checked", CheckedState>
    >("Checkbox", "checked", props);
    const [input, setInput] = createSignal<HTMLInputElement | undefined>(
        undefined,
        {
            ownedWrite: true,
        },
    );
    const fieldsetDisabled = useFieldsetDisabled(input);
    const service = useMachine(checkbox.machine, () => ({
        id,
        name: props.name,
        disabled: props.disabled || fieldsetDisabled(),
        ...checked.machineProps(),
    }));
    const api = createMemo(() => checkbox.connect(service, normalizeProps));
    useFormReset(input, {
        resetsTo: () => checked.resetsTo() === true,
        onBeforeReset: checked.beforeReset,
        onReset: () =>
            checked.reset(() =>
                service.send({
                    type: "CHECKED.SET",
                    checked: checked.defaultValue ?? false,
                    isTrusted: true,
                }),
            ),
    });
    const hiddenInput = () => {
        const { style, ...rest } = api().getHiddenInputProps();
        void style;
        return rest;
    };
    return (
        <label
            data-testid="cb"
            {...api().getRootProps()}
            style={{
                position: "relative",
                display: "inline-block",
                width: "40px",
                height: "40px",
            }}
        >
            <input
                data-testid="cb-input"
                ref={setInput}
                {...hiddenInput()}
                style={OVERLAY}
            />
        </label>
    );
}

const formOf = () => byTestId<HTMLFormElement>("form");
const inputOf = () => byTestId<HTMLInputElement>("cb-input");

describe("useControllable", () => {
    it("lets uncontrolled state change on its own, calling back once", async () => {
        const onCheckedChange =
            vi.fn<(details: ChangeDetails<"checked", CheckedState>) => void>();
        mount(() => (
            <Checkbox defaultChecked onCheckedChange={onCheckedChange} />
        ));
        await settle();
        expect(inputOf().checked).toBe(true);
        await userEvent.click(byTestId("cb"));
        await settle();
        expect(inputOf().checked).toBe(false);
        expect(onCheckedChange).toHaveBeenCalledTimes(1);
        expect(onCheckedChange).toHaveBeenCalledWith({ checked: false });
    });

    it("asks to change controlled state, and moves only with the prop", async () => {
        const [checked, setChecked] = createSignal(false);
        const onCheckedChange =
            vi.fn<(details: ChangeDetails<"checked", CheckedState>) => void>();
        mount(() => (
            <Checkbox checked={checked()} onCheckedChange={onCheckedChange} />
        ));
        await settle();
        await userEvent.click(byTestId("cb"));
        await settle();
        expect(onCheckedChange).toHaveBeenCalledWith({ checked: true });
        expect(byTestId("cb").dataset.state).toBe("unchecked");

        setChecked(true);
        await settle();
        expect(byTestId("cb").dataset.state).toBe("checked");
        expect(onCheckedChange).toHaveBeenCalledTimes(1);
    });

    it("reads the default once", async () => {
        const [initial, setInitial] = createSignal(true);
        mount(() => <Checkbox defaultChecked={initial()} />);
        await settle();
        setInitial(false);
        await settle();
        expect(inputOf().checked).toBe(true);
    });

    it("warns once when the value prop switches between controlled and uncontrolled", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const [checked, setChecked] = createSignal<boolean | undefined>(false);
        mount(() => <Checkbox checked={checked()} />);
        await settle();
        setChecked(undefined);
        await settle();
        setChecked(true);
        await settle();
        const ours = warn.mock.calls.filter(([message]) =>
            String(message).startsWith("pureform:"),
        );
        expect(ours).toHaveLength(1);
        expect(ours[0]![0]).toMatch(
            /Checkbox switched `checked` from controlled to uncontrolled/,
        );
        warn.mockRestore();
    });
});

describe("useFormReset", () => {
    it("puts uncontrolled state back to its default, reporting the reset", async () => {
        const onCheckedChange =
            vi.fn<(details: ChangeDetails<"checked", CheckedState>) => void>();
        mount(() => (
            <form data-testid="form">
                <Checkbox
                    name="terms"
                    defaultChecked
                    onCheckedChange={onCheckedChange}
                />
            </form>
        ));
        await settle();
        expect(inputOf().defaultChecked).toBe(true);
        await userEvent.click(byTestId("cb"));
        await settle();
        expect(inputOf().checked).toBe(false);
        expect(new FormData(formOf()).get("terms")).toBeNull();

        formOf().reset();
        await settle();
        await settle();
        expect(inputOf().checked).toBe(true);
        expect(byTestId("cb").dataset.state).toBe("checked");
        expect(new FormData(formOf()).get("terms")).toBe("on");
        expect(onCheckedChange).toHaveBeenLastCalledWith({
            checked: true,
            reason: "reset",
        });

        await userEvent.click(byTestId("cb"));
        await settle();
        expect(onCheckedChange).toHaveBeenLastCalledWith({ checked: false });
    });

    it("asks controlled state to reset, and leaves the input where the prop says", async () => {
        const onCheckedChange =
            vi.fn<(details: ChangeDetails<"checked", CheckedState>) => void>();
        mount(() => (
            <form data-testid="form">
                <Checkbox
                    checked
                    onCheckedChange={onCheckedChange}
                    defaultChecked={false}
                />
            </form>
        ));
        await settle();
        expect(inputOf().defaultChecked).toBe(true);
        formOf().reset();
        await settle();
        await settle();
        expect(inputOf().checked).toBe(true);
        expect(onCheckedChange).toHaveBeenCalledTimes(1);
        expect(onCheckedChange).toHaveBeenCalledWith({
            checked: false,
            reason: "reset",
        });
    });
});

describe("useFormReset, controlled", () => {
    it("reports the default, not the value the machine was created with", async () => {
        const [checked, setChecked] = createSignal(false);
        const onCheckedChange = vi.fn<
            (details: ChangeDetails<"checked", CheckedState>) => void
        >((details: { checked: CheckedState }) =>
            setChecked(details.checked === true),
        );
        mount(() => (
            <form data-testid="form">
                <Checkbox
                    checked={checked()}
                    defaultChecked={false}
                    onCheckedChange={onCheckedChange}
                />
            </form>
        ));
        await settle();
        await userEvent.click(byTestId("cb"));
        await settle();
        expect(inputOf().checked).toBe(true);
        expect(onCheckedChange).toHaveBeenLastCalledWith({ checked: true });

        formOf().reset();
        await settle();
        await settle();
        expect(onCheckedChange).toHaveBeenCalledTimes(2);
        expect(onCheckedChange).toHaveBeenLastCalledWith({
            checked: false,
            reason: "reset",
        });
        expect(inputOf().checked).toBe(false);
    });

    it("reports nothing when the value is already the default", async () => {
        const [checked, setChecked] = createSignal(true);
        const onCheckedChange =
            vi.fn<(details: ChangeDetails<"checked", CheckedState>) => void>();
        mount(() => (
            <form data-testid="form">
                <Checkbox
                    checked={checked()}
                    defaultChecked={false}
                    onCheckedChange={onCheckedChange}
                />
            </form>
        ));
        await settle();
        setChecked(false);
        await settle();
        formOf().reset();
        await settle();
        await settle();
        expect(onCheckedChange).not.toHaveBeenCalled();
        expect(inputOf().checked).toBe(false);
    });
});

describe("useFieldsetDisabled", () => {
    it("disables a control in a disabled fieldset, by the browser's rule", async () => {
        const [disabled, setDisabled] = createSignal(true);
        mount(() => (
            <fieldset disabled={disabled()}>
                <Checkbox />
            </fieldset>
        ));
        await settle();
        await settle();
        expect(inputOf().disabled).toBe(true);
        expect(byTestId("cb").hasAttribute("data-disabled")).toBe(true);
        setDisabled(false);
        flush();
        await settle();
        await settle();
        expect(byTestId("cb").hasAttribute("data-disabled")).toBe(false);
    });
});

describe("useReducedMotion", () => {
    afterEach(() => commands.emulateReducedMotion("no-preference"));

    function Probe(props: { id: string }) {
        const reduce = useReducedMotion();
        return <span data-testid={props.id}>{String(reduce())}</span>;
    }

    it("follows the system under system, and the provider's reduce or full over it", async () => {
        mount(() => (
            <>
                <Probe id="root" />
                <PureformProvider motion="reduce">
                    <Probe id="reduce" />
                    <PureformProvider motion="system">
                        <Probe id="nested-system" />
                    </PureformProvider>
                    <PureformProvider motion="full">
                        <Probe id="full" />
                    </PureformProvider>
                </PureformProvider>
            </>
        ));
        await settle();
        const read = () =>
            ["root", "reduce", "nested-system", "full"].map(
                (id) => byTestId(id).textContent,
            );
        expect(read()).toEqual(["false", "true", "true", "false"]);

        await commands.emulateReducedMotion("reduce");
        await new Promise((resolve) => requestAnimationFrame(resolve));
        await settle();
        expect(read()).toEqual(["true", "true", "true", "false"]);
    });
});
