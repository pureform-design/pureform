// The grid list: Root, a wrapping row of Tiles; each Tile holds a Content with a Media and optionally a Header and
// a Footer laid over it, whose text is a Headline and a Subhead. It has no state: columns, gutter
// and aspect set the preset's tokens, which the tiles read.

import { gridListAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { gridListSelection } from "@pureform/binding-core";
import type {
  GridListPart,
  GridListVariantProps,
} from "@pureform/binding-core";
import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { Image } from "react-native";
import type { ImageStyle } from "react-native";

import { testIdOf, withEngine } from "../parts";
import { nativeSlots } from "../slot-props";
import type { PartSlots } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";
import type { ComponentSlots } from "../styles";
import { resolveText } from "../resolve-text";
import { ownText } from "../icon-style";

/** What Root shares with its parts. */
interface GridListContextValue {
  readonly slots: ComponentSlots<GridListPart>;
  readonly testId: TestIdOverride<GridListPart> | undefined;
  readonly slot: PartSlots;
}

const GridListContext = createContext<GridListContextValue | undefined>(
  undefined,
);

const useGridList = (part: string): GridListContextValue => {
  const list = useContext(GridListContext);
  if (!list) throw new Error(`GridList.${part} must be inside GridList.Root`);
  return list;
};

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface GridListRootHosts {
  readonly root: "View";
  readonly tile: "View";
  readonly content: "View";
  readonly header: "View";
  readonly footer: "View";
  readonly headline: "Text";
  readonly subhead: "Text";
  readonly media: "Image";
}

export interface GridListRootProps
  extends GridListVariantProps, NativeSlotProps<GridListRootHosts> {
  readonly children?: ReactNode;
  /** Name for assistive technology. */
  readonly "aria-label"?: string | undefined;
  readonly testId?: TestIdOverride<GridListPart> | undefined;
}

/** The grid list's root: a wrapping row of tiles, a list for assistive technology. */
function Root(props: GridListRootProps): ReactNode {
  const slot = nativeSlots(props);
  const slots = useComponentSlots<GridListPart>(
    "gridList",
    gridListSelection(props),
  );
  const { styles: s, views: v } = slots;
  return (
    <GridListContext value={{ slots, testId: props.testId, slot }}>
      <v.root.View
        {...slot.props("root")}
        role="list"
        {...(props["aria-label"] === undefined
          ? {}
          : { "aria-label": props["aria-label"] })}
        style={slot.style("root", s.root)}
        testID={testIdOf(gridListAnatomy, "root", props.testId)}
      >
        {props.children}
      </v.root.View>
    </GridListContext>
  );
}

/** A part's props. */
export interface GridListPartProps {
  readonly children?: ReactNode;
}

// A view part: a tile, or a caption band.
const viewPart = (name: GridListPart, label: string, role?: "listitem") =>
  function GridListViewPart(props: GridListPartProps): ReactNode {
    const list = useGridList(label);
    const slot = list.slot;
    const { styles: s, views: v } = list.slots;
    const Slot = v[name];
    return (
      <Slot.View
        {...slot.props(name)}
        {...(role ? { role } : {})}
        style={slot.style(name, s[name])}
        testID={testIdOf(gridListAnatomy, name, list.testId)}
      >
        {resolveText(props.children, Slot, ownText(s[name]))}
      </Slot.View>
    );
  };

// A text part: a headline or a subhead.
const textPart = (name: GridListPart, label: string) =>
  function GridListTextPart(props: GridListPartProps): ReactNode {
    const list = useGridList(label);
    const slot = list.slot;
    const { styles: s, views: v } = list.slots;
    const Slot = v[name];
    return (
      <Slot.Text
        {...slot.props(name)}
        selectable={false}
        style={slot.style(name, s[name])}
        testID={testIdOf(gridListAnatomy, name, list.testId)}
      >
        {props.children}
      </Slot.Text>
    );
  };

/** One tile, a list item: a grid cell, a share of the row's width with the gutter as padding.
 *  Put a `Content` in it. */
const Tile = viewPart("tile", "Tile", "listitem");
/** What you see of a tile: its rounded, clipped surface at the grid's aspect, inside the tile's
 *  gutter. Holds the media, header and footer. */
const Content = viewPart("content", "Content");
/** A band along the tile's top edge, over the picture. */
const Header = viewPart("header", "Header");
/** A band along the tile's bottom edge, over the picture. */
const Footer = viewPart("footer", "Footer");
/** The first line of a header or footer. */
const Headline = textPart("headline", "Headline");
/** A smaller line under the headline. */
const Subhead = textPart("subhead", "Subhead");

export interface GridListMediaProps {
  /** The picture. */
  readonly source: { readonly uri: string };
  /** What it shows, for assistive technology; empty when decorative. */
  readonly alt?: string | undefined;
}

/** The tile's picture: fills the tile and crops to cover. */
function Media(props: GridListMediaProps): ReactNode {
  const list = useGridList("Media");
  const slot = list.slot;
  const { objectFit, ...style } = list.slots.styles.media as ImageStyle & {
    objectFit?: string;
  };
  return (
    <Image
      {...slot.props("media")}
      accessibilityLabel={props.alt ?? ""}
      resizeMode={objectFit === "contain" ? "contain" : "cover"}
      source={props.source}
      style={slot.style("media", style)}
      testID={testIdOf(gridListAnatomy, "media", list.testId)}
    />
  );
}

/** Material's grid list, composed: `GridList` is Root, around `GridList.Tile`s each holding a
 *  `Content` with a `Media`, and optionally a `Header` and a `Footer` with a `Headline` and a `Subhead`. */
export const GridList = Object.assign(withEngine(Root, "GridList"), {
  Root: withEngine(Root, "GridList.Root"),
  Tile,
  Content,
  Media,
  Header,
  Footer,
  Headline,
  Subhead,
});
