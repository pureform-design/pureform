// What a component's parts are built from. `useComponent` ties an anatomy to the registry: one
// `useClasses` call for every slot. Each part's props then merge, in order: the machine's part
// props, `data-scope`/`data-pf-part`/`data-testid`, the `data-pf-*` state attributes, the
// registry's class and token style, the provider's `slotProps`, and the user's props. Classes and
// styles combine (registry first), handlers all run, and other keys take the last defined value.

import type {
    ComponentAnatomy,
    IndicationAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import {
    forSlot,
    isIconPart,
    isPresent,
    isUnstyled,
    partSources,
    withProvidedTokens,
} from "@pureform/binding-core";
import type { PartStates, SlotKeyed, Unstyled } from "@pureform/binding-core";
import { componentIndicationTokens } from "@pureform/binding-core/indication";
import type { Indication } from "@pureform/binding-core/indication";
import type { InteractionSource } from "@pureform/binding-core/interaction";
import { indicationRoles } from "@pureform/binding-dom/indication";
import type {
    ClassSlots,
    ComponentName,
    Selection,
    SlotClasses,
} from "@pureform/styling";
import { dynamic } from "@solidjs/web";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    $PROXY,
    type Accessor,
    createMemo,
    createSignal,
    isStatic,
    merge,
    omit,
    Show,
    untrack,
} from "solid-js";

import { useClasses } from "./classes";
import { IconPartContext } from "./icon-style";
import { createIndicationScope, usePartIndication } from "./indication";
import type { IndicationScope } from "./indication";
import { combinePartProps } from "./props";
import type { PartProps } from "./props";
import { useProvidedTokens } from "./provided-tokens";
import { usePureform } from "./provider";

type Dict = Readonly<Record<string, unknown>>;

/** The registry name an anatomy's component is registered under. */
export type ComponentOf<A extends ComponentAnatomy> = A["name"] & ComponentName;

/** What `useComponent` takes, as accessors over Root's props. */
export interface ComponentOptions<A extends ComponentAnatomy> {
    /** The variants and instance tokens, over the provider's defaults. */
    readonly selection: Accessor<Selection<ComponentOf<A>>>;
    /** Root's `testId`: a prefix for every part's test id, or ids by part. */
    readonly testId?: Accessor<TestIdOverride<PartName<A>> | undefined>;
    /** Root's `unstyled`: every part, or some, without the registry's styles. */
    readonly unstyled?: Accessor<Unstyled<PartName<A>> | undefined>;
    /** Root's `indication` prop, over the provider's. Its tokens go on Root, as instance tokens
     *  do, for a component whose anatomy has an indication entry. */
    readonly indication?: Accessor<Indication | undefined>;
    /** The source the component's machine emits to, which the parts its anatomy's indication
     *  entry names draw from. A composite's item parts pass their own to `render`. */
    readonly interactionSource?: Accessor<InteractionSource | undefined>;
    /** Whether the component shows indication now: a card or a list item only with an action.
     *  Always, by default. */
    readonly interactive?: Accessor<boolean>;
    /** Whether one of its anatomy's indication entries shows now, while it's interactive: a
     *  card's root entry while Root acts, its action area's otherwise. Every entry, by default.
     *  Read in a tracking scope. */
    readonly entryActive?: (entry: IndicationAnatomy) => boolean;
}

/** What a part merges besides its anatomy's attributes and the registry's classes. */
export interface PartOptions {
    /** The machine's props for the part (`api().getRootProps()`), spread first. */
    readonly machine?: Accessor<object | undefined>;
    /** The states the part marks with `data-pf-*` attributes (`{ pressed: api().pressed }`). */
    readonly states?: Accessor<PartStates | undefined>;
    /** The user's props for the part, spread last; `class` and `style` merge. `children` and
     *  `ref` aren't spread: `render` places them. */
    readonly props?: object;
    /** The part's own `unstyled`. */
    readonly unstyled?: Accessor<boolean | undefined>;
}

/** What `render` takes on top of `PartOptions`. */
export interface RenderOptions extends PartOptions {
    /** The element the part renders by default: `"button"`, `"span"`. */
    readonly element: ValidComponent;
    /** The user's `as`: another element or a component (`as={A}`) to render instead. */
    readonly as?: Accessor<ValidComponent | undefined>;
    /** A ref of the component's own, alongside the user's. */
    readonly ref?: (element: HTMLElement) => void;
    /** The source of the item this part belongs to, for a composite's parts that show an item's
     *  indication; others draw from the component's. */
    readonly interactionSource?: Accessor<InteractionSource | undefined>;
    /** Render the part only while its children are there (`isPresent`): a ready-made component's
     *  icon slot. The children are built once, inside the part's icon context, rather than once
     *  to see whether they're there and again to render them. */
    readonly optional?: boolean;
}

/** The means to build a component's parts. */
export interface PartScope<A extends ComponentAnatomy> {
    readonly anatomy: A;
    /** A part's merged props, as a live view to spread: `<span {...scope.part("label", …)} />`. */
    part(part: PartName<A>, options?: PartOptions): PartProps;
    /** A part rendered: its element (or `as`), merged props, the user's `ref` and `children`. An
     *  icon part also provides its element to `useIconStyle()`. */
    render(part: PartName<A>, options: RenderOptions): JSX.Element;
}

/** A component's classes and the means to build its parts. */
export interface ComponentScope<
    A extends ComponentAnatomy,
> extends PartScope<A> {
    /** Every slot's classes, from one `useClasses` call. */
    readonly classes: Accessor<ClassSlots<ComponentOf<A>>>;
}

/** What `useUnstyledComponent` takes: `useComponent`'s options without a selection. */
export type UnstyledComponentOptions<A extends ComponentAnatomy> = Omit<
    ComponentOptions<A>,
    "selection" | "unstyled"
>;

const createPartScope = <A extends ComponentAnatomy>(
    anatomy: A,
    options: UnstyledComponentOptions<A> & {
        readonly unstyled?: ComponentOptions<A>["unstyled"];
    },
    classes: Accessor<Readonly<Record<string, SlotClasses>> | undefined>,
    indication?: IndicationScope,
): PartScope<A> => {
    const state = usePureform();
    const scope: PartScope<A> = {
        anatomy,
        part(part, partOptions = {}) {
            // A function source: `merge` makes it the part's one memo.
            return merge(() =>
                combinePartProps(
                    partSources({
                        anatomy,
                        part,
                        machine: partOptions.machine?.(),
                        states: partOptions.states?.(),
                        testId: options.testId?.(),
                        unstyled: options.unstyled?.(),
                        partUnstyled: partOptions.unstyled?.(),
                        classes: classes(),
                        slotProps: state().slotProps,
                        props: partOptions.props,
                    }),
                ),
            ) as PartProps;
        },
        render(part, renderOptions) {
            const user = renderOptions.props as
                | { children?: JSX.Element; ref?: unknown }
                | undefined;
            const optional = renderOptions.optional === true;
            // A part without `as` always renders its element: no computation picks it, on the
            // server as on the client, so hydration finds the same nodes.
            const tag = () => {
                const as = renderOptions.as;
                return as
                    ? dynamic(() => as() ?? renderOptions.element)
                    : dynamic(() => renderOptions.element, { static: true });
            };
            const Tag = optional ? undefined : tag();
            const roles = indication
                ? indicationRoles(indication.entries, part)
                : [];
            const indicated = indication !== undefined && roles.length > 0;
            const icon = isIconPart(anatomy, part);
            // The element, for the parts that follow it: an indication's, and an icon's context.
            const [element, setElement] =
                indicated || icon
                    ? createSignal<Element | undefined>(undefined, {
                          ownedWrite: true,
                      })
                    : [undefined, undefined];
            // The element's props, and a function that makes it.
            const draw = (
                Part: ReturnType<typeof tag>,
                children: () => JSX.Element,
            ) => {
                const shown = indicated
                    ? usePartIndication(
                          indication,
                          roles,
                          renderOptions.interactionSource ?? indication.source,
                          element!,
                          () =>
                              isUnstyled(options.unstyled?.(), part) ||
                              !!renderOptions.unstyled?.(),
                      )
                    : undefined;
                const props = scope.part(
                    part,
                    shown
                        ? {
                              ...renderOptions,
                              states: () =>
                                  shown.states(renderOptions.states?.()),
                          }
                        : renderOptions,
                );
                const refs = [
                    setElement && ((el: Element) => setElement(el)),
                    renderOptions.ref,
                    untrack(() => user?.ref),
                ];
                // The children read where the element inserts them, with no memo of their own.
                const layer = shown?.layer;
                const content = layer ? () => [layer, children()] : children;
                return () => (
                    <Part {...props} ref={refs}>
                        {content()}
                    </Part>
                );
            };
            if (!optional) {
                // A function, so an icon part's children render inside its context.
                const node = draw(Tag!, () => user?.children);
                if (!icon) return node();
                return (
                    <IconPartContext value={element!}>{node()}</IconPartContext>
                );
            }
            // The children built once, inside the icon's context, then the element only while
            // they're there.
            const gated = () => {
                const children = createMemo(() => user?.children);
                return (
                    <Show when={isPresent(children())}>
                        {draw(tag(), children)()}
                    </Show>
                );
            };
            if (!icon) return gated();
            return (
                <IconPartContext value={element!}>{gated()}</IconPartContext>
            );
        },
    };
    return scope;
};

/** Ties a component's anatomy to the registry, for Root to call once and share with its parts
 *  through context. */
export function useComponent<A extends ComponentAnatomy>(
    anatomy: A,
    options: ComponentOptions<A>,
): ComponentScope<A> {
    const name = anatomy.name as ComponentOf<A>;
    const entries = anatomy.indication;
    // What the `ProvidedTokens` providers around give this component, under its own tokens.
    const provided = useProvidedTokens(name);
    const own = options.selection;
    options = {
        ...options,
        selection: () => withProvidedTokens(own(), provided()),
    };
    if (!entries?.length) {
        const classes = useClasses(name, options.selection);
        return { ...createPartScope(anatomy, options, classes), classes };
    }
    const state = usePureform();
    const indication = createIndicationScope(entries, {
        indication: options.indication,
        interactive: options.interactive,
        entryActive: options.entryActive,
        source: options.interactionSource,
    });
    // The indication prop's tokens, and the providers' focus indicator color, go on Root under
    // the component's own tokens.
    const classes = useClasses(name, () => {
        const selection = options.selection();
        if (!indication.interactive()) return selection;
        const tokens = componentIndicationTokens(
            options.indication?.(),
            state().focusIndicatorColor,
        );
        if (!tokens) return selection;
        return {
            ...selection,
            tokens: { ...tokens, ...selection.tokens },
        } as Selection<ComponentOf<A>>;
    });
    return {
        ...createPartScope(anatomy, options, classes, indication),
        classes,
    };
}

/** Builds the parts of an anatomy the registry doesn't style, such as the radio group around its
 *  radios: the same attributes, test ids, and merging as `useComponent`, with no classes. */
export function useUnstyledComponent<A extends ComponentAnatomy>(
    anatomy: A,
    options: UnstyledComponentOptions<A> = {},
): PartScope<A> {
    return createPartScope(anatomy, options, () => undefined);
}

/** The props of a ready-made component that address each part by name:
 *  `class={{ root: "wide", label: "caps" }}`, `testId="save"`. */
export interface SlotKeyedProps<A extends ComponentAnatomy> {
    readonly class?: SlotKeyed<PartName<A>, JSX.ClassValue>;
    readonly style?: SlotKeyed<PartName<A>, JSX.CSSProperties | string>;
    readonly testId?: TestIdOverride<PartName<A>>;
    readonly slotProps?: SlotKeyed<PartName<A>, PartProps>;
    readonly unstyled?: Unstyled<PartName<A>>;
}

/** One part's props from a ready-made component's slot-keyed props: its `slotProps` entry with
 *  its `class` and `style` merged in. `testId` and `unstyled` go to Root whole. A component with
 *  several parts reads them all through one `createSlotProps`. */
export const slotPartProps = <A extends ComponentAnatomy>(
    props: SlotKeyedProps<A>,
    part: PartName<A>,
): PartProps => merge(() => onePart(props, part)) as PartProps;

const onePart = (props: SlotKeyedProps<ComponentAnatomy>, part: string): Dict =>
    combinePartProps([
        forSlot(props.slotProps, part) as Dict | undefined,
        {
            class: forSlot(props.class, part),
            style: forSlot(props.style, part),
        },
    ]);

const NO_PROPS: Dict = Object.freeze({});
const NO_SLOTS: Readonly<Record<string, Dict>> = Object.freeze({});

// Every part the slot-keyed props name, each with its props combined.
const everyPart = (
    props: SlotKeyedProps<ComponentAnatomy>,
): Readonly<Record<string, Dict>> => {
    const { slotProps, class: classes, style } = props;
    if (!slotProps && !classes && !style) return NO_SLOTS;
    const parts: Record<string, Dict> = {};
    for (const keyed of [slotProps, classes, style]) {
        if (!keyed || typeof keyed !== "object") continue;
        for (const part of Object.keys(keyed)) {
            if (!Object.hasOwn(parts, part)) parts[part] = onePart(props, part);
        }
    }
    return parts;
};

// A live view of one part's entry: a merge or a spread reads it as a source whose keys can change,
// as it reads a store, since it answers for `$PROXY`. Symbols, which merges ask for as they build,
// aren't read through, so building one in a component body reads nothing reactive.
class SlotView {
    constructor(
        readonly parts: Accessor<Readonly<Record<string, Dict>>>,
        readonly part: string,
    ) {}
}

const entry = (view: SlotView): Dict => view.parts()[view.part] ?? NO_PROPS;

const SLOT_VIEW: ProxyHandler<SlotView> = {
    get: (view, key, receiver) => {
        if (typeof key === "symbol")
            return key === $PROXY ? receiver : undefined;
        return entry(view)[key];
    },
    has: (view, key) =>
        typeof key === "symbol" ? key === $PROXY : key in entry(view),
    ownKeys: (view) => Object.keys(entry(view)),
    getOwnPropertyDescriptor: (view, key) => {
        if (typeof key === "symbol") return undefined;
        const props = entry(view);
        return Object.hasOwn(props, key)
            ? { configurable: true, enumerable: true, value: props[key] }
            : undefined;
    },
    set: () => true,
    deleteProperty: () => true,
};

/** A ready-made component's slot-keyed props for each of its parts, computed together: `slots(
 *  "label")` is the label's `slotProps` entry with its `class` and `style` merged in, to spread.
 *  Spread one from a variable (`const label = slots("label")`, then `{...label}`): a call in a
 *  spread makes a memo of its own. When `class`, `style`, and `slotProps` can't change (absent, or
 *  plain data the compiler passed as is), each is a plain object; otherwise a live view of one
 *  memo. `testId` and `unstyled` go to Root whole. */
export function createSlotProps<A extends ComponentAnatomy>(
    props: SlotKeyedProps<A>,
): (part: PartName<A>) => PartProps {
    const keyed = props as SlotKeyedProps<ComponentAnatomy>;
    if (untrack(() => SLOT_KEYED.every((key) => isFixed(keyed, key)))) {
        const parts = untrack(() => everyPart(keyed));
        return (part) => (parts[part] ?? NO_PROPS) as PartProps;
    }
    const parts = createMemo(() => everyPart(keyed));
    return (part) =>
        new Proxy(new SlotView(parts, part), SLOT_VIEW) as PartProps;
}

const SLOT_KEYED = ["class", "style", "slotProps"] as const;

// Whether a prop is a literal the compiler passed as is, or left out. Only on the props object the
// compiler made: the server and the client build merges differently, and must pick the same parts.
const isLiteral = (props: object, key: string): boolean =>
    !($PROXY in props) && isStatic(props, key);

// Whether a slot-keyed prop can't change: a literal holding plain data, with no getter or store
// anywhere inside.
const isFixed = (
    props: SlotKeyedProps<ComponentAnatomy>,
    key: (typeof SLOT_KEYED)[number],
): boolean => isLiteral(props, key) && isPlainData(props[key], 0);

const isPlainData = (value: unknown, depth: number): boolean => {
    if (value === null || typeof value !== "object") return true;
    if (depth > 4 || $PROXY in value) return false;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== Array.prototype) {
        return false;
    }
    for (const key of Object.keys(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
        if (descriptor.get || descriptor.set) return false;
        if (!isPlainData(descriptor.value, depth + 1)) return false;
    }
    return true;
};

const None = (): JSX.Element => undefined;

/** The part a ready-made component renders for an optional content prop (`leading`, `icon`): none
 *  when the prop is fixed and absent, `part` when it's fixed and there, else `whenPresent`, which
 *  follows it. A fixed prop is a literal the compiler passed as is, or one left out, on the props
 *  it made, so the same part is picked on the server and the client. */
export function optionalPart<P>(
    props: object,
    key: string,
    part: (props: P) => JSX.Element,
    whenPresent: (props: P) => JSX.Element,
): (props: P) => JSX.Element {
    // Untracked: on a merge, finding the key reads its memo sources.
    return untrack(() => {
        if (!isLiteral(props, key)) return whenPresent;
        const value = (props as Record<string, unknown>)[key];
        return isPresent(value) ? part : None;
    });
}

/** An icon part's props: the element's own, the part's `unstyled`, and, for a part that takes
 *  it, `mirror` to flip a pointing icon under right to left. */
export interface IconPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
    readonly mirror?: boolean | undefined;
}

/** An icon part rendered as a `<span>` from Root's `scope`, with `machine`'s props (hidden from
 *  assistive technology by them): `Part` to compose, and `Optional` for the ready-made's
 *  `optionalPart`, which builds the icon once. `mirror` marks the part `mirrored` while its
 *  `mirror` prop is on. `use` reads Root's context, naming the part; its `machine` reads the
 *  part's props, and `own` names the props of the part's own it reads that stay off the element. */
export function iconParts<A extends ComponentAnatomy, P extends IconPartProps>(
    use: (name: string) => {
        readonly scope: PartScope<A>;
        readonly machine: (props: P) => object | undefined;
    },
    name: string,
    part: PartName<A>,
    {
        mirror = false,
        own = [],
    }: {
        readonly mirror?: boolean;
        readonly own?: readonly Exclude<keyof P, "unstyled" | "mirror">[];
    } = {},
) {
    const render = (props: P, optional: boolean): JSX.Element => {
        const { scope, machine } = use(name);
        const kept = mirror
            ? ["unstyled", "mirror", ...own]
            : ["unstyled", ...own];
        return scope.render(part, {
            element: "span",
            machine: () => machine(props),
            ...(mirror ? { states: () => ({ mirrored: props.mirror }) } : {}),
            unstyled: () => props.unstyled,
            props: omit(props, ...(kept as (keyof P)[])),
            optional,
        });
    };
    return {
        Part: (props: P): JSX.Element => render(props, false),
        Optional: (props: P): JSX.Element => render(props, true),
    };
}

/** A part shown only while its children are there (`isPresent`), for text whose double read
 *  costs nothing; an icon part takes `optional` instead, to build its content once. */
export const whenPresent =
    <P extends { readonly children?: JSX.Element }>(
        Part: (props: P) => JSX.Element,
    ) =>
    (props: P): JSX.Element => (
        <Show when={isPresent(props.children)}>
            <Part {...props} />
        </Show>
    );

/** A plain part's props: the element's own, and the part's `unstyled`. */
export interface PlainPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** Builds a component's plain parts: each renders `element` from Root's `scope` with only the
 *  user's props, such as a card's sections or the pieces the preset draws a progress indicator
 *  with. `use` reads Root's context, naming the part. */
export const plainParts =
    <A extends ComponentAnatomy>(
        use: (name: string) => { readonly scope: PartScope<A> },
        element: "div" | "span",
    ) =>
    <P extends PlainPartProps = PlainPartProps>(
        part: PartName<A>,
        label: string,
    ) =>
        function Part(props: P): JSX.Element {
            const { scope } = use(label);
            return scope.render(part, {
                element,
                unstyled: () => props.unstyled,
                props: omit(props, "unstyled"),
            });
        };

/** Builds a component's machine parts: as `plainParts`, but each also spreads the props
 *  `machine` reads from Root's context (`use`), such as a time picker's selectors, on any element (a table's `<thead>`). */
export const machinePart =
    <A extends ComponentAnatomy, C>(
        use: (name: string) => C & { readonly scope: PartScope<A> },
        element: ValidComponent,
    ) =>
    (part: PartName<A>, label: string, machine: (context: C) => object) =>
        function Part(props: PlainPartProps): JSX.Element {
            const value = use(label);
            return value.scope.render(part, {
                element,
                machine: () => machine(value),
                unstyled: () => props.unstyled,
                props: omit(props, "unstyled"),
            });
        };
