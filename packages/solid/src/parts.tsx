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
    isIconPart,
    isPresent,
    isUnstyled,
    withProvidedTokens,
} from "@pureform/binding-core";
import type {
    InnerProps,
    MenuScopeInstances,
    PartStates,
    SlotKeyedEach,
    Unstyled,
} from "@pureform/binding-core";
import type { InteractionSource } from "@pureform/binding-core/interaction";
import { partSources } from "@pureform/binding-web";
import { resolveWebSlotCustomization } from "@pureform/binding-web";
import type { WebSlotCustomization } from "@pureform/binding-web";
import { componentIndicationTokens } from "@pureform/binding-web/indication";
import type { Indication } from "@pureform/binding-web/indication";
import { indicationRoles } from "@pureform/binding-web/indication";
import type {
    ComponentName,
    InstanceTokens,
    Selection,
} from "@pureform/styling";
import type { ClassSlots, SlotClasses } from "@pureform/styling-web";
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

// Anatomy decides this once, not a reactive condition. Parts without an indication or icon
// context do not need to retain their host element.
const createPartRef = (enabled: boolean) => {
    if (!enabled) return [undefined, undefined] as const;
    const [element, setElement] = createSignal<Element | undefined>(undefined, {
        ownedWrite: true,
    });
    return [element, setElement] as const;
};

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
    /** The component whose provider key (`datePicker.cell`) also reaches the part: a picker's
     *  calendar cells, which are another component's. */
    readonly owner?:
        | { readonly component: string; readonly part: string }
        | undefined;
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
                        owner: partOptions.owner,
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
            const [element, setElement] = createPartRef(indicated || icon);
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
            // Both branches are static setup choices. Only the optional branch's Show tracks
            // presence; an icon's content is evaluated inside its context in either case.
            const node = optional ? gated : draw(Tag!, () => user?.children);
            // This branches on anatomy, never reactive state. Show would add an unnecessary
            // lifetime boundary and change hydration ownership.
            // eslint-disable-next-line solid/components-return-once
            return icon ? (
                <IconPartContext value={element!}>{node()}</IconPartContext>
            ) : (
                node()
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
export interface SlotKeyedProps<
    A extends ComponentAnatomy,
    Extra extends string = never,
    I = {},
> {
    readonly class?:
        | SlotKeyedEach<PartName<A> | Extra, JSX.ClassValue, I>
        | undefined;
    readonly style?:
        | SlotKeyedEach<PartName<A> | Extra, JSX.CSSProperties | string, I>
        | undefined;
    readonly testId?: TestIdOverride<PartName<A>> | undefined;
    readonly slotProps?:
        | SlotKeyedEach<PartName<A> | Extra, PartProps, I>
        | undefined;
    readonly unstyled?: Unstyled<PartName<A>, I> | undefined;
}

/** Everything that customizes a component's parts without choosing its variants: the slot-keyed
 *  props and its instance tokens. */
export interface CustomizeProps<
    A extends ComponentAnatomy,
> extends SlotKeyedProps<A> {
    readonly tokens?: InstanceTokens<ComponentOf<A>> | undefined;
}

/** What a ready-made takes to customize a component it draws (`listItemProps`, `chipProps`):
 *  that component's `CustomizeProps`, each optional. */
export type InnerPropsOf<A extends ComponentAnatomy> = InnerProps<
    CustomizeProps<A>
>;

/** What a ready-made takes to customize the menu it draws (`menuProps`): that menu's
 *  `InnerPropsOf`, with its slot-keyed props also taking a function of each option
 *  (`MenuScopeInstances`), so one option's parts can differ from the rest. */
export type MenuScopeProps<A extends ComponentAnatomy, Item> = Omit<
    InnerPropsOf<A>,
    keyof SlotKeyedProps<A>
> &
    InnerProps<SlotKeyedProps<A, never, MenuScopeInstances<Item>>>;

/** One part's props from a ready-made component's slot-keyed props: its `slotProps` entry with
 *  its `class` and `style` merged in. `testId` and `unstyled` go to Root whole. A component with
 *  several parts binds them through one `createSlotProps`. */
export const slotPartProps = <A extends ComponentAnatomy>(
    props: SlotKeyedProps<A>,
    part: PartName<A>,
): PartProps => {
    const resolved = merge(() => onePart(props, part));
    return resolved as PartProps;
};

const onePart = (
    props: WebSlotCustomization,
    part: string,
    instance?: Accessor<unknown>,
): Dict => {
    const resolved = resolveWebSlotCustomization(props, part, instance);
    return combinePartProps([
        resolved.props,
        {
            class: resolved.class,
            style: resolved.style,
            // Only a copy's own `unstyled` (Root reads the rest).
            unstyled: resolved.unstyled,
        },
    ]);
};

/** A part drawn as a `Button` or `IconButton` (`as={Button}`): its `class` and `style` are plain
 *  values for the part, but the button keys them by its own parts, so they go to its root
 *  (`slotProps.root`), which the button's own `class` and `style` keys then join. */
export const asRoot = (props: PartProps): PartProps => {
    const rest = omit(props as Dict, "class", "style");
    const resolved = merge(rest, {
        get slotProps() {
            const { class: value, style, slotProps } = props as Dict;
            if (value == null && style == null) return slotProps;
            const keyed = (slotProps ?? {}) as Record<string, Dict>;
            return {
                ...keyed,
                root: combinePartProps([keyed.root, { class: value, style }]),
            };
        },
    });
    return resolved as PartProps;
};

/** Bind each consumed part to one live merge. Call during setup, then spread the result from a
 *  variable. Repeated parts always pass an instance accessor; it is read only when a channel
 *  needs it. No reactive metadata decides which computations are installed during setup. */
export function createSlotProps<
    A extends ComponentAnatomy,
    Extra extends string = never,
    I = {},
>(
    // `unstyled` loosely: Root's (every part's copy unknown) passes through too.
    props: Omit<SlotKeyedProps<A, Extra, I>, "unstyled"> & {
        readonly unstyled?: unknown;
    },
): SlotPropsOf<PartName<A> | Extra, I> {
    return (part: string, instance?: Accessor<unknown>) => {
        if (untrack(() => isStaticSlot(props, part))) {
            return untrack(() => onePart(props, part)) as PartProps;
        }
        const resolved = merge(() => onePart(props, part, instance));
        return resolved as PartProps;
    };
}

/** A ready-made's parts' slot-keyed props: `slots("label")` to spread on a part; a repeated part's
 *  copy passes an accessor of what it is, `slots("cell", () => cell)`, which a function of the copy
 *  is called with (again when it changes). */
export interface SlotPropsOf<P extends string, I = {}> {
    <K extends P>(
        part: K,
        ...instance: K extends keyof I ? [instance?: Accessor<I[K]>] : []
    ): PartProps;
}

// Whether a prop is a literal the compiler passed as is, or left out. Only on the props object the
// compiler made: the server and the client build merges differently, and must pick the same parts.
const isLiteral = (props: object, key: string): boolean =>
    !($PROXY in props) && isStatic(props, key);

// No recursive data inspection or whole-component classification: only an absent entry or a
// primitive own data property can bypass the memo. Objects may hide reactive descendants, and
// functions may need a changing instance, so both always use the live path. This keeps ordinary
// uncustomized rows within their setup budget without making dynamic slots choose a setup path.
const isStaticSlot = (props: object, part: string): boolean => {
    for (const key of ["class", "style", "slotProps", "unstyled"]) {
        if (!isLiteral(props, key)) return false;
        const keyed = (props as Dict)[key];
        if (keyed == null || typeof keyed === "boolean") continue;
        if (typeof keyed !== "object" || $PROXY in keyed) return false;
        if (Object.getPrototypeOf(keyed) !== Object.prototype) return false;
        const descriptor = Object.getOwnPropertyDescriptor(keyed, part);
        if (!descriptor) continue;
        if (descriptor.get || descriptor.set) return false;
        const value: unknown = descriptor.value;
        if (
            typeof value === "function" ||
            (value !== null && typeof value === "object")
        )
            return false;
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
        const rest = omit(props, ...(kept as (keyof P)[]));
        return scope.render(part, {
            element: "span",
            machine: () => machine(props),
            ...(mirror ? { states: () => ({ mirrored: props.mirror }) } : {}),
            unstyled: () => props.unstyled,
            props: rest,
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
            const rest = omit(props, "unstyled");
            return scope.render(part, {
                element,
                unstyled: () => props.unstyled,
                props: rest,
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
            const rest = omit(props, "unstyled");
            return value.scope.render(part, {
                element,
                machine: () => machine(value),
                unstyled: () => props.unstyled,
                props: rest,
            });
        };
