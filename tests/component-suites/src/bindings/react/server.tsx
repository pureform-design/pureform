/** @jsxImportSource react */
// Renders a scene to HTML on the server, through React DOM's server build. Loaded in Node by the
// `renderOnServer` command.

import { renderToString } from "react-dom/server";

import type { Scene } from "../../harness/scene";
import type { ServerRender } from "../../harness/server";
import { SceneView } from "./scene";

export const render = (scene: Scene): ServerRender => ({
    html: renderToString(<SceneView scene={scene} props={scene.props ?? {}} />),
    head: "",
});
