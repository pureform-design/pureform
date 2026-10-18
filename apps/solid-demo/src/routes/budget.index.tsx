import { css } from "$css";
import { Avatar } from "@pureform/solid/avatar";
import { Button } from "@pureform/solid/button";
import { Card } from "@pureform/solid/card";
import { LinearProgress } from "@pureform/solid/linear-progress";
import { Text } from "@pureform/solid/text";
import { useQuery } from "@tanstack/solid-query";
import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import { For } from "solid-js";

import { TransactionList } from "../budget/transaction-list";
import {
    formatMoney,
    formatMonth,
    formatMonthShort,
    formatWholeMoney,
} from "../lib/budget";
import {
    budgetCategoriesQuery,
    budgetOverviewQuery,
    budgetTransactionsQuery,
    prefetch,
} from "../lib/queries";
import { BarChart } from "../ui/bar-chart";
import { Glyph } from "../ui/icons";

export const Route = createFileRoute("/budget/")({
    loader: ({ context }) => {
        prefetch(context.queryClient, budgetOverviewQuery());
        prefetch(context.queryClient, budgetTransactionsQuery());
    },
    staticData: { title: "Overview" },
    head: () => ({ meta: [{ title: "Overview · Budget" }] }),
    component: Overview,
});

const page = css({ display: "grid", gap: "4", md: { gap: "6" } });

const summary = css({
    display: "grid",
    gap: "4",
    gridTemplateColumns:
        "repeat(auto-fit, minmax(calc(token(spacing.16) * 4), 1fr))",
});

const columns = css({
    display: "grid",
    gap: "4",
    alignItems: "start",
    lg: { gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "6" },
});

const card = css({ display: "grid", gap: "3", alignContent: "start" });

const balance = css({ display: "grid", gap: "1", alignContent: "start" });

const heading = css({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "2",
    minHeight: "token(spacing.10)",
});

const stat = css({ display: "flex", alignItems: "center", gap: "3" });

const stack = css({ display: "grid" });

const muted = css({ color: "onSurfaceVariant" });

const budgets = css({ display: "grid", gap: "4" });

const budgetRow = css({ display: "grid", gap: "2" });

const budgetLine = css({
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "2",
});

const flush = css({ marginInline: "-4" });

function Overview() {
    const navigate = useNavigate();
    const overview = useQuery(budgetOverviewQuery);
    const categories = useQuery(budgetCategoriesQuery);
    const transactions = useQuery(budgetTransactionsQuery);

    const data = () => overview.data;
    const net = () => data().income - data().spent;
    const used = () =>
        [...categories.data]
            .filter((c) => c.kind === "expense" && c.budget > 0)
            .sort((a, b) => b.total / b.budget - a.total / a.budget)
            .slice(0, 4);

    return (
        <div class={page}>
            <section class={summary} aria-label="This month">
                <Card
                    variant="filled"
                    class={{ root: balance }}
                    tokens={{
                        filledContainer: "var(--colors-primary-container)",
                        content: "var(--colors-on-primary-container)",
                    }}
                >
                    <Text textStyle="labelLarge">Balance</Text>
                    <Text textStyle="displaySmall" data-testid="balance">
                        {formatMoney(data().balance)}
                    </Text>
                    <Text textStyle="bodyMedium">
                        {formatMoney(net(), { sign: true })} in{" "}
                        {formatMonth(data().month)}
                    </Text>
                </Card>
                <Card variant="outlined" class={{ root: card }}>
                    <div class={stat}>
                        <Avatar color="success">
                            <Glyph name="trendingUp" />
                        </Avatar>
                        <div class={stack}>
                            <Text textStyle="labelLarge" class={muted}>
                                Income
                            </Text>
                            <Text textStyle="headlineSmall">
                                {formatMoney(data().income)}
                            </Text>
                        </div>
                    </div>
                    <Text textStyle="bodySmall" class={muted}>
                        This month, from salary and freelance work
                    </Text>
                </Card>
                <Card variant="outlined" class={{ root: card }}>
                    <div class={stat}>
                        <Avatar color="error">
                            <Glyph name="trendingDown" />
                        </Avatar>
                        <div class={stack}>
                            <Text textStyle="labelLarge" class={muted}>
                                Spent
                            </Text>
                            <Text textStyle="headlineSmall">
                                {formatMoney(data().spent)}
                            </Text>
                        </div>
                    </div>
                    <LinearProgress
                        value={Math.min(
                            100,
                            (data().spent / data().budgeted) * 100,
                        )}
                        color={
                            data().spent > data().budgeted ? "error" : "primary"
                        }
                        aria-label="Spent of the month's budget"
                    />
                    <Text textStyle="bodySmall" class={muted}>
                        Of {formatWholeMoney(data().budgeted)} budgeted
                    </Text>
                </Card>
            </section>

            <div class={columns}>
                <Card variant="outlined" class={{ root: card }}>
                    <div class={heading}>
                        <Text as="h2" textStyle="titleMedium">
                            Last six months
                        </Text>
                    </div>
                    <BarChart
                        label="Income and spending, last six months"
                        description={data()
                            .history.map(
                                (m) =>
                                    `${formatMonth(m.month)}: ${formatWholeMoney(m.income)} in, ${formatWholeMoney(m.spent)} out`,
                            )
                            .join("; ")}
                        series={[
                            { name: "Income", tone: "tertiary" },
                            { name: "Spent", tone: "primary" },
                        ]}
                        groups={data().history.map((m) => ({
                            label: formatMonthShort(m.month),
                            values: [m.income, m.spent],
                        }))}
                    />
                </Card>

                <Card variant="outlined" class={{ root: card }}>
                    <div class={heading}>
                        <Text as="h2" textStyle="titleMedium">
                            Budgets
                        </Text>
                        <Button
                            variant="text"
                            label="All categories"
                            onClick={() =>
                                void navigate({ to: "/budget/categories" })
                            }
                        />
                    </div>
                    <div class={budgets}>
                        <For each={used()}>
                            {(category) => {
                                const share = () =>
                                    (category.total / category.budget) * 100;
                                return (
                                    <div class={budgetRow}>
                                        <div class={budgetLine}>
                                            <Text textStyle="titleSmall">
                                                {category.name}
                                            </Text>
                                            <Text
                                                textStyle="bodySmall"
                                                class={muted}
                                            >
                                                {formatWholeMoney(
                                                    category.total,
                                                )}{" "}
                                                of{" "}
                                                {formatWholeMoney(
                                                    category.budget,
                                                )}
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
                                    </div>
                                );
                            }}
                        </For>
                    </div>
                </Card>
            </div>

            <Card variant="outlined" class={{ root: card }}>
                <div class={heading}>
                    <Text as="h2" textStyle="titleMedium">
                        Recent transactions
                    </Text>
                    <Button
                        variant="text"
                        label="See all"
                        onClick={() =>
                            void navigate({ to: "/budget/transactions" })
                        }
                    />
                </div>
                <div class={flush}>
                    <TransactionList
                        transactions={transactions.data.slice(0, 5)}
                        categories={categories.data}
                    />
                </div>
            </Card>
        </div>
    );
}
