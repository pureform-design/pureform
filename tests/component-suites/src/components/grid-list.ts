// The grid list: tiles in columns with a gutter, each a picture with an optional header and footer
// over it. It's a layout: nothing in it takes focus, so Tab passes over it, and it has no state,
// form or indication. The direction suite checks the tiles mirror in `rtl`.

import { testIds } from "@pureform/anatomy";

import type { ComponentCase } from "./types";

/** A 4 by 3 picture, so each tile has an image before and without loading anything. */
const PICTURE = `data:image/svg+xml,${encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='40' height='30'><rect width='40' height='30' fill='teal'/></svg>",
)}`;

const TILES = [
    { src: PICTURE, header: "Hills at dusk" },
    { src: PICTURE, footer: "Sunrise", subhead: "Photo by Ana" },
    { src: PICTURE },
    { src: PICTURE, header: "Harbour", footer: "Evening" },
    { src: PICTURE },
];

export const gridList: ComponentCase = {
    component: "GridList",
    props: { "aria-label": "Photos", tiles: TILES },
    root: testIds.gridList.root,
    examples: {
        "three columns": {},
        "two columns, landscape": { columns: "2", aspect: "landscape" },
        "four columns, no gutter": { columns: "4", gutter: "none" },
        "one column, wide, large gutter": {
            columns: "1",
            aspect: "wide",
            gutter: "large",
        },
        "portrait, small gutter": { aspect: "portrait", gutter: "small" },
        tokens: { tokens: { columns: 5, gutter: 12 } },
    },
};
