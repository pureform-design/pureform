import type { Scope } from "@zag-js/core";

export const getLayerId = (scope: Scope): string =>
    scope.ids?.layer ?? `ripple:${scope.id}:layer`;

export const getLayerEl = (scope: Scope) => scope.getById(getLayerId(scope));
