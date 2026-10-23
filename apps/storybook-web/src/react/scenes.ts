import { GridList as ReactGridList } from "@pureform/react/grid-list";
import { createToaster, Toaster } from "@pureform/react/toast";

import { gridListScene, toastScene } from "./scene-builders";

export const Toast = toastScene({ createToaster, Toaster });
export const GridList = gridListScene(ReactGridList as never);
