// The budget app's data model, shared by the server (which stores it, src/server/budget-db.ts) and
// the pages (which read it through src/lib/queries.ts), and the formatting both render with.
// Amounts are integer cents and dates `YYYY-MM-DD` strings, formatted in UTC, so the server's HTML
// and the client's hydration agree whatever their time zones.

import type { ColorGroup } from "../ui/color";
import type { IconName } from "../ui/icons";

export interface Category {
    readonly id: string;
    readonly name: string;
    readonly icon: IconName;
    readonly color: ColorGroup;
    /** Income categories hold money coming in; their transactions add to the balance. */
    readonly kind: "expense" | "income";
    /** The monthly budget, in cents; 0 for income. */
    readonly budget: number;
}

/** A category with what its transactions add up to this month, in cents. */
export interface CategorySummary extends Category {
    readonly total: number;
    readonly count: number;
}

export interface Transaction {
    readonly id: string;
    /** `YYYY-MM-DD`. */
    readonly date: string;
    readonly description: string;
    /** In cents, always positive; the category says which way it goes. */
    readonly amount: number;
    readonly categoryId: string;
    readonly note: string;
}

export type TransactionInput = Omit<Transaction, "id"> & {
    readonly id?: string;
};

export interface MonthTotals {
    /** `YYYY-MM`. */
    readonly month: string;
    readonly income: number;
    readonly spent: number;
}

export interface BudgetOverview {
    /** The current month, `YYYY-MM`. */
    readonly month: string;
    readonly balance: number;
    readonly income: number;
    readonly spent: number;
    /** The budgets of every expense category, added up. */
    readonly budgeted: number;
    /** The last six months, oldest first, the current one last. */
    readonly history: readonly MonthTotals[];
}

const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
});

const wholeMoney = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
});

/** Text isolated from the text around it, so an amount or a count keeps its order (a sign, a
 *  currency symbol) in a right-to-left page too. */
export const isolate = (text: string) => `\u2068${text}\u2069`;

/** `$1,234.50`, or `+$1,234.50` with `sign`. */
export const formatMoney = (cents: number, options: { sign?: boolean } = {}) =>
    isolate(
        `${options.sign && cents > 0 ? "+" : ""}${money.format(cents / 100)}`,
    );

/** `$1,235`: rounded to whole dollars, for charts and summaries. */
export const formatWholeMoney = (cents: number) =>
    isolate(wholeMoney.format(Math.round(cents / 100)));

const day = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
});

const monthName = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
});

const monthShort = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
});

const utc = (date: string) => new Date(`${date}T00:00:00Z`);

/** `Mon, Oct 12`. */
export const formatDay = (date: string) => day.format(utc(date));

/** `October 2026`, from `YYYY-MM`. */
export const formatMonth = (month: string) =>
    monthName.format(utc(`${month}-01`));

/** `Oct`, from `YYYY-MM`. */
export const formatMonthShort = (month: string) =>
    monthShort.format(utc(`${month}-01`));

/** Dollars typed in a field (`12.5`, `$1,200`) as cents, or `undefined`. */
export const parseAmount = (text: string): number | undefined => {
    const value = Number(text.replace(/[$,\s]/g, ""));
    return Number.isFinite(value) && value > 0
        ? Math.round(value * 100)
        : undefined;
};

/** Cents as the dollars a field shows: `12.50`. */
export const amountText = (cents: number) => (cents / 100).toFixed(2);

/** Signed cents: income adds, spending subtracts. */
export const signedAmount = (
    transaction: Transaction,
    categories: readonly Category[],
) =>
    categories.find((category) => category.id === transaction.categoryId)
        ?.kind === "income"
        ? transaction.amount
        : -transaction.amount;
