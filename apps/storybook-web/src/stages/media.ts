// Media fills its container's width, so on its own it takes the canvas's whole width (a portrait
// picture then runs far past the screen). Its stories put it in a card-wide frame, the way
// Material shows media inside a card.

import { frame } from "./stage";

export const decorators = [frame({ width: "320px" })];
