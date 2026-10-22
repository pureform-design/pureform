import { describe, expect, it } from "vitest";

import { registryDeclarations } from "./registry-index";

describe("registryDeclarations", () => {
    it("declares a component's spring tokens and the theme's spring roles", () => {
        const text = registryDeclarations(
            [
                {
                    name: "tabs",
                    path: "web/tabs.ts",
                    exportName: "tabs",
                    lazy: false,
                    shape: {
                        variants: {},
                        defaults: {},
                        slots: ["root"],
                        tokens: ["accent", "indicatorSpring"],
                        springs: ["indicatorSpring"],
                    },
                },
            ],
            ["spatialFast", "spatialSlow"],
        );
        expect(text).toContain(
            '            tokens: "accent" | "indicatorSpring";\n            springs: "indicatorSpring";\n',
        );
        expect(text).toContain(
            "    interface SpringRoleRegistry {\n        spatialFast: true;\n        spatialSlow: true;\n    }\n",
        );
    });
});
