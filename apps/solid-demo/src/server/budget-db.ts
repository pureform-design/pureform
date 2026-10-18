// The budget app's store, as a server-only module: importing it from code that could reach the
// client bundle fails the build. It lives in memory, seeded with six months of believable
// transactions ending today, and resets when the server restarts or `resetBudget` runs. Swap it
// for a database client; this file is the only place that knows.
import "server-only";
import type {
    BudgetOverview,
    Category,
    CategorySummary,
    MonthTotals,
    Transaction,
    TransactionInput,
} from "../lib/budget";

const CATEGORIES: readonly Category[] = [
    {
        id: "housing",
        name: "Housing",
        icon: "home",
        color: "primary",
        kind: "expense",
        budget: 150_000,
    },
    {
        id: "groceries",
        name: "Groceries",
        icon: "cart",
        color: "success",
        kind: "expense",
        budget: 45_000,
    },
    {
        id: "dining",
        name: "Dining out",
        icon: "restaurant",
        color: "warning",
        kind: "expense",
        budget: 22_000,
    },
    {
        id: "transport",
        name: "Transport",
        icon: "car",
        color: "info",
        kind: "expense",
        budget: 16_000,
    },
    {
        id: "utilities",
        name: "Utilities",
        icon: "bolt",
        color: "tertiary",
        kind: "expense",
        budget: 18_000,
    },
    {
        id: "fun",
        name: "Entertainment",
        icon: "movie",
        color: "secondary",
        kind: "expense",
        budget: 9_000,
    },
    {
        id: "health",
        name: "Health",
        icon: "heart",
        color: "error",
        kind: "expense",
        budget: 12_000,
    },
    {
        id: "salary",
        name: "Salary",
        icon: "money",
        color: "success",
        kind: "income",
        budget: 0,
    },
    {
        id: "freelance",
        name: "Freelance",
        icon: "trendingUp",
        color: "tertiary",
        kind: "income",
        budget: 0,
    },
];

/** What a month brings, as `[category, description, low, high, times]`: amounts in dollars, picked
 *  between `low` and `high`, `times` a month. */
const PATTERN: readonly (readonly [string, string, number, number, number])[] =
    [
        ["housing", "Rent", 1450, 1450, 1],
        ["groceries", "Green Market", 38, 96, 3],
        ["groceries", "Corner grocery", 12, 34, 2],
        ["dining", "Noodle bar", 14, 32, 2],
        ["dining", "Café Lumen", 5, 12, 2],
        ["transport", "Transit pass top-up", 40, 40, 1],
        ["transport", "Ride share", 11, 26, 2],
        ["utilities", "City power & water", 92, 128, 1],
        ["utilities", "Fiber internet", 55, 55, 1],
        ["fun", "Streaming bundle", 18, 18, 1],
        ["fun", "Cinema tickets", 24, 36, 1],
        ["health", "Pharmacy", 9, 42, 1],
        ["health", "Climbing gym", 65, 65, 1],
        ["salary", "Paycheck", 2350, 2350, 2],
        ["freelance", "Design invoice", 280, 640, 1],
    ];

const OPENING_BALANCE = 3_850_00;

// A small seeded generator, so every start draws the same history.
const random = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const pad = (n: number) => String(n).padStart(2, "0");

const today = () => new Date().toISOString().slice(0, 10);

/** `YYYY-MM`, `offset` months from `month`. */
const shiftMonth = (month: string, offset: number) => {
    const [year, m] = month.split("-").map(Number) as [number, number];
    const date = new Date(Date.UTC(year, m - 1 + offset, 1));
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
};

const daysIn = (month: string) => {
    const [year, m] = month.split("-").map(Number) as [number, number];
    return new Date(Date.UTC(year, m, 0)).getUTCDate();
};

function seed(): { categories: Category[]; transactions: Transaction[] } {
    const next = random(20261018);
    const now = today();
    const current = now.slice(0, 7);
    const transactions: Transaction[] = [];
    for (let offset = -5; offset <= 0; offset++) {
        const month = shiftMonth(current, offset);
        const last = offset === 0 ? Number(now.slice(8)) : daysIn(month);
        for (const [categoryId, description, low, high, times] of PATTERN) {
            for (let i = 0; i < times; i++) {
                // Spread repeated entries over the month; the first lands early.
                const dayOfMonth =
                    times === 1 && (categoryId === "housing" || low === high)
                        ? 1 + Math.floor(next() * 3)
                        : 1 + Math.floor(((i + next()) / times) * 27);
                if (dayOfMonth > last) continue;
                const dollars = low + (high - low) * next();
                transactions.push({
                    id: "",
                    date: `${month}-${pad(dayOfMonth)}`,
                    description,
                    amount: Math.round(dollars * 100),
                    categoryId,
                    note: "",
                });
            }
        }
    }
    transactions.sort((a, b) => b.date.localeCompare(a.date));
    return {
        categories: [...CATEGORIES],
        transactions: transactions.map((t, i) => ({ ...t, id: `t${i + 1}` })),
    };
}

let store = seed();
let nextId = store.transactions.length + 1;

const kindOf = (categoryId: string) =>
    store.categories.find((category) => category.id === categoryId)?.kind;

const totals = (month: string): MonthTotals => {
    let income = 0;
    let spent = 0;
    for (const t of store.transactions) {
        if (!t.date.startsWith(month)) continue;
        if (kindOf(t.categoryId) === "income") income += t.amount;
        else spent += t.amount;
    }
    return { month, income, spent };
};

export function listTransactions(): Transaction[] {
    return store.transactions;
}

export function listCategories(): CategorySummary[] {
    const month = today().slice(0, 7);
    return store.categories.map((category) => {
        let total = 0;
        let count = 0;
        for (const t of store.transactions) {
            if (t.categoryId !== category.id || !t.date.startsWith(month))
                continue;
            total += t.amount;
            count++;
        }
        return { ...category, total, count };
    });
}

export function overview(): BudgetOverview {
    const month = today().slice(0, 7);
    const history = [-5, -4, -3, -2, -1, 0].map((offset) =>
        totals(shiftMonth(month, offset)),
    );
    const balance = store.transactions.reduce(
        (sum, t) =>
            sum + (kindOf(t.categoryId) === "income" ? t.amount : -t.amount),
        OPENING_BALANCE,
    );
    const current = history.at(-1)!;
    return {
        month,
        balance,
        income: current.income,
        spent: current.spent,
        budgeted: store.categories.reduce((sum, c) => sum + c.budget, 0),
        history,
    };
}

export function saveTransaction(input: TransactionInput): Transaction {
    if (!kindOf(input.categoryId)) throw new Error("No such category");
    const transaction: Transaction = {
        id: input.id ?? `t${nextId++}`,
        date: input.date,
        description: input.description.trim() || "Untitled",
        amount: Math.max(1, Math.round(input.amount)),
        categoryId: input.categoryId,
        note: input.note.trim(),
    };
    store.transactions = [
        transaction,
        ...store.transactions.filter((t) => t.id !== transaction.id),
    ].sort((a, b) => b.date.localeCompare(a.date));
    return transaction;
}

export function deleteTransaction(id: string): Transaction | undefined {
    const removed = store.transactions.find((t) => t.id === id);
    store.transactions = store.transactions.filter((t) => t.id !== id);
    return removed;
}

export function setBudget(categoryId: string, budget: number) {
    store.categories = store.categories.map((category) =>
        category.id === categoryId
            ? { ...category, budget: Math.max(0, Math.round(budget)) }
            : category,
    );
}

export function resetStore() {
    store = seed();
    nextId = store.transactions.length + 1;
}
