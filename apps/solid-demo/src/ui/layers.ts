// How the page stacks: app bars, navigation bars, FABs, and snackbars sit at 1, over the content;
// a dialog's scrim and surface at 2, over all of them.

import { css } from "$css";

export const overlay = css({ zIndex: 2 });
