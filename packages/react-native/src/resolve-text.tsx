import type { ReactNode } from "react";
import type { StyleProp, TextStyle } from "react-native";

import type { SlotViews } from "./styles";

const isText = (node: unknown): node is string | number =>
  typeof node === "string" || typeof node === "number";

/** Wraps the strings and numbers of `node` in the slot's Text, as a View can't hold them on
 *  native; anything else comes back as is. */
export const resolveText = (
  node: ReactNode,
  views: SlotViews,
  style?: StyleProp<TextStyle>,
): ReactNode => {
  if (isText(node)) return <views.Text style={style}>{node}</views.Text>;
  if (!Array.isArray(node)) return node;
  return node.map((item: ReactNode, i) =>
    isText(item) ? (
      <views.Text key={i} style={style}>
        {item}
      </views.Text>
    ) : (
      resolveText(item, views, style)
    ),
  );
};
