// The settings as the app reads and changes them: the `settings` query (read from the cookie on
// the server, kept in the Query cache), and an update that applies at once and stores the result
// in the cookie.

import type { JSX } from "@solidjs/web";
import { useQuery, useQueryClient } from "@tanstack/solid-query";
import { type Accessor, createContext, useContext } from "solid-js";

import { settingsQuery } from "../lib/queries";
import { DEFAULT_SETTINGS, storeSettings, toSettings } from "../lib/settings";
import type { Settings } from "../lib/settings";

export interface SettingsState {
    readonly settings: Accessor<Settings>;
    /** Changes some settings: the page follows at once, and the cookie keeps them. */
    readonly update: (patch: Partial<Settings>) => void;
    /** Back to the defaults. */
    readonly reset: () => void;
}

const SettingsContext = createContext<SettingsState>();

export function SettingsProvider(props: { children: JSX.Element }) {
    const queryClient = useQueryClient();
    const query = useQuery(settingsQuery);
    const settings = () => query.data;
    const apply = (next: Settings) => {
        queryClient.setQueryData(settingsQuery().queryKey, next);
        storeSettings(next);
    };
    const state: SettingsState = {
        settings,
        update: (patch) => apply(toSettings({ ...settings(), ...patch })),
        reset: () => apply(toSettings(DEFAULT_SETTINGS)),
    };
    return <SettingsContext value={state}>{props.children}</SettingsContext>;
}

export function useSettings(): SettingsState {
    const state = useContext(SettingsContext);
    if (!state)
        throw new Error("useSettings needs a SettingsProvider above it");
    return state;
}
