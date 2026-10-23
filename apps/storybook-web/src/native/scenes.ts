import { GridList as NativeGridList } from "@pureform/react-native/grid-list";
import { createToaster, Toaster } from "@pureform/react-native/toast";

import { gridListScene, toastScene } from "../react/scene-builders";

export const Toast = toastScene({ createToaster, Toaster });
export const GridList = gridListScene(NativeGridList as never);
