// The dialog that sets a category's monthly budget: a slider for the rough amount and a field for
// the exact one, kept in step.

import { css } from "$css";
import { Button } from "@pureform/solid/button";
import { Dialog } from "@pureform/solid/dialog";
import { Slider } from "@pureform/solid/slider";
import { Text } from "@pureform/solid/text";
import { TextField } from "@pureform/solid/text-field";
import type { JSX } from "@solidjs/web";
import { createSignal, Show, untrack } from "solid-js";

import { formatMoney, formatWholeMoney, parseAmount } from "../lib/budget";
import type { CategorySummary } from "../lib/budget";
import { Glyph } from "../ui/icons";

const layer = css({ zIndex: 1 });

const surface = css({
    width: "calc(token(spacing.16) * 6)",
    maxWidth: "100%",
});

const body = css({ display: "grid", gap: "4" });

const form = css({ display: "contents" });

const STEP = 1_000;

function BudgetForm(props: {
    category: CategorySummary;
    onSave(budget: number): void;
    onCancel(): void;
}): JSX.Element {
    // The category's budget and spending when the dialog opened; the form owns its values from
    // there.
    const { budget: initial, total } = untrack(() => ({
        budget: props.category.budget,
        total: props.category.total,
    }));
    const [budget, setBudget] = createSignal(initial);
    const [text, setText] = createSignal(String(initial / 100));
    const max = Math.max(200_000, Math.ceil((initial * 2) / 50_000) * 50_000);
    const invalid = () => parseAmount(text()) === undefined && text() !== "0";

    return (
        <form
            class={form}
            novalidate
            onSubmit={(event) => {
                event.preventDefault();
                if (!invalid()) props.onSave(budget());
            }}
        >
            <Dialog.Body class={body}>
                <Text textStyle="bodyMedium">
                    Spent {formatMoney(total)} so far this month.
                </Text>
                <Slider
                    aria-label="Monthly budget"
                    aria-valuetext={formatWholeMoney(budget())}
                    min={0}
                    max={max}
                    step={STEP}
                    value={budget()}
                    onValueChange={(d) => {
                        setBudget(d.value);
                        setText(String(d.value / 100));
                    }}
                />
                <TextField
                    label="Monthly budget"
                    value={text()}
                    onValueChange={(d) => {
                        setText(d.value);
                        const cents = parseAmount(d.value);
                        if (cents !== undefined) setBudget(cents);
                    }}
                    error={invalid() ? "An amount of zero or more" : undefined}
                    inputmode="decimal"
                    autocomplete="off"
                    leadingIcon={<Glyph name="money" />}
                />
            </Dialog.Body>
            <Dialog.Actions>
                <Button
                    variant="text"
                    label="Cancel"
                    onClick={() => props.onCancel()}
                />
                <Button variant="text" label="Save" type="submit" />
            </Dialog.Actions>
        </form>
    );
}

/** The dialog, open while `category` is set. */
export function BudgetDialog(props: {
    category: CategorySummary | undefined;
    onSave(category: CategorySummary, budget: number): void;
    onClose(): void;
}): JSX.Element {
    return (
        <Dialog.Root
            open={props.category !== undefined}
            onOpenChange={(details) => {
                if (!details.open) props.onClose();
            }}
            testId="budget"
        >
            <Dialog.Backdrop class={layer} />
            <Dialog.Positioner class={layer}>
                <Dialog.Content class={surface}>
                    <Dialog.Headline>
                        {props.category?.name} budget
                    </Dialog.Headline>
                    <Show when={props.category} keyed>
                        {(category) => (
                            <BudgetForm
                                category={category}
                                onSave={(budget) => {
                                    props.onSave(category, budget);
                                    props.onClose();
                                }}
                                onCancel={() => props.onClose()}
                            />
                        )}
                    </Show>
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    );
}
