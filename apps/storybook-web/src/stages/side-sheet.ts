// A coplanar side sheet shares the page's layout rather than overlaying it: it sits in a row
// beside the page's content and is as tall as the row. Its story puts it in one; the other
// stories need no page around them.

import type { Decorator } from "@storybook/html-vite";

import { text } from "./stage";

export const decorators: Decorator[] = [
    (story, context) => {
        const el = story() as HTMLElement;
        if (context.args["coplanar"] !== true) return el;
        const row = document.createElement("div");
        Object.assign(row.style, {
            display: "flex",
            flexDirection: "row",
            alignItems: "stretch",
            minHeight: "480px",
            gap: "16px",
        });
        const page = document.createElement("div");
        page.style.flex = "1";
        page.append(
            text("h3", "Page content", { fontSize: "20px" }),
            text(
                "p",
                "The sheet shares this row: the content beside it gives up the width the sheet takes.",
                { marginTop: "8px" },
            ),
        );
        row.append(page, el);
        return row;
    },
];
