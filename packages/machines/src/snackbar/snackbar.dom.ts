import type { Scope } from "@zag-js/core";

export const getRootId = (scope: Scope): string =>
    scope.ids?.root ?? `snackbar:${scope.id}`;
export const getSupportingTextId = (scope: Scope): string =>
    scope.ids?.supportingText ?? `snackbar:${scope.id}:supporting-text`;
export const getActionId = (scope: Scope): string =>
    scope.ids?.action ?? `snackbar:${scope.id}:action`;
export const getCloseId = (scope: Scope): string =>
    scope.ids?.close ?? `snackbar:${scope.id}:close`;
