// What every budget page can ask of the app's layout: open the transaction dialog, change
// transactions, and show a snackbar. The layout (src/routes/budget.tsx) owns all of them, so
// they outlive the page or dialog that asked.

import { createContext, useContext } from "solid-js";

import type { Transaction, TransactionInput } from "../lib/budget";

export interface BudgetActions {
    /** Opens the dialog for a new transaction, with some fields filled in. */
    addTransaction(defaults?: Partial<TransactionInput>): void;
    /** Opens the dialog for an existing transaction. */
    editTransaction(transaction: Transaction): void;
    /** Stores a transaction, new or changed, and says so. */
    save(input: TransactionInput): void;
    /** Deletes a transaction, and offers to undo it. */
    remove(transaction: Transaction): void;
    /** Shows a snackbar, with an undo action when given one. */
    notify(message: string, undo?: () => void): void;
}

export const BudgetActionsContext = createContext<BudgetActions>();

export function useBudgetActions(): BudgetActions {
    const actions = useContext(BudgetActionsContext);
    if (!actions) throw new Error("A budget page renders inside /budget");
    return actions;
}
