import { css } from "$css";
import { Button } from "@pureform/solid/button";
import { Chip } from "@pureform/solid/chip";
import { IconButton } from "@pureform/solid/icon-button";
import { SearchBar } from "@pureform/solid/search-bar";
import { Select } from "@pureform/solid/select";
import { Text } from "@pureform/solid/text";
import { useQuery } from "@tanstack/solid-query";
import { createFileRoute } from "@tanstack/solid-router";
import { createMemo, For, Show } from "solid-js";

import { TransactionList } from "../budget/transaction-list";
import { count, formatMoney, formatMonth, signedAmount } from "../lib/budget";
import type { Transaction } from "../lib/budget";
import { createProgress } from "../lib/progressive";
import {
    budgetCategoriesQuery,
    budgetTransactionsQuery,
    prefetch,
} from "../lib/queries";
import { Glyph } from "../ui/icons";

const KINDS = [
    { value: "all", label: "All" },
    { value: "expense", label: "Spending" },
    { value: "income", label: "Income" },
] as const;

type Kind = (typeof KINDS)[number]["value"];

/** The filters, in the URL: `?q=rent&kind=expense&category=housing`. */
interface Filters {
    q?: string;
    kind?: Exclude<Kind, "all">;
    category?: string;
}

const text = (value: unknown) =>
    typeof value === "string" && value !== "" ? value : undefined;

const parseFilters = (search: Record<string, unknown>): Filters => {
    const q = text(search.q);
    const category = text(search.category);
    const kind =
        search.kind === "expense" || search.kind === "income"
            ? search.kind
            : undefined;
    return {
        ...(q ? { q } : {}),
        ...(kind ? { kind } : {}),
        ...(category ? { category } : {}),
    };
};

/** The rows the page renders with it: about a screenful of the ones the filters show. */
const FIRST_ROWS = 16;

export const Route = createFileRoute("/budget/transactions")({
    validateSearch: parseFilters,
    loader: ({ context }) => {
        prefetch(context.queryClient, budgetTransactionsQuery());
    },
    staticData: { title: "Transactions" },
    head: () => ({ meta: [{ title: "Transactions · Budget" }] }),
    component: Transactions,
});

const page = css({ display: "grid", gap: "4" });

const toolbar = css({
    display: "grid",
    gap: "3",
    md: {
        gridTemplateColumns: "minmax(0, 1fr) auto",
        alignItems: "center",
    },
});

const filters = css({
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "2",
});

const select = css({ minWidth: "calc(token(spacing.16) * 3)" });

const muted = css({ color: "onSurfaceVariant" });

const monthList = css({ display: "grid", gap: "4" });

const month = css({ display: "grid", gap: "1" });

const monthHeading = css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "2",
    paddingInline: "4",
    paddingBlockStart: "2",
});

const flush = css({ marginInline: "-4", md: { marginInline: "0" } });

const empty = css({
    display: "grid",
    justifyItems: "center",
    gap: "3",
    paddingBlock: "12",
    textAlign: "center",
});

function Transactions() {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const transactions = useQuery(budgetTransactionsQuery);
    const categories = useQuery(budgetCategoriesQuery);

    const setFilters = (patch: Partial<Record<keyof Filters, string>>) =>
        void navigate({
            search: (previous) => {
                const next: Record<string, string | undefined> = {
                    ...previous,
                    ...patch,
                };
                return parseFilters(next);
            },
            replace: true,
        });

    const kind = (): Kind => search().kind ?? "all";

    const shown = createMemo(() => {
        const { q, kind, category } = search();
        const needle = q?.toLowerCase();
        const kinds = new Map(categories.data.map((c) => [c.id, c]));
        return transactions.data.filter((t) => {
            const c = kinds.get(t.categoryId);
            if (kind && c?.kind !== kind) return false;
            if (category && t.categoryId !== category) return false;
            if (
                needle &&
                !t.description.toLowerCase().includes(needle) &&
                !t.note.toLowerCase().includes(needle) &&
                !c?.name.toLowerCase().includes(needle)
            )
                return false;
            return true;
        });
    });

    const shownIds = createMemo(() => new Set(shown().map((t) => t.id)));
    const isShown = (t: Transaction) => shownIds().has(t.id);

    // Every transaction grouped by month, newest first, as the store keeps them. The filters
    // don't regroup them: each row stays mounted and hides when it's filtered out, so a filter
    // only toggles rows, and a month with none shown hides too.
    const months = createMemo(() => {
        const groups: { month: string; transactions: Transaction[] }[] = [];
        for (const t of transactions.data) {
            const key = t.date.slice(0, 7);
            if (groups.at(-1)?.month !== key)
                groups.push({ month: key, transactions: [] });
            groups.at(-1)!.transactions.push(t);
        }
        return groups;
    });

    // The rows rendered so far: the first screenful the filters show, with the page, then every
    // row up to the progress, in short tasks after it paints. A row stays once rendered, so a
    // filter changed meanwhile only adds its first screenful. Every row, once the progress has
    // covered them all.
    const progress = createProgress(() => transactions.data.length);
    const rendered = createMemo<ReadonlySet<Transaction> | undefined>(
        (previous) => {
            const all = transactions.data;
            const reached = progress();
            if (reached >= all.length) return undefined;
            const next = new Set(previous);
            for (const t of shown().slice(0, FIRST_ROWS)) next.add(t);
            for (let i = 0; i < reached; i++) next.add(all[i]!);
            return next;
        },
    );

    const net = (list: readonly Transaction[]) =>
        list.reduce((sum, t) => sum + signedAmount(t, categories.data), 0);

    const filtered = () =>
        search().q !== undefined ||
        search().kind !== undefined ||
        search().category !== undefined;

    return (
        <div class={page}>
            <div class={toolbar}>
                <SearchBar
                    aria-label="Search transactions"
                    placeholder="Search transactions"
                    value={search().q ?? ""}
                    onValueChange={(d) => setFilters({ q: d.value })}
                    leading={<Glyph name="search" />}
                    trailing={
                        <Show when={search().q}>
                            <IconButton
                                icon={<Glyph name="close" />}
                                aria-label="Clear the search"
                                onClick={() => setFilters({ q: "" })}
                            />
                        </Show>
                    }
                />
                <Select
                    class={{ root: select }}
                    label="Category"
                    variant="outlined"
                    items={[
                        { value: "all", label: "All categories" },
                        ...categories.data.map((c) => ({
                            value: c.id,
                            label: c.name,
                        })),
                    ]}
                    value={search().category ?? "all"}
                    onValueChange={(d) =>
                        setFilters({
                            category: d.value === "all" ? "" : (d.value ?? ""),
                        })
                    }
                />
            </div>
            {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a labelled row of toggle chips: none of the suggested elements (address, details, fieldset, hgroup, optgroup) fit, and a fieldset would bring its default border and padding */}
            <div class={filters} role="group" aria-label="Show">
                <For each={KINDS}>
                    {(option) => (
                        <Chip
                            label={option.label}
                            selected={kind() === option.value}
                            onSelectedChange={() =>
                                setFilters({
                                    kind:
                                        option.value === "all"
                                            ? ""
                                            : option.value,
                                })
                            }
                        />
                    )}
                </For>
            </div>
            <Text textStyle="bodyMedium" class={muted} aria-live="polite">
                {count(shown().length, "transaction", "transactions")},{" "}
                {formatMoney(net(shown()), { sign: true })} net
            </Text>
            <Show when={shown().length === 0}>
                <div class={empty}>
                    <Text textStyle="titleMedium">No transactions match</Text>
                    <Show when={filtered()}>
                        <Button
                            variant="tonal"
                            label="Clear the filters"
                            onClick={() =>
                                setFilters({
                                    q: "",
                                    kind: "",
                                    category: "",
                                })
                            }
                        />
                    </Show>
                </div>
            </Show>
            {/* Keyed by month: the groups are new when the transactions change, and a month
                that stays keeps its section and rows. Busy while rows are still to come. */}
            <div class={monthList} aria-busy={rendered() ? "true" : undefined}>
                <For each={months()} keyed={(group) => group.month}>
                    {(group) => {
                        const visible = createMemo(() =>
                            group().transactions.filter(isShown),
                        );
                        const rows = createMemo(() => {
                            const set = rendered();
                            const all = group().transactions;
                            return set ? all.filter((t) => set.has(t)) : all;
                        });
                        // While some of the month's rows are still to come, each shown row says
                        // where it stands among the month's shown rows, and how many there are.
                        const positions = createMemo(() =>
                            rows().length < group().transactions.length
                                ? new Map(visible().map((t, i) => [t, i + 1]))
                                : undefined,
                        );
                        const setSize = () =>
                            positions() ? visible().length : undefined;
                        return (
                            <Show when={rows().length > 0}>
                                <section
                                    class={month}
                                    hidden={visible().length === 0}
                                >
                                    <div class={monthHeading}>
                                        <Text as="h2" textStyle="titleSmall">
                                            {formatMonth(group().month)}
                                        </Text>
                                        <Text
                                            textStyle="labelMedium"
                                            class={muted}
                                        >
                                            {formatMoney(net(visible()), {
                                                sign: true,
                                            })}
                                        </Text>
                                    </div>
                                    <div class={flush}>
                                        <TransactionList
                                            transactions={rows()}
                                            categories={categories.data}
                                            shown={isShown}
                                            position={(t) =>
                                                positions()?.get(t)
                                            }
                                            setSize={setSize()}
                                        />
                                    </div>
                                </section>
                            </Show>
                        );
                    }}
                </For>
            </div>
        </div>
    );
}
