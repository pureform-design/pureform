/** @jsxImportSource react */
// Renders a scene to HTML on the server, through React DOM's server build. Loaded in Node by the
// `renderOnServer` command.

import { isRuntimeTheme, preloadTheme } from "@pureform/styling-web";
import { renderToString } from "react-dom/server";

import type { Scene } from "../../harness/scene";
import type { ServerRender } from "../../harness/server";
import { sceneTheme } from "../../harness/themes";
import { SceneView } from "./scene";

// Hoisted elements React puts ahead of a render without a document (`<style precedence>`); in a
// full document they'd be in `<head>`.
const HOISTED = /^(?:<style[^>]*data-precedence[^>]*>[\s\S]*?<\/style>)+/;

export const render = async (scene: Scene): Promise<ServerRender> => {
    // A runtime theme renders on the server once its generator is loaded, as an app's request
    // handler would load it.
    const theme = sceneTheme(scene.provider);
    if (isRuntimeTheme(theme)) await preloadTheme(theme);
    const markup = renderToString(
        <SceneView scene={scene} props={scene.props ?? {}} />,
    );
    const head = HOISTED.exec(markup)?.[0] ?? "";
    return { html: markup.slice(head.length), head };
};
