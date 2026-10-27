// What the components with one part share: Root is the whole component (an avatar, a separator, an
// icon), rendered as its element or `as`, with the registry's classes, its own props kept off the
// element, and the element's other props spread on it. Each component builds its own from
// `createSinglePart`; the ready-made component is Root itself.

import type { ComponentAnatomy, PartName } from "@pureform/anatomy";
import type { PartStates } from "@pureform/binding-core";
import type { Selection } from "@pureform/styling";
import type { JSX, ValidComponent } from "@solidjs/web";
import { createMemo, omit } from "solid-js";

import { useComponent } from "./parts";
import type { ComponentOf, ComponentOptions } from "./parts";

/** What every single-part Root takes besides its own props. */
interface SinglePartProps {
    readonly as?: ValidComponent | undefined;
    readonly testId?: unknown;
    readonly unstyled?: unknown;
}

/** How one single-part component differs from another. */
interface SinglePartConfig<A extends ComponentAnatomy, P> {
    readonly anatomy: A;
    /** The element Root renders unless given `as`. */
    readonly element: (props: P) => ValidComponent;
    /** Root's own props, kept off its element. */
    readonly ownProps: readonly string[];
    readonly selection: (props: P) => Selection<ComponentOf<A>>;
    /** Root's element props from its own, for the element it renders. */
    readonly machine?: (props: P, element: ValidComponent) => object;
    /** The states Root marks. */
    readonly states?: (props: P) => PartStates;
}

/** Builds a single-part component's Root. */
export function createSinglePart<
    A extends ComponentAnatomy,
    P extends SinglePartProps,
>(config: SinglePartConfig<A, P>) {
    const root = config.anatomy.root as PartName<A>;
    return function Root(props: P): JSX.Element {
        const element = createMemo(() => props.as ?? config.element(props));
        const scope = useComponent(config.anatomy, {
            selection: () => config.selection(props),
            testId: () => props.testId as never,
            unstyled: () =>
                props.unstyled as ReturnType<
                    NonNullable<ComponentOptions<A>["unstyled"]>
                >,
        });
        const rest = omit(
            props as Record<string, unknown>,
            "as",
            ...config.ownProps,
        );
        return scope.render(root, {
            element: "span",
            as: element,
            machine: () => config.machine?.(props, element()),
            states: () => config.states?.(props),
            props: rest,
        });
    };
}
