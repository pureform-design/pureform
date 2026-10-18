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
import { formatMoney, formatMonth, isolate, signedAmount } from "../lib/budget";
import type { Transaction } from "../lib/budget";
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

    // Grouped by month, newest first, as the store keeps them.
    const months = createMemo(() => {
        const groups: { month: string; transactions: Transaction[] }[] = [];
        for (const t of shown()) {
            const key = t.date.slice(0, 7);
            if (groups.at(-1)?.month !== key)
                groups.push({ month: key, transactions: [] });
            groups.at(-1)!.transactions.push(t);
        }
        return groups;
    });

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
                {isolate(String(shown().length))} transactions,{" "}
                {formatMoney(net(shown()), { sign: true })} net
            </Text>
            <Show
                when={months().length > 0}
                fallback={
                    <div class={empty}>
                        <Text textStyle="titleMedium">
                            No transactions match
                        </Text>
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
                }
            >
                <For each={months()}>
                    {(group) => (
                        <section class={month}>
                            <div class={monthHeading}>
                                <Text as="h2" textStyle="titleSmall">
                                    {formatMonth(group.month)}
                                </Text>
                                <Text textStyle="labelMedium" class={muted}>
                                    {formatMoney(net(group.transactions), {
                                        sign: true,
                                    })}
                                </Text>
                            </div>
                            <div class={flush}>
                                <TransactionList
                                    transactions={group.transactions}
                                    categories={categories.data}
                                />
                            </div>
                        </section>
                    )}
                </For>
            </Show>
        </div>
    );
}
