// Accessibility with axe over every example of every component, with the demo's real styles (so
// color contrast counts), in both directions.

import axe from "axe-core";
import { describe, expect, it } from "vitest";

import { COMPONENTS } from "./components";
import { mountCase } from "./harness/page";

/** Each violation, one line per element: `rule: selector (summary)`. */
const violations = async (element: Element): Promise<string[]> => {
    const results = await axe.run(element, { resultTypes: ["violations"] });
    return results.violations.flatMap((violation) =>
        violation.nodes.map(
            (node) =>
                `${violation.id}: ${node.target.join(" ")} (${node.failureSummary ?? violation.help})`,
        ),
    );
};

describe.each(COMPONENTS)("$component", (component) => {
    describe.each(["ltr", "rtl"] as const)("%s", (dir) => {
        it.each(Object.entries(component.examples))(
            "%s has no axe violations",
            async (_, props) => {
                const { host } = mountCase(component, props, {
                    provider: { dir },
                });
                expect(await violations(host)).toEqual([]);
            },
        );
    });
});
