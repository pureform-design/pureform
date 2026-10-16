// What a component's parts are built from. `useComponent` ties an anatomy to the registry: one
// `useClasses` call for every slot. Each part's props then merge, in order: the machine's part
// props, `data-scope`/`data-pf-part`/`data-testid`, the `data-pf-*` state attributes, the
// registry's class and token style, the provider's `slotProps`, and the user's props. Classes join
// (registry first), styles merge, handlers all run, and other keys take the last defined value.

import type {
    ComponentAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import { forSlot, isIconPart, partSources } from "@pureform/binding-core";
import type {
    ClassValue,
    PartStates,
    SlotKeyed,
    Unstyled,
} from "@pureform/binding-core";
import type { ClassSlots, ComponentName, Selection } from "@pureform/styling";
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
}

/** A component's classes and the means to build its parts. */
export interface ComponentScope<A extends ComponentAnatomy> {
    readonly anatomy: A;
    /** Every slot's classes, from one `useClasses` call. */
    readonly classes: ClassSlots<ComponentOf<A>>;
    /** A part's merged props, to spread: `<span {...scope.part("label", …)} />`. */
    part(part: PartName<A>, options?: PartOptions): PartProps;
    /** A part rendered: its element (or `as`), merged props, the user's `ref` and `children`. An
     *  icon part also provides its element to `useIconStyle()`. */
    render(part: PartName<A>, options: RenderOptions): ReactElement;
}

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

/** Ties a component's anatomy to the registry, for Root to call once and share with its parts
 *  through context. */
export function useComponent<A extends ComponentAnatomy>(
    anatomy: A,
    options: ComponentOptions<A>,
): ComponentScope<A> {
    const state = usePureform();
    const classes = useClasses(
        anatomy.name as ComponentOf<A>,
        options.selection,
    );
    const scope: ComponentScope<A> = {
        anatomy,
        classes,
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
                    slotProps: state.slotProps,
                    props: partOptions.props,
                }),
            ) as PartProps;
        },
        render(part, renderOptions) {
            const user = renderOptions.props as
                | { children?: ReactNode; ref?: Ref<HTMLElement> }
                | undefined;
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
