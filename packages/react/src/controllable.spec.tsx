import { act, screen } from "@testing-library/react";
import * as checkbox from "@zag-js/checkbox";
import { normalizeProps, useMachine } from "@zag-js/react";
import { useId, useState } from "react";
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
import { interact, mount, settle } from "./testing/render";

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
    const id = useId();
    const checked = useControllable<
        "checked",
        CheckedState,
        ChangeDetails<"checked", CheckedState>
    >("Checkbox", "checked", props);
    const [input, setInput] = useState<HTMLInputElement | null>(null);
    const fieldsetDisabled = useFieldsetDisabled(input);
    const service = useMachine(checkbox.machine, {
        id,
        name: props.name,
        disabled: props.disabled || fieldsetDisabled,
        ...checked.machineProps,
    });
    const api = checkbox.connect(service, normalizeProps);
    useFormReset(input, {
        resetsTo: checked.resetsTo === true,
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
    const { style: _style, ...hiddenInput } = api.getHiddenInputProps();
    return (
        <label
            data-testid="cb"
            {...api.getRootProps()}
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
                {...hiddenInput}
                style={OVERLAY}
            />
        </label>
    );
}

const formOf = () => screen.getByTestId<HTMLFormElement>("form");
const inputOf = () => screen.getByTestId<HTMLInputElement>("cb-input");
const resetForm = () => interact(async () => formOf().reset());

describe("useControllable", () => {
    it("lets uncontrolled state change on its own, calling back once", async () => {
        const onCheckedChange = vi.fn();
        mount(<Checkbox defaultChecked onCheckedChange={onCheckedChange} />);
        await settle();
        expect(inputOf().checked).toBe(true);
        await interact(() => userEvent.click(screen.getByTestId("cb")));
        expect(inputOf().checked).toBe(false);
        expect(onCheckedChange).toHaveBeenCalledTimes(1);
        expect(onCheckedChange).toHaveBeenCalledWith({ checked: false });
    });

    it("asks to change controlled state, and moves only with the prop", async () => {
        const onCheckedChange = vi.fn();
        let setChecked!: (checked: boolean) => void;
        function App() {
            const [checked, set] = useState(false);
            setChecked = set;
            return (
                <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
            );
        }
        mount(<App />);
        await settle();
        await interact(() => userEvent.click(screen.getByTestId("cb")));
        expect(onCheckedChange).toHaveBeenCalledWith({ checked: true });
        expect(screen.getByTestId("cb").dataset.state).toBe("unchecked");

        await interact(async () => setChecked(true));
        expect(screen.getByTestId("cb").dataset.state).toBe("checked");
        expect(onCheckedChange).toHaveBeenCalledTimes(1);
    });

    it("reads the default once", async () => {
        let setInitial!: (initial: boolean) => void;
        function App() {
            const [initial, set] = useState(true);
            setInitial = set;
            return <Checkbox defaultChecked={initial} />;
        }
        mount(<App />);
        await settle();
        await interact(async () => setInitial(false));
        expect(inputOf().checked).toBe(true);
    });

    it("warns once when the value prop switches between controlled and uncontrolled", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        // React's own warning about a native input switching, which our hidden input also does.
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        let setChecked!: (checked: boolean | undefined) => void;
        function App() {
            const [checked, set] = useState<boolean | undefined>(false);
            setChecked = set;
            return <Checkbox checked={checked} />;
        }
        mount(<App />);
        await settle();
        await interact(async () => setChecked(undefined));
        await interact(async () => setChecked(true));
        const ours = warn.mock.calls.filter(([message]) =>
            String(message).startsWith("pureform:"),
        );
        expect(ours).toHaveLength(1);
        expect(ours[0]![0]).toMatch(
            /Checkbox switched `checked` from controlled to uncontrolled/,
        );
        warn.mockRestore();
        error.mockRestore();
    });
});

describe("useFormReset", () => {
    it("puts uncontrolled state back to its default, reporting the reset", async () => {
        const onCheckedChange = vi.fn();
        mount(
            <form data-testid="form">
                <Checkbox
                    name="terms"
                    defaultChecked
                    onCheckedChange={onCheckedChange}
                />
            </form>,
        );
        await settle();
        expect(inputOf().defaultChecked).toBe(true);
        await interact(() => userEvent.click(screen.getByTestId("cb")));
        expect(inputOf().checked).toBe(false);
        expect(new FormData(formOf()).get("terms")).toBeNull();

        await resetForm();
        await settle();
        expect(inputOf().checked).toBe(true);
        expect(screen.getByTestId("cb").dataset.state).toBe("checked");
        expect(new FormData(formOf()).get("terms")).toBe("on");
        expect(onCheckedChange).toHaveBeenLastCalledWith({
            checked: true,
            reason: "reset",
        });

        await interact(() => userEvent.click(screen.getByTestId("cb")));
        expect(onCheckedChange).toHaveBeenLastCalledWith({ checked: false });
    });

    it("asks controlled state to reset, and leaves the input where the prop says", async () => {
        const onCheckedChange = vi.fn();
        mount(
            <form data-testid="form">
                <Checkbox
                    checked
                    onCheckedChange={onCheckedChange}
                    defaultChecked={false}
                />
            </form>,
        );
        await settle();
        expect(inputOf().defaultChecked).toBe(true);
        await resetForm();
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
        const onCheckedChange = vi.fn();
        function App() {
            const [checked, setChecked] = useState(false);
            return (
                <form data-testid="form">
                    <Checkbox
                        checked={checked}
                        defaultChecked={false}
                        onCheckedChange={(details) => {
                            onCheckedChange(details);
                            setChecked(details.checked === true);
                        }}
                    />
                </form>
            );
        }
        mount(<App />);
        await settle();
        await interact(() => userEvent.click(screen.getByTestId("cb")));
        expect(inputOf().checked).toBe(true);
        expect(onCheckedChange).toHaveBeenLastCalledWith({ checked: true });

        await resetForm();
        await settle();
        expect(onCheckedChange).toHaveBeenCalledTimes(2);
        expect(onCheckedChange).toHaveBeenLastCalledWith({
            checked: false,
            reason: "reset",
        });
        expect(inputOf().checked).toBe(false);
    });

    it("reports nothing when the value is already the default", async () => {
        const onCheckedChange = vi.fn();
        let setChecked!: (checked: boolean) => void;
        function App() {
            const [checked, set] = useState(true);
            setChecked = set;
            return (
                <form data-testid="form">
                    <Checkbox
                        checked={checked}
                        defaultChecked={false}
                        onCheckedChange={onCheckedChange}
                    />
                </form>
            );
        }
        mount(<App />);
        await settle();
        await interact(async () => setChecked(false));
        await resetForm();
        await settle();
        expect(onCheckedChange).not.toHaveBeenCalled();
        expect(inputOf().checked).toBe(false);
    });
});

describe("useFieldsetDisabled", () => {
    it("disables a control in a disabled fieldset, by the browser's rule", async () => {
        let setDisabled!: (disabled: boolean) => void;
        function App() {
            const [disabled, set] = useState(true);
            setDisabled = set;
            return (
                <fieldset disabled={disabled}>
                    <Checkbox />
                </fieldset>
            );
        }
        mount(<App />);
        await settle();
        await settle();
        expect(inputOf().disabled).toBe(true);
        expect(screen.getByTestId("cb").hasAttribute("data-disabled")).toBe(
            true,
        );
        await interact(async () => setDisabled(false));
        await settle();
        expect(screen.getByTestId("cb").hasAttribute("data-disabled")).toBe(
            false,
        );
    });
});

describe("useReducedMotion", () => {
    afterEach(() => commands.emulateReducedMotion("no-preference"));

    function Probe(props: { id: string }) {
        const reduce = useReducedMotion();
        return <span data-testid={props.id}>{String(reduce)}</span>;
    }

    it("follows the system under system, and the provider's reduce or full over it", async () => {
        mount(
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
            </>,
        );
        await settle();
        const read = () =>
            ["root", "reduce", "nested-system", "full"].map(
                (id) => screen.getByTestId(id).textContent,
            );
        expect(read()).toEqual(["false", "true", "true", "false"]);

        await act(() => commands.emulateReducedMotion("reduce"));
        await act(
            () => new Promise((resolve) => requestAnimationFrame(resolve)),
        );
        await settle();
        expect(read()).toEqual(["true", "true", "true", "false"]);
    });
});
