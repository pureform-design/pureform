// The root layout every app renders inside: the settings as providers over the whole page, the
// page's surface, and the floating settings button. The settings come from the `settings` query
// (the cookie, read on the server), so the server renders the page as it will hydrate.

import { css } from "$css";
import { PureformProvider } from "@pureform/solid";
import type { JSX } from "@solidjs/web";
import { createEffect, createMemo } from "solid-js";

import { registry } from "../../.pureform";
import { useClientLinks } from "../ui/links";
import { useSettings } from "./settings";
import { SettingsPanel } from "./settings-panel";
import {
    colorTheme,
    densityTheme,
    fontOverrides,
    indication,
    shapeTheme,
} from "./theme";

// The page's own surface, inside the providers, so a runtime theme paints it too.
const surface = css({
    minHeight: "100dvh",
    backgroundColor: "canvas",
    color: "onCanvas",
    fontFamily: "plain",
});

export function Shell(props: { children: JSX.Element }): JSX.Element {
    const { settings } = useSettings();
    const color = createMemo(() =>
        colorTheme({
            color: settings().color,
            customSeed: settings().customSeed,
        }),
    );
    const onClick = useClientLinks();

    // The color scheme and direction live on <html>, where the stylesheet's scheme rules and the
    // browser read them; the server renders them there from the cookie (src/Document.tsx).
    createEffect(
        () => [settings().scheme, settings().dir] as const,
        ([scheme, dir]) => {
            const root = document.documentElement;
            root.classList.toggle("dark", scheme === "dark");
            root.classList.toggle("light", scheme === "light");
            root.dir = dir;
        },
    );

    // One provider per domain, since a provider takes one theme: the shape and density themes
    // nest around the color theme. The outer one also carries direction, motion, indication,
    // and the font overrides.
    return (
        <PureformProvider
            registry={registry}
            dir={settings().dir}
            motion={settings().motion}
            indication={indication(settings())}
            theme={shapeTheme(settings())}
            overrides={fontOverrides(settings())}
        >
            <PureformProvider theme={densityTheme(settings())}>
                <PureformProvider theme={color()}>
                    <div class={surface} onClick={onClick}>
                        {props.children}
                        <SettingsPanel />
                    </div>
                </PureformProvider>
            </PureformProvider>
        </PureformProvider>
    );
}
