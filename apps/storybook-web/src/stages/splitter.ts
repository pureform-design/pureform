// The splitter fills its parent, and a stacked one has no height of its own to divide, so its
// stories put it in a frame with room both ways.

import { frame } from "./stage";

export const decorators = [frame({ width: "100%", height: "240px" })];
