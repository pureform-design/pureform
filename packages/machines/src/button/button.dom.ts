import type { Scope } from "@zag-js/core";

export const getRootId = (scope: Scope): string =>
    scope.ids?.root ?? `button:${scope.id}`;
export const getLabelId = (scope: Scope): string =>
    scope.ids?.label ?? `button:${scope.id}:label`;

export const getRootEl = (scope: Scope) =>
    scope.getById<HTMLButtonElement>(getRootId(scope));
