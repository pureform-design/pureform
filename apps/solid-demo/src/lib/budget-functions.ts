// The budget app's server functions. Reads are GETs, so they never ask for a single flight;
// mutations name the `budget` queries (`reload({ revalidate: "budget" })`), so the collection
// (src/server-config.ts) reruns the page's budget loaders and ships the fresh data on the
// mutation's own response, with no refetch on the client.
import { reload } from "@solidjs/web";
import { GET } from "@solidjs/web/server-functions";

import {
    deleteTransaction as remove,
    listCategories,
    listTransactions,
    overview,
    resetStore,
    saveTransaction as save,
    setBudget,
} from "../server/budget-db";
import type { TransactionInput } from "./budget";

export const getOverview = GET(async () => {
    "use server";
    return overview();
});

export const getCategories = GET(async () => {
    "use server";
    return listCategories();
});

export const getTransactions = GET(async () => {
    "use server";
    return listTransactions();
});

export async function saveTransaction(input: TransactionInput) {
    "use server";
    save(input);
    return reload({ revalidate: "budget" });
}

export async function deleteTransaction(id: string) {
    "use server";
    remove(id);
    return reload({ revalidate: "budget" });
}

export async function setCategoryBudget(input: {
    categoryId: string;
    budget: number;
}) {
    "use server";
    setBudget(input.categoryId, input.budget);
    return reload({ revalidate: "budget" });
}

export async function resetBudget() {
    "use server";
    resetStore();
    return reload({ revalidate: "budget" });
}
