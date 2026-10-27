// The grid list: Root, a `role="list"` wrapping row, around its Tiles; each Tile holds a Content with a Media and
// optionally a Header and a Footer laid over it, whose text is a Headline and a Subhead. It has no
// machine and no state: columns, gutter and aspect set the preset's tokens, which the tiles read.

import { gridListAnatomy } from "@pureform/anatomy";
import {
    GRID_LIST_ROOT_PROPS,
    gridListRootProps,
    gridListSelection,
    gridListTileProps,
} from "@pureform/binding-core";
import type { GridListRootOwnProps } from "@pureform/binding-core";
import type { JSX, ValidComponent } from "@solidjs/web";
import { omit } from "solid-js";

import { createPartContext } from "../part-context";
import { useComponent, plainParts } from "../parts";
import type { ComponentScope } from "../parts";
import type { PartProps } from "../props";

type Anatomy = typeof gridListAnatomy;

/** What Root shares with its parts. */
interface GridListContextValue {
    readonly scope: ComponentScope<Anatomy>;
}

const context = createPartContext<GridListContextValue>("GridList");

/** Root's props: the variants and tokens, `testId` and `unstyled` for every part, `as`, and the
 *  element's own props. Name it with `aria-label` or `aria-labelledby`. */
export interface GridListRootProps
    extends Omit<PartProps, keyof GridListRootOwnProps>, GridListRootOwnProps {
    /** Another element or component to render instead of `<div>`: `"ul"`, with `"li"` tiles. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface GridListPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A tile's props: the part's, and `as` for another element or component. */
export interface GridListTileProps extends GridListPartProps {
    /** Another element or component to render instead of `<div>`: `"li"` inside a `"ul"` Root. */
    readonly as?: ValidComponent | undefined;
}

/** The picture's props: the part's, and the `<img>`'s own `src`, `alt` and `loading`. */
export interface GridListMediaProps extends GridListPartProps {
    readonly src?: string | undefined;
    /** What it shows, for assistive technology; empty when decorative. */
    readonly alt?: string | undefined;
    readonly loading?: "eager" | "lazy" | undefined;
}

/** The grid list's root: a wrapping row of tiles, with `role="list"`. */
function Root(props: GridListRootProps): JSX.Element {
    const scope = useComponent(gridListAnatomy, {
        selection: () => gridListSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    const rest = omit(props, "as", ...GRID_LIST_ROOT_PROPS);
    return (
        <context.Provider value={{ scope }}>
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                // A list element already has the role.
                machine: () =>
                    props.as === "ul" || props.as === "ol"
                        ? undefined
                        : gridListRootProps(),
                props: rest,
            })}
        </context.Provider>
    );
}

/** One tile, with `role="listitem"` (an `li` has it already): a grid cell, a share of the row's
 *  width with the gutter as padding. Put a `Content` in it. */
function Tile(props: GridListTileProps): JSX.Element {
    const { scope } = context.use("Tile");
    const rest = omit(props, "as", "unstyled");
    return scope.render("tile", {
        element: "div",
        as: () => props.as,
        machine: () => (props.as === "li" ? undefined : gridListTileProps()),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** The tile's picture, an `<img>` that fills it and crops to cover. Give it `alt`. */
function Media(props: GridListMediaProps): JSX.Element {
    const { scope } = context.use("Media");
    const rest = omit(props, "unstyled");
    return scope.render("media", {
        element: "img",
        unstyled: () => props.unstyled,
        props: rest,
    });
}

const part = plainParts(context.use, "div");

/** What you see of a tile: its rounded, clipped surface at the grid's aspect, inside the tile's
 *  gutter. Holds the media, header and footer. */
const Content = part("content", "Content");

/** A band along the tile's top edge, over the picture. */
const Header = part("header", "Header");
/** A band along the tile's bottom edge, over the picture. */
const Footer = part("footer", "Footer");
/** The first line of a header or footer. */
const Headline = part("headline", "Headline");
/** A smaller line under the headline. */
const Subhead = part("subhead", "Subhead");

/** Material's grid list, composed: `GridList` is Root, around `GridList.Tile`s each holding a
 *  `Content` with a `Media`, and optionally a `Header` and a `Footer` with a `Headline` and a `Subhead`.
 *  `columns`, `gutter` and `aspect` size the tiles. */
export const GridList = Object.assign(Root, {
    Root,
    Tile,
    Content,
    Media,
    Header,
    Footer,
    Headline,
    Subhead,
});
