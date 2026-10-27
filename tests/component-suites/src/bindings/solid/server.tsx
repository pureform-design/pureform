// Renders a scene to HTML on the server, through Solid's server build. Loaded in Node by the
// `renderOnServer` command.

import { isRuntimeTheme, preloadTheme } from "@pureform/styling-web";
import { generateHydrationScript, renderToString } from "@solidjs/web";

import type { Scene } from "../../harness/scene";
import type { ServerRender } from "../../harness/server";
import { sceneTheme } from "../../harness/themes";
import { SceneView } from "./scene";

export const render = async (scene: Scene): Promise<ServerRender> => {
    // A runtime theme renders on the server once its generator is loaded, as an app's request
    // handler would load it.
    const theme = sceneTheme(scene.provider);
    if (isRuntimeTheme(theme)) await preloadTheme(theme);
    let tags = "";
    const html = renderToString(
        () => <SceneView scene={scene} props={() => scene.props ?? {}} />,
        // With no `</head>` in the markup, Solid hands over what `useHead` collected.
        { onHead: (head) => (tags = head) },
    );
    return {
        html,
        // Each test hydrates a new render in the same page, so the previous one's hydration
        // state goes first.
        head: `${tags}<script>delete window._$HY</script>${generateHydrationScript()}`,
    };
};
