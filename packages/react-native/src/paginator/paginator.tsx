// The paginator: a row the registry styles, holding the page-size select with its label, the
// range label, and the first (optional), previous, next and last (optional) icon buttons, over the
// page and page size it keeps (there is no machine on React Native; `binding-core`'s arithmetic
// is the same). Angular Material's paginator is the model; M3 has none.

import { paginatorAnatomy } from "@pureform/anatomy";
import {
    DEFAULT_PAGE_SIZE,
    paginatorClampPage,
    paginatorPageAfterSize,
    paginatorPageSizes,
    paginatorRange,
    paginatorRangeLabel,
    paginatorSelection,
    paginatorSizeItems,
    paginatorTotalPages,
    providedTokensFromPaths,
} from "@pureform/binding-core";
import type {
    PaginatorPart,
    PaginatorRootOwnProps,
} from "@pureform/binding-core";
import { useRef } from "react";
import type { ReactNode } from "react";

import { IconButton } from "../icon-button/icon-button";
import { testIdOf, useControllable, withEngine } from "../parts";
import { ProvidedTokens } from "../provided-tokens";
import { Select } from "../select/select";
import type { SelectProps } from "../select/select";
import { nativeSlots } from "../slot-props";
import type { InnerPropsOf, NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface PaginatorHosts {
    readonly firstTrigger: "View";
    readonly prevTrigger: "View";
    readonly nextTrigger: "View";
    readonly lastTrigger: "View";
    readonly root: "View";
    readonly pageSize: "View";
    readonly pageSizeLabel: "Text";
    readonly pageSizeSelect: "View";
    readonly rangeLabel: "Text";
    readonly actions: "View";
}

export interface PaginatorProps
    extends
        Omit<PaginatorRootOwnProps, "id" | "unstyled">,
        NativeSlotProps<PaginatorHosts> {
    /** The page size select's `style`, `slotProps`, `tokens`, `testId` and `menuProps`. */
    readonly selectProps?:
        | (InnerPropsOf<SelectProps> & {
              readonly menuProps?: SelectProps["menuProps"];
          })
        | undefined;
    readonly "aria-label"?: string | undefined;
}

type Trigger = "firstTrigger" | "prevTrigger" | "nextTrigger" | "lastTrigger";

function PaginatorImpl(props: PaginatorProps): ReactNode {
    const {
        styles: s,
        views: v,
        selected,
    } = useComponentSlots<PaginatorPart>(
        "paginator",
        paginatorSelection(props),
    );
    const count = Math.max(props.count ?? 0, 0);
    const [pageSize, setPageSize] = useControllable(
        "Paginator",
        "pageSize",
        props.pageSize,
        props.defaultPageSize,
        props.onPageSizeChange,
        DEFAULT_PAGE_SIZE,
    );
    // The page size a page change reports: the new one, when the change comes with it.
    const reported = useRef(pageSize);
    // oxlint-disable-next-line react/refs -- the latest value for callbacks and gestures that run after render
    reported.current = pageSize;
    const [rawPage, setPage] = useControllable(
        "Paginator",
        "page",
        props.page,
        props.defaultPage,
        (details) =>
            props.onPageChange?.({
                page: details.page,
                pageSize: reported.current,
            }),
        1,
    );
    const page = paginatorClampPage(rawPage, count, pageSize);
    const pages = paginatorTotalPages(count, pageSize);
    const id = (part: PaginatorPart) =>
        testIdOf(paginatorAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    const words = props.translations;
    const go = (next: number) => {
        const target = paginatorClampPage(next, count, pageSize);
        if (target !== page) setPage(target);
    };
    const choose = (size: number) => {
        if (size === pageSize) return;
        const target = paginatorPageAfterSize(page, pageSize, size);
        reported.current = size;
        setPageSize(size);
        if (target !== page) setPage(target);
    };
    const first = page <= 1;
    const last = page >= pages;
    const label = words?.itemsPerPage ?? "Items per page:";
    const trigger = (
        part: Trigger,
        name: string,
        glyph: string,
        disabled: boolean,
        to: number,
    ) => {
        const Slot = v[part];
        return (
            <Slot.View
                {...slot.props(part)}
                style={slot.style(part, s[part])}
                testID={id(part)}
            >
                <IconButton
                    aria-label={name}
                    icon={glyph}
                    mirrorIcon
                    testId={`${id(part)}-button`}
                    disabled={disabled || props.disabled}
                    onPress={() => go(to)}
                />
            </Slot.View>
        );
    };
    return (
        <v.root.View
            {...slot.props("root")}
            role="group"
            aria-label={props["aria-label"] ?? words?.rootLabel ?? "Pagination"}
            style={slot.style("root", s.root)}
            testID={id("root")}
        >
            {props.hidePageSize ? null : (
                <v.pageSize.View
                    {...slot.props("pageSize")}
                    style={slot.style("pageSize", s.pageSize)}
                    testID={id("pageSize")}
                >
                    <v.pageSizeLabel.Text
                        {...slot.props("pageSizeLabel")}
                        style={slot.style("pageSizeLabel", s.pageSizeLabel)}
                        testID={id("pageSizeLabel")}
                    >
                        {label}
                    </v.pageSizeLabel.Text>
                    <v.pageSizeSelect.View
                        {...slot.props("pageSizeSelect")}
                        style={slot.style("pageSizeSelect", s.pageSizeSelect)}
                        testID={id("pageSizeSelect")}
                    >
                        <ProvidedTokens
                            tokens={providedTokensFromPaths(
                                selected.providedTokens["pageSizeSelect"],
                            )}
                        >
                            <Select
                                {...props.selectProps}
                                variant="outlined"
                                density={props.density}
                                label={label}
                                items={paginatorSizeItems(
                                    paginatorPageSizes(
                                        props.pageSizeOptions,
                                        pageSize,
                                    ),
                                )}
                                value={String(pageSize)}
                                disabled={props.disabled}
                                onValueChange={(details) => {
                                    const next = Number(details.value);
                                    if (next > 0) choose(next);
                                }}
                            />
                        </ProvidedTokens>
                    </v.pageSizeSelect.View>
                </v.pageSize.View>
            )}
            <v.rangeLabel.Text
                {...slot.props("rangeLabel")}
                aria-live="polite"
                style={slot.style("rangeLabel", s.rangeLabel)}
                testID={id("rangeLabel")}
            >
                {paginatorRangeLabel(
                    paginatorRange(page, pageSize, count),
                    words,
                )}
            </v.rangeLabel.Text>
            <v.actions.View
                {...slot.props("actions")}
                style={slot.style("actions", s.actions)}
                testID={id("actions")}
            >
                <ProvidedTokens
                    tokens={providedTokensFromPaths(
                        selected.providedTokens["actions"],
                    )}
                >
                    {props.showFirstLastButtons
                        ? trigger(
                              "firstTrigger",
                              words?.firstPage ?? "First page",
                              "«",
                              first,
                              1,
                          )
                        : null}
                    {trigger(
                        "prevTrigger",
                        words?.previousPage ?? "Previous page",
                        "‹",
                        first,
                        page - 1,
                    )}
                    {trigger(
                        "nextTrigger",
                        words?.nextPage ?? "Next page",
                        "›",
                        last,
                        page + 1,
                    )}
                    {props.showFirstLastButtons
                        ? trigger(
                              "lastTrigger",
                              words?.lastPage ?? "Last page",
                              "»",
                              last,
                              pages,
                          )
                        : null}
                </ProvidedTokens>
            </v.actions.View>
        </v.root.View>
    );
}

/** The paginator (Angular Material's; M3 has none): `<Paginator count={95} defaultPageSize={10} />`. */
export const Paginator = withEngine(PaginatorImpl, "Paginator");
