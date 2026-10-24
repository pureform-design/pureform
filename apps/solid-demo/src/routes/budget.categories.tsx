import { css } from "$css";
import { Avatar } from "@pureform/solid/avatar";
import { Button } from "@pureform/solid/button";
import { Card } from "@pureform/solid/card";
import { LinearProgress } from "@pureform/solid/linear-progress";
import { List } from "@pureform/solid/list";
import { SupportingText } from "@pureform/solid/supporting-text";
import { Text } from "@pureform/solid/text";
import { useMutation, useQuery } from "@tanstack/solid-query";
import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import { createMemo, createSignal, For } from "solid-js";

import { useBudgetActions } from "../budget/actions";
import { BudgetDialog } from "../budget/budget-dialog";
import {
    count,
    formatMoney,
    formatMonth,
    formatWholeMoney,
} from "../lib/budget";
import type { CategorySummary } from "../lib/budget";
import { setCategoryBudget } from "../lib/budget-functions";
import {
    budgetCategoriesQuery,
    budgetOverviewQuery,
    prefetch,
} from "../lib/queries";
import { Glyph } from "../ui/icons";

export const Route = createFileRoute("/budget/categories")({
    loader: ({ context }) => {
        prefetch(context.queryClient, budgetOverviewQuery());
    },
    staticData: { title: "Categories" },
    head: () => ({ meta: [{ title: "Categories · Budget" }] }),
    component: Categories,
});

const page = css({ display: "grid", gap: "4", md: { gap: "6" } });

const intro = css({ display: "grid", gap: "1" });

const muted = css({ color: "onSurfaceVariant" });

const grid = css({
    display: "grid",
    gap: "4",
    gridTemplateColumns:
        "repeat(auto-fill, minmax(calc(token(spacing.16) * 4), 1fr))",
});

const card = css({ display: "grid", gap: "3", alignContent: "start" });

const header = css({ display: "flex", alignItems: "center", gap: "3" });

const stack = css({ display: "grid" });

const amounts = css({ display: "flex", alignItems: "baseline", gap: "2" });

const actions = css({
    display: "flex",
    justifyContent: "flex-end",
    gap: "2",
    marginInlineEnd: "-2",
});

function Categories() {
    const navigate = useNavigate();
    const { notify } = useBudgetActions();
    const overview = useQuery(budgetOverviewQuery);
    const categories = useQuery(budgetCategoriesQuery);
    const [adjusting, setAdjusting] = createSignal<CategorySummary>();

    // The arrow keeps useMutation's context argument out of the RPC.
    const setBudget = useMutation(() => ({
        mutationFn: (input: { categoryId: string; budget: number }) =>
            setCategoryBudget(input),
        onSuccess: () => notify("Budget updated"),
    }));

    const expenses = createMemo(() =>
        categories.data.filter((c) => c.kind === "expense"),
    );
    const income = createMemo(() =>
        categories.data
            .filter((c) => c.kind === "income")
            .map((c) => ({
                value: c.id,
                headline: c.name,
                supportingText: count(c.count, "payment", "payments"),
                leading: (
                    <Avatar color={c.color}>
                        <Glyph name={c.icon} />
                    </Avatar>
                ),
                trailingText: formatMoney(c.total),
            })),
    );

    return (
        <div class={page}>
            <div class={intro}>
                <Text as="h2" textStyle="headlineSmall">
                    {formatMonth(overview.data.month)}
                </Text>
                <Text textStyle="bodyMedium" class={muted}>
                    {formatWholeMoney(overview.data.spent)} spent of{" "}
                    {formatWholeMoney(overview.data.budgeted)} budgeted across{" "}
                    {count(expenses().length, "category", "categories")}
                </Text>
            </div>

            <div class={grid}>
                <For each={expenses()}>
                    {(category) => {
                        const share = () =>
                            category.budget > 0
                                ? (category.total / category.budget) * 100
                                : 100;
                        const left = () => category.budget - category.total;
                        return (
                            <Card
                                variant="outlined"
                                class={{ root: card }}
                                data-testid={`category-${category.id}`}
                            >
                                <div class={header}>
                                    <Avatar color={category.color}>
                                        <Glyph name={category.icon} />
                                    </Avatar>
                                    <div class={stack}>
                                        <Text as="h3" textStyle="titleMedium">
                                            {category.name}
                                        </Text>
                                        <Text
                                            textStyle="bodySmall"
                                            class={muted}
                                        >
                                            {count(
                                                category.count,
                                                "transaction",
                                                "transactions",
                                            )}
                                        </Text>
                                    </div>
                                </div>
                                <div class={amounts}>
                                    <Text textStyle="titleLarge">
                                        {formatWholeMoney(category.total)}
                                    </Text>
                                    <Text textStyle="bodyMedium" class={muted}>
                                        of {formatWholeMoney(category.budget)}
                                    </Text>
                                </div>
                                <LinearProgress
                                    value={Math.min(100, share())}
                                    color={
                                        share() > 100
                                            ? "error"
                                            : share() > 85
                                              ? "warning"
                                              : "primary"
                                    }
                                    aria-label={`${category.name} budget used`}
                                />
                                <SupportingText
                                    tone={left() < 0 ? "error" : "neutral"}
                                >
                                    {left() < 0
                                        ? `${formatMoney(-left())} over budget`
                                        : `${formatMoney(left())} left`}
                                </SupportingText>
                                <div class={actions}>
                                    <Button
                                        variant="text"
                                        label="Transactions"
                                        onClick={() =>
                                            void navigate({
                                                to: "/budget/transactions",
                                                search: {
                                                    category: category.id,
                                                },
                                            })
                                        }
                                    />
                                    <Button
                                        variant="tonal"
                                        label="Adjust"
                                        aria-label={`Adjust the ${category.name} budget`}
                                        onClick={() => setAdjusting(category)}
                                    />
                                </div>
                            </Card>
                        );
                    }}
                </For>
            </div>

            <section class={intro}>
                <Text as="h2" textStyle="titleMedium">
                    Income this month
                </Text>
                <List
                    items={income()}
                    listItemProps={{ tokens: { container: "transparent" } }}
                />
            </section>

            <BudgetDialog
                category={adjusting()}
                onSave={(category, budget) =>
                    setBudget.mutate({ categoryId: category.id, budget })
                }
                onClose={() => setAdjusting(undefined)}
            />
        </div>
    );
}
