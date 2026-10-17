// What a component's parts are built from. `useComponent` ties an anatomy to the registry: one
// `useClasses` call for every slot. Each part's props then merge, in order: the machine's part
// props, `data-scope`/`data-pf-part`/`data-testid`, the `data-pf-*` state attributes, the
// registry's class and token style, the provider's `slotProps`, and the user's props. Classes and
// styles combine (registry first), handlers all run, and other keys take the last defined value.

import type {
    ComponentAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import { forSlot, isIconPart, partSources } from "@pureform/binding-core";
import type { PartStates, SlotKeyed, Unstyled } from "@pureform/binding-core";
import type {
    ClassSlots,
    ComponentName,
    Selection,
    SlotClasses,
} from "@pureform/styling";
import { dynamic } from "@solidjs/web";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createSignal,
    merge,
    untrack,
} from "solid-js";

import { useClasses } from "./classes";
import { IconPartContext } from "./icon-style";
import { combinePartProps } from "./props";
import type { PartProps } from "./props";
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
): PartScope<A> => {
    const state = usePureform();
    const scope: PartScope<A> = {
        anatomy,
        part(part, partOptions = {}) {
            const merged = createMemo(() =>
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
            );
            return merge(merged) as PartProps;
        },
        render(part, renderOptions) {
            const props = scope.part(part, renderOptions);
            const user = renderOptions.props as
                | { children?: JSX.Element; ref?: unknown }
                | undefined;
            const Tag = dynamic(
                () => renderOptions.as?.() ?? renderOptions.element,
            );
            const [element, setElement] = createSignal<Element | undefined>(
                undefined,
                { ownedWrite: true },
            );
            const refs = [
                (el: Element) => setElement(el),
                renderOptions.ref,
                untrack(() => user?.ref),
            ];
            // A function, so an icon part's children render inside its context.
            const node = () => (
                <Tag {...props} ref={refs}>
                    {user?.children}
                </Tag>
            );
            if (!isIconPart(anatomy, part)) return node();
            return <IconPartContext value={element}>{node()}</IconPartContext>;
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
    const classes = useClasses(name, options.selection);
    return {
        ...createPartScope(anatomy, options, classes),
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
 *  its `class` and `style` merged in. `testId` and `unstyled` go to Root whole. */
export const slotPartProps = <A extends ComponentAnatomy>(
    props: SlotKeyedProps<A>,
    part: PartName<A>,
): PartProps =>
    merge(() =>
        combinePartProps([
            forSlot(props.slotProps, part) as Dict | undefined,
            {
                class: forSlot(props.class, part),
                style: forSlot(props.style, part),
            },
        ]),
    ) as PartProps;
