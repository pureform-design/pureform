// Zag's rating group, re-exported so bindings take every machine from one package, with
// pureform's form rules on its machine: the browser's fieldset rule around the hidden input, and
// no reset of its own (the bindings own it; Zag's would reset during the `reset` event). Its
// anatomy has the preset's parts: each item draws the empty `icon`, and the `fill` and `halfFill`
// stars the binding lays over it (drawn only).

import {
    machine as zagMachine,
    anatomy as zagAnatomy,
    type Machine,
} from "@zag-js/rating-group";

import { withFieldsetRule, zagElement } from "./zag-form";

export * from "@zag-js/rating-group";

export const anatomy = zagAnatomy.extendWith("icon", "fill", "halfFill");
export const parts = anatomy.build();

/** Zag's rating group machine, with pureform's fieldset rule and no reset of its own. */
export const machine: Machine = withFieldsetRule(
    zagMachine,
    zagElement("hiddenInput", (id) => `rating:${id}:input`),
);
