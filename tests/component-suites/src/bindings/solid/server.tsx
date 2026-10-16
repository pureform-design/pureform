// Renders a scene to HTML on the server, through Solid's server build. Loaded in Node by the
// `renderOnServer` command.

import { generateHydrationScript, renderToString } from "@solidjs/web";

import type { Scene } from "../../harness/scene";
import type { ServerRender } from "../../harness/server";
import { SceneView } from "./scene";

export const render = (scene: Scene): ServerRender => ({
    html: renderToString(() => (
        <SceneView scene={scene} props={() => scene.props ?? {}} />
    )),
    // Each test hydrates a new render in the same page, so the previous one's hydration state
    // goes first.
    head: `<script>delete window._$HY</script>${generateHydrationScript()}`,
});
