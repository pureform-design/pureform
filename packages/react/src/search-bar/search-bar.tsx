// The search bar: Root, a `<label>` on pureform's text field machine, around an optional leading
// icon, the native search input, and optional trailing icons or actions, and the ready-made
// SearchBar over them. The whole bar is the hit area. The binding owns the form reset.

import { searchBarAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    SEARCH_BAR_CONTENT_PROPS,
    SEARCH_BAR_INPUT_PROPS,
    SEARCH_BAR_ROOT_PROPS,
    searchBarMachineProps,
    searchBarSelection,
    textFieldNativeDefault,
} from "@pureform/binding-core";
import type {
    SearchBarContentProps,
    SearchBarRootOwnProps,
} from "@pureform/binding-core";
import { syncTextInput } from "@pureform/binding-core/dom";
import * as textField from "@pureform/machines/text-field";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    type ChangeEvent,
    type ElementType,
    type ReactNode,
    useCallback,
    useId,
    useLayoutEffect,
    useRef,
    useState,
} from "react";

import { useControllable } from "../controllable";
import { useFormReset } from "../form";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { combinePartProps, omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof searchBarAnatomy;

/** What Root shares with its parts. */
interface SearchBarContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: textField.Api<PropTypes>;
    readonly setInput: (input: HTMLInputElement | null) => void;
    /** Puts the input back to the controlled value after typing; see `Input`. Stable. */
    readonly restoreInput: (input: HTMLInputElement) => void;
}

const context = createPartContext<SearchBarContextValue>("SearchBar");

/** Root's props: the tokens, the machine's props (`value`, `placeholder`, `name`, …), `testId`
 *  and `unstyled` for every part, `as`, and the element's own props. */
export interface SearchBarRootProps
    extends
        Omit<PartProps, keyof SearchBarRootOwnProps>,
        SearchBarRootOwnProps {
    /** Another element or component to render instead of `<label>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface SearchBarPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A leading or trailing part's props: a part's, and `mirror` to flip an icon under `rtl`. */
export interface SearchBarIconProps extends SearchBarPartProps {
    readonly mirror?: boolean | undefined;
}

/** The search bar's root: a `<label>` around the input, so a press anywhere on the bar focuses
 *  it. */
function Root(props: SearchBarRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const value = useControllable<"value", string>("SearchBar", "value", props);
    const [input, setInput] = useState<HTMLInputElement | null>(null);
    const service = useMachine(textField.machine, {
        id,
        dir,
        ...searchBarMachineProps(props),
        ...value.machineProps,
    });
    const api = textField.connect(service, normalizeProps);
    useFormReset(input, {
        resetsTo: textFieldNativeDefault(value.resetsTo),
        onBeforeReset: value.beforeReset,
        onReset: () =>
            value.reset(() =>
                service.send({
                    type: "RESET",
                    value: value.defaultValue ?? "",
                }),
            ),
    });
    // The controlled value as last committed, read after typing rather than captured by it.
    const control = useRef({
        controlled: value.controlled,
        value: value.value,
    });
    useLayoutEffect(() => {
        control.current = { controlled: value.controlled, value: value.value };
    });
    const restoreInput = useCallback((element: HTMLInputElement) => {
        const { controlled, value: current } = control.current;
        if (controlled && current !== undefined)
            syncTextInput(element, current);
    }, []);
    const scope = useComponent(searchBarAnatomy, {
        selection: searchBarSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, ...rest } = omitProps(props, SEARCH_BAR_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, api, setInput, restoreInput }}>
            {scope.render("root", {
                element: "label",
                as,
                machine: api.getRootProps(),
                props: rest,
            })}
        </context.Provider>
    );
}

/** An icon before the input, such as a magnifier, hidden from assistive technology. */
function Leading({
    unstyled,
    mirror,
    ...props
}: SearchBarIconProps): ReactNode {
    const { scope } = context.use("Leading");
    return scope.render("leading", {
        element: "span",
        machine: { "aria-hidden": "true" },
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** The native search input: it takes the typing and submits with the form. Name it here
 *  (`aria-label`). */
function Input({ unstyled, ...props }: SearchBarPartProps): ReactNode {
    const { scope, api, setInput, restoreInput } = context.use("Input");
    // The browser shows the typed text before the machine hears of it. Once the machine has sent
    // the change and told the owner, a controlled input is put back to the value last committed;
    // the owner's update, if any, has moved it already.
    const onChange = (event: ChangeEvent<HTMLInputElement>) => {
        const element = event.currentTarget;
        queueMicrotask(() => restoreInput(element));
    };
    return scope.render("input", {
        element: "input",
        machine: combinePartProps([
            api.getInputProps() as Readonly<Record<string, unknown>>,
            { type: "search", onChange },
        ]),
        ref: setInput as (element: HTMLElement | null) => void,
        unstyled,
        props,
    });
}

/** Icons, icon buttons, or an avatar after the input. Hide a decorative icon in it yourself
 *  (`aria-hidden`); an action in it stays reachable. */
function Trailing({
    unstyled,
    mirror,
    ...props
}: SearchBarIconProps): ReactNode {
    const { scope } = context.use("Trailing");
    return scope.render("trailing", {
        element: "span",
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** The ready-made search bar's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part, and its content; `aria-label`, `aria-labelledby`, `aria-describedby`, `list`, and the
 *  autocomplete's ARIA go on the input. */
export interface SearchBarProps
    extends
        Omit<SearchBarRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        SearchBarContentProps<ReactNode> {
    readonly list?: string | undefined;
}

/** The ready-made search bar: the input, with the leading and trailing parts only when given. */
function ReadyMade(props: SearchBarProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        ...rest
    } = props;
    const rootProps = omitProps(rest, [
        ...SEARCH_BAR_CONTENT_PROPS,
        ...SEARCH_BAR_INPUT_PROPS,
    ]);
    const inputProps: Record<string, unknown> = {};
    for (const key of SEARCH_BAR_INPUT_PROPS)
        inputProps[key] = (props as Record<string, unknown>)[key];
    const slot = useSlotProps(props);
    return (
        <Root {...rootProps} {...(slot("root") as object)}>
            {isPresent(props.leading) ? (
                <Leading mirror={props.mirrorLeading} {...slot("leading")}>
                    {props.leading}
                </Leading>
            ) : null}
            <Input {...inputProps} {...slot("input")} />
            {isPresent(props.trailing) ? (
                <Trailing mirror={props.mirrorTrailing} {...slot("trailing")}>
                    {props.trailing}
                </Trailing>
            ) : null}
        </Root>
    );
}

/** Material's search bar. Use it ready-made, `<SearchBar aria-label="Search mail"
 *  placeholder="Search mail" leading={<SearchIcon />} />`, or compose its parts under
 *  `SearchBar.Root`: `Leading`, `Input`, then `Trailing`. */
export const SearchBar = Object.assign(ReadyMade, {
    Root,
    Leading,
    Input,
    Trailing,
});
