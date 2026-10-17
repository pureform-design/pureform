// Zag's select, re-exported so bindings take every machine from one package, with pureform's form
// rules on its machine: the browser's fieldset rule around the hidden native select, and no reset
// of its own (the bindings own it; Zag's would put back the value at creation).

import { machine as zagMachine } from "@zag-js/select";

import { withFieldsetRule, zagElement } from "./zag-form";

export * from "@zag-js/select";

/** Zag's select machine, with pureform's fieldset rule and no reset of its own. */
export const machine: typeof zagMachine = withFieldsetRule(
    zagMachine,
    zagElement("hiddenSelect", (id) => `select:${id}:select`),
);
