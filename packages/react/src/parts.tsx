// What a component's parts are built from. `useComponent` ties an anatomy to the registry: one
// `useClasses` call for every slot. Each part's props then merge, in order: the machine's part
// props, `data-scope`/`data-pf-part`/`data-testid`, the `data-pf-*` state attributes, the
// registry's class and token style, the provider's `slotProps`, and the user's props. Classes join
// (registry first), styles merge, handlers all run, and other keys take the last defined value.

import type {
    ComponentAnatomy,
    IndicationAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import {
    forSlot,
    isIconPart,
    isUnstyled,
    partSources,
} from "@pureform/binding-core";
import type {
    ClassValue,
    PartStates,
    SlotKeyed,
    Unstyled,
} from "@pureform/binding-core";
import {
    componentIndicationTokens,
    holdsLayer,
    indicationRoles,
} from "@pureform/binding-core/indication";
import type { Indication } from "@pureform/binding-core/indication";
import type { InteractionSource } from "@pureform/binding-core/interaction";
import type {
    ClassSlots,
    ComponentName,
    Selection,
    SlotClasses,
} from "@pureform/styling";
import {
    createElement,
    type CSSProperties,
    type ElementType,
    type ReactElement,
    type ReactNode,
    type Ref,
    type RefCallback,
    useMemo,
    useState,
} from "react";

import { useClasses } from "./classes";
import { IconPartContext } from "./icon-style";
import {
    usePartIndication,
    useIndicationScope,
    withForwarded,
} from "./indication";
import type { IndicationScope, PartIndication } from "./indication";
import { combinePartProps } from "./props";
import type { PartProps } from "./props";
import { usePureform } from "./provider";

/** The registry name an anatomy's component is registered under. */
export type ComponentOf<A extends ComponentAnatomy> = A["name"] & ComponentName;

/** What `useComponent` takes, from Root's props. */
export interface ComponentOptions<A extends ComponentAnatomy> {
    /** The variants and instance tokens, over the provider's defaults. A new object every render
     *  is fine: the classes are memoized on its value. */
    readonly selection: Selection<ComponentOf<A>>;
    /** Root's `testId`: a prefix for every part's test id, or ids by part. */
    readonly testId?: TestIdOverride<PartName<A>> | undefined;
    /** Root's `unstyled`: every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<PartName<A>> | undefined;
    /** Root's `indication` prop, over the provider's. Its tokens go on Root, as instance tokens
     *  do, for a component whose anatomy has an indication entry. */
    readonly indication?: Indication | undefined;
    /** The source the component's machine emits to, which the parts its anatomy's indication
     *  entry names draw from. A composite's item parts pass their own to `render`. */
    readonly interactionSource?: InteractionSource | undefined;
    /** Whether the component shows indication now: a card or a list item only with an action.
     *  Always, by default. */
    readonly interactive?: boolean | undefined;
    /** Whether one of its anatomy's indication entries shows now, while it's interactive: a
     *  card's root entry while Root acts, its action area's otherwise. Every entry, by default. */
    readonly entryActive?: ((entry: IndicationAnatomy) => boolean) | undefined;
}

/** What a part merges besides its anatomy's attributes and the registry's classes. */
export interface PartOptions {
    /** The machine's props for the part (`api.getRootProps()`), spread first. */
    readonly machine?: object | undefined;
    /** The states the part marks with `data-pf-*` attributes (`{ pressed: api.pressed }`). */
    readonly states?: PartStates | undefined;
    /** The user's props for the part, spread last; `className` and `style` merge. `children`
     *  and `ref` aren't spread: `render` places them. */
    readonly props?: object | undefined;
    /** The part's own `unstyled`. */
    readonly unstyled?: boolean | undefined;
}

/** What `render` takes on top of `PartOptions`. */
export interface RenderOptions extends PartOptions {
    /** The element the part renders by default: `"button"`, `"span"`. */
    readonly element: ElementType;
    /** The user's `as`: another element or a component (`as={Link}`) to render instead. */
    readonly as?: ElementType | undefined;
    /** A ref of the component's own, alongside the user's. */
    readonly ref?: Ref<HTMLElement> | undefined;
    /** The source of the item this part belongs to, for a composite's parts that show an item's
     *  indication; others draw from the component's. */
    readonly interactionSource?: InteractionSource | undefined;
}

/** The means to build a component's parts. */
export interface PartScope<A extends ComponentAnatomy> {
    readonly anatomy: A;
    /** A part's merged props, to spread: `<span {...scope.part("label", …)} />`. */
    part(part: PartName<A>, options?: PartOptions): PartProps;
    /** A part rendered: its element (or `as`), merged props, the user's `ref` and `children`. An
     *  icon part also provides its element to `useIconStyle()`. */
    render(part: PartName<A>, options: RenderOptions): ReactElement;
}

/** A component's classes and the means to build its parts. */
export interface ComponentScope<
    A extends ComponentAnatomy,
> extends PartScope<A> {
    /** Every slot's classes, from one `useClasses` call. */
    readonly classes: ClassSlots<ComponentOf<A>>;
}

/** What `useUnstyledComponent` takes: `useComponent`'s options without a selection. */
export type UnstyledComponentOptions<A extends ComponentAnatomy> = Omit<
    ComponentOptions<A>,
    "selection" | "unstyled"
>;

type RefCleanup = () => void;

const assign = <T,>(
    ref: Ref<T> | undefined,
    value: T | null,
): RefCleanup | undefined => {
    if (typeof ref === "function") {
        const cleanup = ref(value);
        return typeof cleanup === "function" ? cleanup : () => ref(null);
    }
    if (ref) {
        ref.current = value;
        return () => {
            ref.current = null;
        };
    }
    return undefined;
};

/** One callback ref that sets every ref given, and clears them (or runs their cleanups) on
 *  detach. */
export const mergeRefs =
    <T,>(...refs: readonly (Ref<T> | undefined)[]): RefCallback<T> =>
    (value) => {
        const cleanups = refs.map((ref) => assign(ref, value));
        return () => {
            for (const cleanup of cleanups) cleanup?.();
        };
    };

interface PartElementProps {
    readonly tag: ElementType;
    readonly props: PartProps;
    readonly icon: boolean;
    readonly ownRef: Ref<HTMLElement> | undefined;
    readonly userRef: Ref<HTMLElement> | undefined;
    readonly children: ReactNode;
}

function PartElement({
    tag,
    props,
    icon,
    ownRef,
    userRef,
    children,
}: PartElementProps): ReactNode {
    const [element, setElement] = useState<HTMLElement | null>(null);
    const ref = useMemo(
        () =>
            mergeRefs<HTMLElement>(
                icon ? setElement : undefined,
                ownRef,
                userRef,
            ),
        [icon, ownRef, userRef],
    );
    const node = createElement(tag, { ...props, ref }, children);
    if (!icon) return node;
    return <IconPartContext value={element}>{node}</IconPartContext>;
}

interface IndicatedPartElementProps extends PartElementProps {
    readonly indication: PartIndication;
}

// A part its component's indication names: its layer first inside it when it's a surface, and a
// hover or press forwarded from another origin marked on it.
function IndicatedPartElement({
    tag,
    props,
    icon,
    ownRef,
    userRef,
    children,
    indication,
}: IndicatedPartElementProps): ReactNode {
    // The element, in state, only for an icon part's context.
    const [element, setElement] = useState<HTMLElement | null>(null);
    const { ref: attach, forwarded, layer } = usePartIndication(indication);
    const ref = useMemo(
        () =>
            mergeRefs<HTMLElement>(
                icon ? setElement : undefined,
                attach,
                ownRef,
                userRef,
            ),
        [icon, attach, ownRef, userRef],
    );
    const merged = { ...withForwarded(props, forwarded), ref };
    // Only a part holding the layer (a surface, or the part an entry names) renders it, in the
    // same place while it comes and goes: a trigger may be a void element (an input).
    const holds = indication.roles.some(({ entry, role }) =>
        holdsLayer(indication.scope.entries[entry], role),
    );
    const node = holds
        ? createElement(tag, merged, layer, children)
        : createElement(tag, merged, children);
    if (!icon) return node;
    return <IconPartContext value={element}>{node}</IconPartContext>;
}

const createPartScope = <A extends ComponentAnatomy>(
    anatomy: A,
    options: UnstyledComponentOptions<A> & {
        readonly unstyled?: ComponentOptions<A>["unstyled"];
    },
    classes: Readonly<Record<string, SlotClasses>> | undefined,
    slotProps: object | undefined,
    indication?: IndicationScope,
): PartScope<A> => {
    const scope: PartScope<A> = {
        anatomy,
        part(part, partOptions = {}) {
            return combinePartProps(
                partSources({
                    anatomy,
                    part,
                    machine: partOptions.machine,
                    states: partOptions.states,
                    testId: options.testId,
                    unstyled: options.unstyled,
                    partUnstyled: partOptions.unstyled,
                    classes,
                    slotProps,
                    props: partOptions.props,
                }),
            ) as PartProps;
        },
        render(part, renderOptions) {
            const user = renderOptions.props as
                | { children?: ReactNode; ref?: Ref<HTMLElement> }
                | undefined;
            const roles = indication
                ? indicationRoles(indication.entries, part)
                : [];
            if (indication && roles.length > 0) {
                return (
                    <IndicatedPartElement
                        tag={renderOptions.as ?? renderOptions.element}
                        props={scope.part(part, renderOptions)}
                        icon={isIconPart(anatomy, part)}
                        ownRef={renderOptions.ref}
                        userRef={user?.ref}
                        indication={{
                            scope: indication,
                            roles,
                            source:
                                renderOptions.interactionSource ??
                                indication.source,
                            unstyled:
                                isUnstyled(options.unstyled, part) ||
                                !!renderOptions.unstyled,
                        }}
                    >
                        {user?.children}
                    </IndicatedPartElement>
                );
            }
            return (
                <PartElement
                    tag={renderOptions.as ?? renderOptions.element}
                    props={scope.part(part, renderOptions)}
                    icon={isIconPart(anatomy, part)}
                    ownRef={renderOptions.ref}
                    userRef={user?.ref}
                >
                    {user?.children}
                </PartElement>
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
    const state = usePureform();
    const entries = anatomy.indication;
    // Hooks run in the same order every render: an anatomy's entries never change.
    const indication = entries?.length
        ? useIndicationScope(entries, {
              indication: options.indication,
              interactive: options.interactive,
              entryActive: options.entryActive,
              source: options.interactionSource,
          })
        : undefined;
    // The indication prop's tokens, and the providers' focus indicator color, go on Root under
    // the component's own tokens.
    const tokens =
        indication?.interactive === true
            ? componentIndicationTokens(
                  options.indication,
                  state.focusIndicatorColor,
              )
            : undefined;
    const classes = useClasses(
        anatomy.name as ComponentOf<A>,
        tokens
            ? ({
                  ...options.selection,
                  tokens: { ...tokens, ...options.selection.tokens },
              } as Selection<ComponentOf<A>>)
            : options.selection,
    );
    return {
        ...createPartScope(
            anatomy,
            options,
            classes,
            state.slotProps,
            indication,
        ),
        classes,
    };
}

/** Builds the parts of an anatomy the registry doesn't style, such as the radio group around its
 *  radios: the same attributes, test ids, and merging as `useComponent`, with no classes. */
export function useUnstyledComponent<A extends ComponentAnatomy>(
    anatomy: A,
    options: UnstyledComponentOptions<A> = {},
): PartScope<A> {
    const state = usePureform();
    return createPartScope(anatomy, options, undefined, state.slotProps);
}

/** The props of a ready-made component that address each part by name:
 *  `className={{ root: "wide", label: "caps" }}`, `testId="save"`. */
export interface SlotKeyedProps<A extends ComponentAnatomy> {
    readonly className?: SlotKeyed<PartName<A>, ClassValue> | undefined;
    readonly style?: SlotKeyed<PartName<A>, CSSProperties> | undefined;
    readonly testId?: TestIdOverride<PartName<A>> | undefined;
    readonly slotProps?: SlotKeyed<PartName<A>, PartProps> | undefined;
    readonly unstyled?: Unstyled<PartName<A>> | undefined;
}

/** One part's props from a ready-made component's slot-keyed props: its `slotProps` entry with
 *  its `className` and `style` merged in. `testId` and `unstyled` go to Root whole. */
export const slotPartProps = <A extends ComponentAnatomy>(
    props: SlotKeyedProps<A>,
    part: PartName<A>,
): PartProps =>
    combinePartProps([
        forSlot(props.slotProps, part) as
            | Readonly<Record<string, unknown>>
            | undefined,
        {
            className: forSlot(props.className, part),
            style: forSlot(props.style, part),
        },
    ]) as PartProps;

const NO_PROPS: PartProps = Object.freeze({});

/** A ready-made component's slot-keyed props for each of its parts, computed together, once per
 *  change of `className`, `style`, or `slotProps`: `slot("label")` is what `slotPartProps(props,
 *  "label")` gives, and a part none of them names gets the same empty object. */
export function useSlotProps<A extends ComponentAnatomy>(
    props: SlotKeyedProps<A>,
): (part: PartName<A>) => PartProps {
    const { slotProps, className, style } = props;
    return useMemo(() => {
        if (!slotProps && !className && !style) return () => NO_PROPS;
        const keyed = { slotProps, className, style } as SlotKeyedProps<A>;
        const parts: Record<string, PartProps> = {};
        for (const named of [slotProps, className, style]) {
            if (!named || typeof named !== "object") continue;
            for (const part of Object.keys(named)) {
                if (!Object.hasOwn(parts, part)) {
                    parts[part] = slotPartProps(keyed, part as PartName<A>);
                }
            }
        }
        return (part: PartName<A>) => parts[part] ?? NO_PROPS;
    }, [slotProps, className, style]);
}
