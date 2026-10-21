// The paginator: Root on Zag's pagination machine (`paginatorAnatomy`), the PageSize group with
// its label and select, the RangeLabel, and the Actions row of the four triggers; and the
// ready-made Paginator over them. The page-size field is the select and the triggers are icon
// buttons in the ready-made (`as={IconButton}` composes the same). Angular Material's paginator
// is the model; M3 has none.

import { paginatorAnatomy } from "@pureform/anatomy";
import type { PartName } from "@pureform/anatomy";
import {
    PAGINATOR_ROOT_PROPS,
    paginatorMachineProps,
    paginatorPageSizes,
    paginatorRange,
    paginatorRangeLabel,
    paginatorSelection,
    paginatorSizeItems,
    paginatorTriggerProps,
    DEFAULT_PAGE_SIZE,
} from "@pureform/binding-core";
import type {
    PaginatorPageDetails,
    PaginatorPageSizeDetails,
    PaginatorRootOwnProps,
} from "@pureform/binding-core";
import * as paginator from "@pureform/machines/paginator";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createUniqueId,
    merge,
    omit,
    Show,
} from "solid-js";

import { useControllable } from "../controllable";
import {
    ChevronEndIcon,
    ChevronStartIcon,
    FirstPageIcon,
    LastPageIcon,
} from "../glyphs";
import { IconButton } from "../icon-button/icon-button";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, machinePart, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";
import { useDirection } from "../provider";
import { Select } from "../select/select";

type Anatomy = typeof paginatorAnatomy;
type Api = paginator.Api<PropTypes>;

/** What Root shares with its parts. */
interface PaginatorContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly api: Accessor<Api>;
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
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface PaginatorPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A trigger's props: a part's, `as` (such as `as={IconButton}`), and `mirror` to flip its glyph
 *  under right to left (on by default). Its glyph is the default content. */
export interface PaginatorTriggerProps extends PaginatorPartProps {
    readonly as?: ValidComponent | undefined;
    readonly mirror?: boolean | undefined;
}

/** The paginator's root, a `<div role="group">` that runs the pagination machine. */
function Root(props: PaginatorRootProps): JSX.Element {
    const id = createUniqueId();
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
    const service = useMachine(paginator.machine, () => ({
        id: props.id ?? id,
        dir: dir(),
        ...paginatorMachineProps(props),
        ...page.machineProps(),
        ...size.machineProps(),
        defaultPageSize: size.defaultValue ?? DEFAULT_PAGE_SIZE,
    }));
    const api = createMemo(() => paginator.connect(service, normalizeProps));
    const scope = useComponent(paginatorAnatomy, {
        selection: () => paginatorSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return (
        <context.Provider value={{ scope, api, props }}>
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => api().getRootProps(),
                props: omit(props, "as", ...PAGINATOR_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

const div = machinePart<Anatomy, PaginatorContextValue>(context.use, "div");
const span = machinePart<Anatomy, PaginatorContextValue>(context.use, "span");

/** The group of the page-size label and select. */
const PageSize = div("pageSize", "PageSize", ({ api }) =>
    api().getPageSizeProps(),
);
/** The page-size select's label: "Items per page:". */
const PageSizeLabel = span("pageSizeLabel", "PageSizeLabel", ({ api }) =>
    api().getPageSizeLabelProps(),
);
/** The element sized for the page-size select. */
const PageSizeSelect = div("pageSizeSelect", "PageSizeSelect", ({ api }) =>
    api().getPageSizeSelectProps(),
);
/** The row of the first, previous, next and last triggers. */
const Actions = div("actions", "Actions", ({ api }) => api().getActionsProps());

/** The range label: "1 – 10 of 100", a polite live region. Its text is the default content. */
function RangeLabel(props: PaginatorPartProps): JSX.Element {
    const { scope, api, props: root } = context.use("RangeLabel");
    const text = () =>
        paginatorRangeLabel(
            paginatorRange(api().page, api().pageSize, api().count),
            root.translations,
        );
    return scope.render("rangeLabel", {
        element: "span",
        machine: () => api().getRangeLabelProps(),
        unstyled: () => props.unstyled,
        props: merge(omit(props, "unstyled", "children"), {
            get children() {
                return props.children ?? text();
            },
        }),
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

const GLYPHS: Record<TriggerKind, () => JSX.Element> = {
    first: () => <FirstPageIcon />,
    prev: () => <ChevronStartIcon />,
    next: () => <ChevronEndIcon />,
    last: () => <LastPageIcon />,
};

const trigger = (kind: TriggerKind) =>
    function Trigger(props: PaginatorTriggerProps): JSX.Element {
        const { part, label } = TRIGGERS[kind];
        const { scope, api, props: root } = context.use(label);
        const machine = () => {
            const a = api();
            const zag = {
                first: a.getFirstTriggerProps,
                prev: a.getPrevTriggerProps,
                next: a.getNextTriggerProps,
                last: a.getLastTriggerProps,
            }[kind]();
            return paginatorTriggerProps(zag, root.disabled);
        };
        return scope.render(part, {
            element: "button",
            as: () => props.as,
            machine,
            states: () => ({ mirrored: props.mirror ?? true }),
            unstyled: () => props.unstyled,
            props: merge(omit(props, "unstyled", "mirror", "as", "children"), {
                get children() {
                    return props.children ?? GLYPHS[kind]();
                },
            }),
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

/** The ready-made paginator's props: Root's, with `class`, `style`, and `slotProps` keyed by part. */
export interface PaginatorProps
    extends
        Omit<PaginatorRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy> {}

const READY_MADE_PROPS = ["class", "style", "slotProps"] as const;

function ReadyMadeParts(props: {
    readonly slots: (part: PartName<Anatomy>) => PartProps;
}): JSX.Element {
    const { api, props: root } = context.use("Paginator");
    const sizes = createMemo(() =>
        paginatorSizeItems(
            paginatorPageSizes(root.pageSizeOptions, api().pageSize),
        ),
    );
    const label = () => root.translations?.itemsPerPage ?? "Items per page:";
    return (
        <>
            <Show when={!root.hidePageSize}>
                <PageSize {...props.slots("pageSize")}>
                    <PageSizeLabel {...props.slots("pageSizeLabel")}>
                        {label()}
                    </PageSizeLabel>
                    <PageSizeSelect {...props.slots("pageSizeSelect")}>
                        <Select
                            variant="outlined"
                            aria-label={label()}
                            items={sizes()}
                            value={String(api().pageSize)}
                            disabled={root.disabled}
                            onValueChange={(details) => {
                                const next = Number(details.value);
                                if (next > 0) api().setPageSize(next);
                            }}
                        />
                    </PageSizeSelect>
                </PageSize>
            </Show>
            <RangeLabel {...props.slots("rangeLabel")} />
            <Actions {...props.slots("actions")}>
                <Show when={root.showFirstLastButtons}>
                    <FirstTrigger
                        as={IconButton}
                        {...props.slots("firstTrigger")}
                    />
                </Show>
                <PrevTrigger as={IconButton} {...props.slots("prevTrigger")} />
                <NextTrigger as={IconButton} {...props.slots("nextTrigger")} />
                <Show when={root.showFirstLastButtons}>
                    <LastTrigger
                        as={IconButton}
                        {...props.slots("lastTrigger")}
                    />
                </Show>
            </Actions>
        </>
    );
}

/** The ready-made paginator: the page-size select, the range label, and the previous and next
 *  buttons (with first and last when `showFirstLastButtons`). */
function ReadyMade(props: PaginatorProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as PaginatorRootProps;
    return (
        <Root {...own} {...(slots("root") as object)}>
            <ReadyMadeParts slots={slots} />
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
