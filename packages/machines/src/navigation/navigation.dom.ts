import type { Scope } from "@zag-js/core";

export const getRootId = (scope: Scope): string =>
    scope.ids?.root ?? `navigation:${scope.id}`;
export const getItemId = (scope: Scope, value: string): string =>
    (scope.ids?.item as ((value: string) => string) | undefined)?.(value) ??
    `navigation:${scope.id}:item:${value}`;
