// Transactions as a list: each row a button that opens it in the dialog, with its category's
// icon, where and when, and the amount (income in the success color).

import { css } from "$css";
import { Avatar } from "@pureform/solid/avatar";
import { List } from "@pureform/solid/list";
import { ListItem } from "@pureform/solid/list-item";
import type { JSX } from "@solidjs/web";
import { createMemo, For } from "solid-js";

import { formatDay, formatMoney, signedAmount } from "../lib/budget";
import type { Category, Transaction } from "../lib/budget";
import { Glyph } from "../ui/icons";
import { useBudgetActions } from "./actions";

// A row is a <button>, which sizes to its content and centers its text unless told otherwise.
const row = css({ width: "100%", textAlign: "start" });

export function TransactionList(props: {
    transactions: readonly Transaction[];
    categories: readonly Category[];
    /** Which rows show: the rest stay mounted, hidden (and so left out of the list's items for
     *  assistive technology), so a filter only toggles them. Every row, by default. */
    shown?: (transaction: Transaction) => boolean;
}): JSX.Element {
    return (
        <List.Root tokens={{ container: "transparent" }}>
            {/* By reference: the query's data is a store that keeps a transaction's object when
                it changes, so a row is made once and reads its fields as they're drawn. */}
            <For each={props.transactions}>
                {(transaction) => (
                    <List.Item hidden={props.shown?.(transaction) === false}>
                        <TransactionRow
                            transaction={transaction}
                            categories={props.categories}
                        />
                    </List.Item>
                )}
            </For>
        </List.Root>
    );
}

function TransactionRow(props: {
    transaction: Transaction;
    categories: readonly Category[];
}): JSX.Element {
    const { editTransaction } = useBudgetActions();
    const category = createMemo(() =>
        props.categories.find((c) => c.id === props.transaction.categoryId),
    );
    const amount = createMemo(() =>
        signedAmount(props.transaction, props.categories),
    );
    // Memos, since the list item reads its text more than once (whether it's there, the lines).
    const supportingText = createMemo(
        () =>
            `${category()?.name ?? "Uncategorized"} · ${formatDay(props.transaction.date)}`,
    );
    const trailingText = createMemo(() =>
        formatMoney(amount(), { sign: true }),
    );
    return (
        <ListItem
            as="button"
            class={{ root: row }}
            headline={props.transaction.description}
            supportingText={supportingText()}
            leading={
                <Avatar color={category()?.color ?? "secondary"}>
                    <Glyph name={category()?.icon ?? "category"} />
                </Avatar>
            }
            trailingText={trailingText()}
            tokens={
                amount() > 0
                    ? { trailingColor: "var(--colors-success)" }
                    : undefined
            }
            onClick={() => editTransaction(props.transaction)}
        />
    );
}
