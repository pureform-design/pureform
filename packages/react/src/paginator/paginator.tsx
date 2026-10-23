// The paginator: Root on Zag's pagination machine (`paginatorAnatomy`), the PageSize group with
// its label and select, the RangeLabel, and the Actions row of the four triggers; and the
// ready-made Paginator over them. The page-size field is the select and the triggers are icon
// buttons in the ready-made (`as={IconButton}` composes the same). Angular Material's paginator
// is the model; M3 has none.

import { paginatorAnatomy } from "@pureform/anatomy";
import type { PartName } from "@pureform/anatomy";
import {
    DEFAULT_PAGE_SIZE,
    PAGINATOR_ROOT_PROPS,
    paginatorMachineProps,
    paginatorPageSizes,
    paginatorRange,
    paginatorRangeLabel,
    paginatorSelection,
    paginatorSizeItems,
    paginatorTriggerProps,
} from "@pureform/binding-core";
import type {
    PaginatorPageDetails,
    PaginatorPageSizeDetails,
    PaginatorRootOwnProps,
} from "@pureform/binding-core";
import * as paginator from "@pureform/machines/paginator";
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import { useId } from "react";
import type { ElementType, ReactNode } from "react";

import { useControllable } from "../controllable";
import {
    ChevronEndIcon,
    ChevronStartIcon,
    FirstPageIcon,
    LastPageIcon,
} from "../glyphs";
import { IconButton } from "../icon-button/icon-button";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { machinePart, useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";
import { Select } from "../select/select";

type Anatomy = typeof paginatorAnatomy;
type Api = paginator.Api<PropTypes>;

/** What Root shares with its parts. */
interface PaginatorContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Api;
    readonly props: PaginatorRootProps;
}

const context = createPartContext<PaginatorContextValue>("Paginator");

/** Root's props: the page and page size (controlled or not), the item `count`, the words, the
 *  tokens, `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface PaginatorRootProps
    extends
        Omit<PartProps, keyof PaginatorRootOwnProps>,
        PaginatorRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface PaginatorPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A trigger's props: a part's, `as` (such as `as={IconButton}`), and `mirror` to flip its glyph
 *  under right to left (on by default). Its glyph is the default content. */
export interface PaginatorTriggerProps extends PaginatorPartProps {
    readonly as?: ElementType | undefined;
    readonly mirror?: boolean | undefined;
}

/** The paginator's root, a `<div role="group">` that runs the pagination machine. */
function Root(props: PaginatorRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const page = useControllable<
        "page",
        number,
        Omit<PaginatorPageDetails, "reason">
    >("Paginator", "page", props);
    const size = useControllable<
        "pageSize",
        number,
        Omit<PaginatorPageSizeDetails, "reason">
    >("Paginator", "pageSize", props);
    const service = useMachine(paginator.machine, {
        id: props.id ?? id,
        dir,
        ...paginatorMachineProps(props),
        ...page.machineProps,
        ...size.machineProps,
        defaultPageSize: size.defaultValue ?? DEFAULT_PAGE_SIZE,
    });
    const api = paginator.connect(service, normalizeProps);
    const scope = useComponent(paginatorAnatomy, {
        selection: paginatorSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, ...rest } = omitProps(props, PAGINATOR_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, api, props }}>
            {scope.render("root", {
                element: "div",
                as,
                machine: api.getRootProps(),
                props: rest,
            })}
        </context.Provider>
    );
}

const div = machinePart<Anatomy, PaginatorContextValue>(context.use, "div");
const span = machinePart<Anatomy, PaginatorContextValue>(context.use, "span");

/** The group of the page-size label and select. */
const PageSize = div("pageSize", "PageSize", ({ api }) =>
    api.getPageSizeProps(),
);
/** The page-size select's label: "Items per page:". */
const PageSizeLabel = span("pageSizeLabel", "PageSizeLabel", ({ api }) =>
    api.getPageSizeLabelProps(),
);
/** The element sized for the page-size select. */
const PageSizeSelect = div("pageSizeSelect", "PageSizeSelect", ({ api }) =>
    api.getPageSizeSelectProps(),
);
/** The row of the first, previous, next and last triggers. */
const Actions = div("actions", "Actions", ({ api }) => api.getActionsProps());

/** The range label: "1 – 10 of 100", a polite live region. Its text is the default content. */
function RangeLabel({
    unstyled,
    children,
    ...props
}: PaginatorPartProps): ReactNode {
    const { scope, api, props: root } = context.use("RangeLabel");
    return scope.render("rangeLabel", {
        element: "span",
        machine: api.getRangeLabelProps(),
        unstyled,
        props: {
            ...props,
            children:
                children ??
                paginatorRangeLabel(
                    paginatorRange(api.page, api.pageSize, api.count),
                    root.translations,
                ),
        },
    });
}

type TriggerKind = "first" | "prev" | "next" | "last";

const TRIGGERS = {
    first: { part: "firstTrigger", label: "FirstTrigger" },
    prev: { part: "prevTrigger", label: "PrevTrigger" },
    next: { part: "nextTrigger", label: "NextTrigger" },
    last: { part: "lastTrigger", label: "LastTrigger" },
} as const satisfies Record<
    TriggerKind,
    { part: PartName<Anatomy>; label: string }
>;

const GLYPHS: Record<TriggerKind, () => ReactNode> = {
    first: () => <FirstPageIcon />,
    prev: () => <ChevronStartIcon />,
    next: () => <ChevronEndIcon />,
    last: () => <LastPageIcon />,
};

const trigger = (kind: TriggerKind) =>
    function Trigger({
        unstyled,
        as,
        mirror,
        children,
        ...props
    }: PaginatorTriggerProps): ReactNode {
        const { part, label } = TRIGGERS[kind];
        const { scope, api, props: root } = context.use(label);
        const content = children ?? GLYPHS[kind]();
        const zag = {
            first: api.getFirstTriggerProps,
            prev: api.getPrevTriggerProps,
            next: api.getNextTriggerProps,
            last: api.getLastTriggerProps,
        }[kind]();
        return scope.render(part, {
            element: "button",
            as,
            machine: paginatorTriggerProps(zag, root.disabled),
            states: { mirrored: mirror ?? true },
            unstyled,
            // The ready-made icon button draws its `icon`, not children.
            props:
                as === IconButton
                    ? { ...props, icon: content }
                    : { ...props, children: content },
        });
    };

/** The first-page button. */
const FirstTrigger = trigger("first");
/** The previous-page button. */
const PrevTrigger = trigger("prev");
/** The next-page button. */
const NextTrigger = trigger("next");
/** The last-page button. */
const LastTrigger = trigger("last");

/** The ready-made paginator's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part. */
export interface PaginatorProps
    extends
        Omit<PaginatorRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy> {}

function ReadyMadeParts({
    slot,
}: {
    readonly slot: (part: PartName<Anatomy>) => PartProps;
}): ReactNode {
    const { api, props: root } = context.use("Paginator");
    const sizes = paginatorSizeItems(
        paginatorPageSizes(root.pageSizeOptions, api.pageSize),
    );
    const label = root.translations?.itemsPerPage ?? "Items per page:";
    return (
        <>
            {root.hidePageSize ? null : (
                <PageSize {...slot("pageSize")}>
                    <PageSizeLabel {...slot("pageSizeLabel")}>
                        {label}
                    </PageSizeLabel>
                    <PageSizeSelect {...slot("pageSizeSelect")}>
                        <Select
                            variant="outlined"
                            density={root.density}
                            aria-label={label}
                            items={sizes}
                            value={String(api.pageSize)}
                            disabled={root.disabled}
                            onValueChange={(details) => {
                                const next = Number(details.value);
                                if (next > 0) api.setPageSize(next);
                            }}
                        />
                    </PageSizeSelect>
                </PageSize>
            )}
            <RangeLabel {...slot("rangeLabel")} />
            <Actions {...slot("actions")}>
                {root.showFirstLastButtons ? (
                    <FirstTrigger as={IconButton} {...slot("firstTrigger")} />
                ) : null}
                <PrevTrigger as={IconButton} {...slot("prevTrigger")} />
                <NextTrigger as={IconButton} {...slot("nextTrigger")} />
                {root.showFirstLastButtons ? (
                    <LastTrigger as={IconButton} {...slot("lastTrigger")} />
                ) : null}
            </Actions>
        </>
    );
}

/** The ready-made paginator: the page-size select, the range label, and the previous and next
 *  buttons (with first and last when `showFirstLastButtons`). */
function ReadyMade(props: PaginatorProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        ...rootProps
    } = props;
    const slot = useSlotProps(props);
    return (
        <Root {...rootProps} {...(slot("root") as object)}>
            <ReadyMadeParts slot={slot} />
        </Root>
    );
}

/** The paginator (Angular Material's; M3 has none). Use it ready-made, `<Paginator count={95}
 *  defaultPageSize={10} />`, or compose it under `Paginator.Root`: `PageSize` (with `PageSizeLabel`
 *  and `PageSizeSelect`), `RangeLabel`, and `Actions` with `FirstTrigger`, `PrevTrigger`,
 *  `NextTrigger` and `LastTrigger` (`as={IconButton}`). */
export const Paginator = Object.assign(ReadyMade, {
    Root,
    PageSize,
    PageSizeLabel,
    PageSizeSelect,
    RangeLabel,
    Actions,
    FirstTrigger,
    PrevTrigger,
    NextTrigger,
    LastTrigger,
});
