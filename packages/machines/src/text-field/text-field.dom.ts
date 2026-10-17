import type { Scope } from "@zag-js/core";

export const getRootId = (scope: Scope): string =>
    scope.ids?.root ?? `text-field:${scope.id}`;
export const getInputId = (scope: Scope): string =>
    scope.ids?.input ?? `text-field:${scope.id}:input`;
export const getLabelId = (scope: Scope): string =>
    scope.ids?.label ?? `text-field:${scope.id}:label`;
export const getSupportingTextId = (scope: Scope): string =>
    scope.ids?.supportingText ?? `text-field:${scope.id}:supporting-text`;

/** The native input or text area. */
export const getInputEl = (
    scope: Scope,
): HTMLInputElement | HTMLTextAreaElement | null =>
    scope.getById<HTMLInputElement | HTMLTextAreaElement>(getInputId(scope));
