import { css } from "$css";
import { Button } from "@pureform/solid/button";
import { Dialog } from "@pureform/solid/dialog";
import { Fab } from "@pureform/solid/fab";
import { IconButton } from "@pureform/solid/icon-button";
import { NavigationBar } from "@pureform/solid/navigation-bar";
import { NavigationRail } from "@pureform/solid/navigation-rail";
import { Snackbar } from "@pureform/solid/snackbar";
import { useMutation } from "@tanstack/solid-query";
import {
    Outlet,
    createFileRoute,
    useLocation,
    useMatches,
    useNavigate,
} from "@tanstack/solid-router";
import { createSignal } from "solid-js";

import { BudgetActionsContext } from "../budget/actions";
import type { BudgetActions } from "../budget/actions";
import { TransactionDialog } from "../budget/transaction-dialog";
import type { Draft } from "../budget/transaction-dialog";
import type { Transaction, TransactionInput } from "../lib/budget";
import {
    deleteTransaction,
    resetBudget,
    saveTransaction,
} from "../lib/budget-functions";
import { budgetCategoriesQuery, prefetch } from "../lib/queries";
import { Glyph } from "../ui/icons";
import { TopAppBar } from "../ui/top-app-bar";

// The budget app's layout: its own top app bar, a navigation rail on wide screens and a
// navigation bar on compact ones, the FAB that adds a transaction, and the dialog and snackbar
// every page shares. The pages are its child routes.
export const Route = createFileRoute("/budget")({
    loader: ({ context }) => {
        prefetch(context.queryClient, budgetCategoriesQuery());
    },
    head: () => ({ meta: [{ title: "Budget" }] }),
    component: BudgetLayout,
});

const DESTINATIONS = [
    {
        value: "overview",
        label: "Overview",
        icon: "dashboard",
        href: "/budget",
    },
    {
        value: "transactions",
        label: "Transactions",
        icon: "list",
        href: "/budget/transactions",
    },
    {
        value: "categories",
        label: "Categories",
        icon: "pieChart",
        href: "/budget/categories",
    },
] as const;

const frame = css({
    display: "grid",
    minHeight: "100dvh",
    md: { gridTemplateColumns: "auto minmax(0, 1fr)" },
});

const rail = css({
    display: "none",
    md: {
        display: "flex",
        position: "sticky",
        top: "0",
        height: "100dvh",
        paddingBlockStart: "4",
    },
});

const column = css({ minWidth: "0", display: "flex", flexDirection: "column" });

// Room under the content for the FABs, and on compact screens the navigation bar.
const content = css({
    flex: "1",
    width: "100%",
    maxWidth: "calc(token(spacing.16) * 18)",
    marginInline: "auto",
    paddingInline: "4",
    paddingBlockStart: "2",
    paddingBlockEnd: "calc(token(spacing.16) * 3)",
    md: { paddingInline: "6", paddingBlockEnd: "calc(token(spacing.16) * 2)" },
});

const bar = css({
    position: "fixed",
    insetInline: "0",
    bottom: "0",
    zIndex: "raised",
    md: { display: "none" },
});

const fab = css({
    position: "fixed",
    zIndex: "raised",
    insetInlineEnd: "4",
    bottom: "calc(token(spacing.16) + token(spacing.4) + token(spacing.4))",
    md: { bottom: "4" },
});

// The snackbar stacks at its own layer, over the bars and FABs.
const snackbar = css({
    position: "fixed",
    insetInline: "4",
    marginInline: "auto",
    width: "fit-content",
    bottom: "calc(token(spacing.16) + token(spacing.4) + token(spacing.4))",
    md: { bottom: "4" },
});

declare module "@tanstack/solid-router" {
    interface StaticDataRouteOption {
        /** The page's title, which an app's top app bar shows. */
        title?: string;
    }
}

function BudgetLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const matches = useMatches();

    const current = () =>
        DESTINATIONS.find(
            (destination) =>
                destination.href !== "/budget" &&
                location().pathname.startsWith(destination.href),
        )?.value ?? "overview";
    const title = () =>
        matches().findLast((match) => match.staticData?.title)?.staticData
            .title ?? "Budget";

    // The transaction dialog: open while there's a draft, and the transaction it edits.
    const [editing, setEditing] = createSignal<{
        draft: Draft;
        original?: Transaction;
    }>();

    // The snackbar: the latest message, and its undo.
    const [message, setMessage] = createSignal<{
        text: string;
        undo?: (() => void) | undefined;
    }>();
    const [open, setOpen] = createSignal(false);
    const notify = (text: string, undo?: () => void) => {
        setMessage({ text, undo });
        setOpen(true);
    };

    // Mutations live here rather than in the dialog, so their outcome is reported after the
    // dialog closes. The arrows keep useMutation's context argument out of the RPC.
    const save = useMutation(() => ({
        mutationFn: (input: TransactionInput) => saveTransaction(input),
        onSuccess: (_: unknown, input: TransactionInput) =>
            notify(input.id ? "Transaction saved" : "Transaction added"),
    }));
    const remove = useMutation(() => ({
        mutationFn: (transaction: Transaction) =>
            deleteTransaction(transaction.id),
        onSuccess: (_: unknown, transaction: Transaction) =>
            notify("Transaction deleted", () => save.mutate(transaction)),
    }));
    const reset = useMutation(() => ({
        mutationFn: () => resetBudget(),
        onSuccess: () => notify("Demo data restored"),
    }));
    const [confirmReset, setConfirmReset] = createSignal(false);

    const actions: BudgetActions = {
        addTransaction: (defaults) => setEditing({ draft: { ...defaults } }),
        editTransaction: (transaction) =>
            setEditing({ draft: { ...transaction }, original: transaction }),
        save: (input) => save.mutate(input),
        remove: (transaction) => remove.mutate(transaction),
        notify,
    };

    return (
        <BudgetActionsContext value={actions}>
            <div class={frame}>
                <NavigationRail
                    aria-label="Budget"
                    class={{ root: rail }}
                    value={current()}
                    items={DESTINATIONS.map((d) => ({
                        value: d.value,
                        label: d.label,
                        icon: <Glyph name={d.icon} />,
                        href: d.href,
                    }))}
                />
                <div class={column}>
                    <TopAppBar
                        title={title()}
                        leading={
                            <IconButton
                                icon={<Glyph name="arrowBack" />}
                                mirrorIcon
                                aria-label="All apps"
                                onClick={() => void navigate({ to: "/" })}
                            />
                        }
                        actions={
                            <IconButton
                                icon={<Glyph name="restart" />}
                                aria-label="Restore the demo data"
                                onClick={() => setConfirmReset(true)}
                            />
                        }
                    />
                    <main class={content}>
                        <Outlet />
                    </main>
                </div>
                <NavigationBar
                    aria-label="Budget"
                    class={{ root: bar }}
                    value={current()}
                    data-bottom-bar
                    items={DESTINATIONS.map((d) => ({
                        value: d.value,
                        label: d.label,
                        icon: <Glyph name={d.icon} />,
                        href: d.href,
                    }))}
                />
                <Fab
                    class={{ root: fab }}
                    icon={<Glyph name="add" />}
                    aria-label="Add a transaction"
                    onClick={() => actions.addTransaction()}
                    data-app-fab
                />
                <TransactionDialog
                    draft={editing()?.draft}
                    original={editing()?.original}
                    onClose={() => setEditing(undefined)}
                />
                <Dialog.Root
                    open={confirmReset()}
                    onOpenChange={(details) => setConfirmReset(details.open)}
                    role="alertdialog"
                    icon
                >
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.Icon>
                                <Glyph name="restart" />
                            </Dialog.Icon>
                            <Dialog.Headline>
                                Restore the demo data?
                            </Dialog.Headline>
                            <Dialog.Body>
                                Every change made to transactions and budgets is
                                replaced with the original six months.
                            </Dialog.Body>
                            <Dialog.Actions>
                                <Button
                                    variant="text"
                                    label="Cancel"
                                    onClick={() => setConfirmReset(false)}
                                />
                                <Button
                                    variant="text"
                                    label="Restore"
                                    onClick={() => {
                                        // `mutate` handles its promise's rejection itself: the mutation's state holds the error.
                                        void reset.mutate();
                                        setConfirmReset(false);
                                    }}
                                />
                            </Dialog.Actions>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Dialog.Root>
                <Snackbar
                    class={{ root: snackbar }}
                    open={open()}
                    onOpenChange={(details) => setOpen(details.open)}
                    supportingText={message()?.text}
                    action={message()?.undo ? "Undo" : undefined}
                    onAction={() => message()?.undo?.()}
                    closeLabel="Dismiss"
                />
            </div>
        </BudgetActionsContext>
    );
}
