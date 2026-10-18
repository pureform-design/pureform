// The dialog that adds or edits a transaction. The layout's actions store it (one request, whose
// single-flight response refreshes every budget query the page shows).

import { css } from "$css";
import { Button } from "@pureform/solid/button";
import { Dialog } from "@pureform/solid/dialog";
import { Select } from "@pureform/solid/select";
import { TextArea } from "@pureform/solid/text-area";
import { TextField } from "@pureform/solid/text-field";
import type { JSX } from "@solidjs/web";
import { useQuery } from "@tanstack/solid-query";
import { createSignal, Show, untrack } from "solid-js";

import { amountText, parseAmount } from "../lib/budget";
import type { Transaction, TransactionInput } from "../lib/budget";
import { budgetCategoriesQuery } from "../lib/queries";
import { Glyph } from "../ui/icons";
import { overlay } from "../ui/layers";
import { useBudgetActions } from "./actions";

const surface = css({
    width: "calc(token(spacing.16) * 7)",
    maxWidth: "100%",
    maxHeight: "100%",
    overflowY: "auto",
});

const form = css({ display: "contents" });

const fields = css({ display: "grid", gap: "4" });

const row = css({
    display: "grid",
    gridTemplateColumns:
        "repeat(auto-fit, minmax(calc(token(spacing.16) * 2.5), 1fr))",
    gap: "4",
});

const actions = css({ flexWrap: "wrap" });

const spacer = css({ flex: "1" });

/** A transaction being edited: `id` is set for an existing one. */
export type Draft = Partial<TransactionInput>;

const today = () => new Date().toISOString().slice(0, 10);

function TransactionForm(props: {
    draft: Draft;
    original: Transaction | undefined;
    onDone(): void;
}): JSX.Element {
    const { save, remove } = useBudgetActions();
    const categories = useQuery(budgetCategoriesQuery);
    // The draft is the form's starting point; the fields own their values from there.
    const start = untrack(() => ({ ...props.draft }));
    const [description, setDescription] = createSignal(start.description ?? "");
    const [amount, setAmount] = createSignal(
        start.amount === undefined ? "" : amountText(start.amount),
    );
    const [categoryId, setCategoryId] = createSignal<string | null>(
        start.categoryId ?? null,
    );
    const [date, setDate] = createSignal(start.date ?? today());
    const [note, setNote] = createSignal(start.note ?? "");
    const [submitted, setSubmitted] = createSignal(false);

    const cents = () => parseAmount(amount());
    const errors = () => ({
        description: description().trim() ? undefined : "Say what it was",
        amount: cents() === undefined ? "An amount above zero" : undefined,
        category: categoryId() ? undefined : "Pick a category",
    });
    const shown = (error: string | undefined) =>
        submitted() ? error : undefined;

    const submit = (event: SubmitEvent) => {
        event.preventDefault();
        setSubmitted(true);
        const e = errors();
        if (e.description || e.amount || e.category) return;
        save({
            ...(start.id ? { id: start.id } : {}),
            description: description(),
            amount: cents()!,
            categoryId: categoryId()!,
            date: date(),
            note: note(),
        });
        props.onDone();
    };

    const onDelete = () => {
        if (props.original) remove(props.original);
        props.onDone();
    };

    return (
        <form class={form} onSubmit={submit} novalidate>
            <Dialog.Body class={fields}>
                <TextField
                    label="Description"
                    value={description()}
                    onValueChange={(d) => setDescription(d.value)}
                    error={shown(errors().description)}
                    autocomplete="off"
                    data-autofocus
                />
                <div class={row}>
                    <TextField
                        label="Amount"
                        value={amount()}
                        onValueChange={(d) => setAmount(d.value)}
                        error={shown(errors().amount)}
                        inputmode="decimal"
                        autocomplete="off"
                        leadingIcon={<Glyph name="money" />}
                    />
                    <TextField
                        label="Date"
                        type="date"
                        value={date()}
                        onValueChange={(d) => setDate(d.value)}
                    />
                </div>
                <Select
                    label="Category"
                    items={(categories.data ?? []).map((category) => ({
                        value: category.id,
                        label:
                            category.kind === "income"
                                ? `${category.name} (income)`
                                : category.name,
                    }))}
                    value={categoryId()}
                    onValueChange={(d) => setCategoryId(d.value)}
                    error={shown(errors().category)}
                    positioning={{ strategy: "fixed" }}
                />
                <TextArea
                    label="Note"
                    value={note()}
                    onValueChange={(d) => setNote(d.value)}
                    rows={2}
                    autoGrow
                    supportingText="Optional"
                />
            </Dialog.Body>
            <Dialog.Actions class={actions}>
                <Show when={props.original}>
                    <Button
                        variant="text"
                        color="error"
                        label="Delete"
                        onClick={onDelete}
                    />
                </Show>
                <span class={spacer} />
                <Button
                    variant="text"
                    label="Cancel"
                    onClick={() => props.onDone()}
                />
                <Button variant="text" label="Save" type="submit" />
            </Dialog.Actions>
        </form>
    );
}

/** The dialog, open while `draft` is set. */
export function TransactionDialog(props: {
    draft: Draft | undefined;
    original: Transaction | undefined;
    onClose(): void;
}): JSX.Element {
    return (
        <Dialog.Root
            open={props.draft !== undefined}
            onOpenChange={(details) => {
                if (!details.open) props.onClose();
            }}
            initialFocusEl={() =>
                document.querySelector<HTMLElement>(
                    "[data-transaction-form] input",
                )
            }
            testId="transaction"
        >
            <Dialog.Backdrop class={overlay} />
            <Dialog.Positioner class={overlay}>
                <Dialog.Content class={surface} data-transaction-form>
                    <Dialog.Headline>
                        {props.draft?.id
                            ? "Edit transaction"
                            : "New transaction"}
                    </Dialog.Headline>
                    <Show when={props.draft} keyed>
                        {(draft) => (
                            <TransactionForm
                                draft={draft}
                                original={props.original}
                                onDone={() => props.onClose()}
                            />
                        )}
                    </Show>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    );
}
