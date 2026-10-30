import { compilePreset } from "@pureform/panda-adapter";
import { expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { radioGroup } from "./radio-group";

it("styles radio group orientation through a preset variant", () => {
    const recipe = compilePreset(configWith(radioGroup)).theme?.slotRecipes
        ?.radioGroup;
    expect(recipe).toMatchObject({
        base: { root: { display: "flex", alignItems: "start" } },
        variants: {
            orientation: {
                vertical: { root: { flexDirection: "column" } },
                horizontal: {
                    root: { flexDirection: "row", flexWrap: "wrap" },
                },
            },
        },
        defaultVariants: { orientation: "vertical" },
    });
});
