// The search bar: Root, a `<label>` on pureform's text field machine, around an optional leading
// icon, the native search input, and optional trailing icons or actions, and the ready-made
// SearchBar over them. The whole bar is the hit area. The binding owns the form reset.

import { searchBarAnatomy } from "@pureform/anatomy";
import {
    isPresent,
    SEARCH_BAR_CONTENT_PROPS,
    SEARCH_BAR_INPUT_PROPS,
    SEARCH_BAR_ROOT_PROPS,
    searchBarSelection,
} from "@pureform/binding-core";
import type {
    SearchBarContentProps,
    SearchBarRootOwnProps,
} from "@pureform/binding-core";
import { textFieldNativeDefault } from "@pureform/binding-web";
import { searchBarMachineProps } from "@pureform/binding-web";
import { syncTextInput } from "@pureform/binding-web";
import * as textField from "@pureform/machines/text-field";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createSignal,
    createUniqueId,
    flush,
    omit,
    Show,
    untrack,
} from "solid-js";

import { useControllable } from "../controllable";
import { useFormReset } from "../form";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { combinePartProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

type Anatomy = typeof searchBarAnatomy;

/** What Root shares with its parts. */
interface SearchBarContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<textField.Api<PropTypes>>;
    readonly setInput: (input: HTMLInputElement) => void;
}

const context = createPartContext<SearchBarContextValue>("SearchBar");

/** Root's props: the tokens, the machine's props (`value`, `placeholder`, `name`, …), `testId`
 *  and `unstyled` for every part, `as`, and the element's own props. */
export interface SearchBarRootProps
    extends
        Omit<PartProps, keyof SearchBarRootOwnProps>,
        SearchBarRootOwnProps {
    /** Another element or component to render instead of `<label>`. */
    readonly as?: ValidComponent | undefined;
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
function Root(props: SearchBarRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const value = useControllable<"value", string>("SearchBar", "value", props);
    const [input, setInput] = createSignal<HTMLInputElement | undefined>(
        undefined,
        { ownedWrite: true },
    );
    const service = useMachine(textField.machine, () => ({
        id,
        dir: dir(),
        ...searchBarMachineProps(props),
        ...value.machineProps(),
    }));
    const api = createMemo(() => textField.connect(service, normalizeProps));
    useFormReset(input, {
        resetsTo: () => textFieldNativeDefault(value.resetsTo()),
        onBeforeReset: value.beforeReset,
        onReset: () =>
            value.reset(() =>
                service.send({
                    type: "RESET",
                    value: value.defaultValue ?? "",
                }),
            ),
    });
    const scope = useComponent(searchBarAnatomy, {
        selection: () => searchBarSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return (
        <context.Provider value={{ scope, api, setInput }}>
            {scope.render("root", {
                element: "label",
                as: () => props.as,
                machine: () => api().getRootProps(),
                props: omit(props, "as", ...SEARCH_BAR_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** An icon before the input, such as a magnifier, hidden from assistive technology. */
function Leading(props: SearchBarIconProps): JSX.Element {
    const { scope } = context.use("Leading");
    return scope.render("leading", {
        element: "span",
        machine: () => ({ "aria-hidden": "true" }),
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "mirror"),
    });
}

/** The native search input: it takes the typing and submits with the form. Name it here
 *  (`aria-label`). */
function Input(props: SearchBarPartProps): JSX.Element {
    const { scope, api, setInput } = context.use("Input");
    // The browser shows the typed text before the machine hears of it. Once the machine has sent
    // the change and the owner's update has applied, the input is put back to the machine's
    // value, so a controlled search bar the owner didn't change doesn't move.
    const onInput = (event: InputEvent) => {
        const element = event.currentTarget as HTMLInputElement;
        queueMicrotask(() => {
            flush();
            syncTextInput(
                element,
                untrack(() => api().value),
            );
        });
    };
    return scope.render("input", {
        element: "input",
        machine: () =>
            combinePartProps([
                api().getInputProps() as Readonly<Record<string, unknown>>,
                { type: "search", onInput },
            ]),
        ref: (element) => setInput(element as HTMLInputElement),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** Icons, icon buttons, or an avatar after the input. Hide a decorative icon in it yourself
 *  (`aria-hidden`); an action in it stays reachable. */
function Trailing(props: SearchBarIconProps): JSX.Element {
    const { scope } = context.use("Trailing");
    return scope.render("trailing", {
        element: "span",
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled", "mirror"),
    });
}

/** The ready-made search bar's props: Root's, with `class`, `style`, and `slotProps` keyed by
 *  part, and its content; `aria-label`, `aria-labelledby`, `aria-describedby`, `list`, and the
 *  autocomplete's ARIA go on the input. */
export interface SearchBarProps
    extends
        Omit<SearchBarRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        SearchBarContentProps<JSX.Element> {
    readonly list?: string | undefined;
}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...SEARCH_BAR_CONTENT_PROPS,
    ...SEARCH_BAR_INPUT_PROPS,
] as const;

/** The ready-made search bar: the input, with the leading and trailing parts only when given. */
function ReadyMade(props: SearchBarProps): JSX.Element {
    const inputProps = () => {
        const picked: Record<string, unknown> = {};
        for (const key of SEARCH_BAR_INPUT_PROPS)
            picked[key] = (props as Record<string, unknown>)[key];
        return picked;
    };
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as SearchBarRootProps;
    const root = slots("root") as object;
    const leading = slots("leading");
    const input = slots("input");
    const trailing = slots("trailing");
    return (
        <Root {...own} {...root}>
            <Show when={isPresent(props.leading)}>
                <Leading mirror={props.mirrorLeading} {...leading}>
                    {props.leading}
                </Leading>
            </Show>
            <Input {...inputProps()} {...input} />
            <Show when={isPresent(props.trailing)}>
                <Trailing mirror={props.mirrorTrailing} {...trailing}>
                    {props.trailing}
                </Trailing>
            </Show>
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
