// Transactions as a list: each row a button that opens it in the dialog, with its category's
// icon, where and when, and the amount (income in the success color).

import { css } from "$css";
import { Avatar } from "@pureform/solid/avatar";
import { List } from "@pureform/solid/list";
import type { JSX } from "@solidjs/web";
import { createMemo } from "solid-js";

import { formatDay, formatMoney, signedAmount } from "../lib/budget";
import type { Category, Transaction } from "../lib/budget";
import { Glyph } from "../ui/icons";
import { useBudgetActions } from "./actions";

// A row is a <button>, which sizes to its content and centers its text unless told otherwise.
const row = css({ width: "100%", textAlign: "start" });

export function TransactionList(props: {
    transactions: readonly Transaction[];
    categories: readonly Category[];
}): JSX.Element {
    const { editTransaction } = useBudgetActions();
    const items = createMemo(() =>
        props.transactions.map((transaction) => {
            const category = props.categories.find(
                (c) => c.id === transaction.categoryId,
            );
            const amount = signedAmount(transaction, props.categories);
            return {
                value: transaction.id,
                as: "button" as const,
                headline: transaction.description,
                supportingText: `${category?.name ?? "Uncategorized"} · ${formatDay(transaction.date)}`,
                leading: (
                    <Avatar color={category?.color ?? "secondary"}>
                        <Glyph name={category?.icon ?? "category"} />
                    </Avatar>
                ),
                trailingText: formatMoney(amount, { sign: true }),
                tokens:
                    amount > 0
                        ? { trailingColor: "var(--colors-success)" }
                        : undefined,
                onClick: () => editTransaction(transaction),
            };
        }),
    );
    return (
        <List
            items={items()}
            tokens={{ container: "transparent" }}
            slotProps={{ root: { class: row } }}
        />
    );
}
