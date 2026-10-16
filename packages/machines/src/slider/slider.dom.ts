import type { Scope } from "@zag-js/core";

export const getRootId = (scope: Scope): string =>
    scope.ids?.root ?? `slider:${scope.id}`;
export const getInputId = (scope: Scope): string =>
    scope.ids?.input ?? `slider:${scope.id}:input`;
