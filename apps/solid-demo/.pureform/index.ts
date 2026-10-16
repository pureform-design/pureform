// Hand-written in the shape `pureform generate` will write (p4b-panda replaces it): the
// registry the app hands to `PureformProvider`, with every entry static so the first render
// needs no await.

import { createRegistry } from "@pureform/styling";

import { button } from "./web/button";
import { checkbox } from "./web/checkbox";

export const registry = createRegistry({ button, checkbox });

export const themes = ["teal", "sharp", "dense"] as const;

export type Components = "button" | "checkbox";
