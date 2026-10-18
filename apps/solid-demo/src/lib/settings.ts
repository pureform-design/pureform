// The demo's settings: what the floating panel changes, how it's stored in a cookie, and how a
// cookie reads back. Shared by the server (which reads the cookie to render the first paint) and
// the browser (which writes it); the provider props they turn into are in `src/shell/theme.ts`.

import { z } from "zod";

export const SCHEMES = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
] as const;

/** Colors the panel offers: the config's base palette, its `teal` theme, and seeds generated at
 *  run time. Each `seed` is the color the swatch previews (the base palette is Material's
 *  default seed). */
export const COLORS = [
    { value: "baseline", label: "Baseline", seed: "#6750A4" },
    { value: "teal", label: "Teal (named theme)", seed: "#006A60" },
    { value: "blue", label: "Blue", seed: "#0B57D0" },
    { value: "green", label: "Green", seed: "#386A20" },
    { value: "amber", label: "Amber", seed: "#8B5000" },
    { value: "rose", label: "Rose", seed: "#9C4146" },
    { value: "custom", label: "Custom seed", seed: undefined },
] as const;

export const SHAPES = [
    { value: "material", label: "Material" },
    { value: "squircle", label: "Squircle" },
    { value: "soft", label: "Soft" },
    { value: "sharp", label: "Sharp" },
] as const;

export const DENSITIES = [
    { value: "comfortable", label: "Comfortable" },
    { value: "default", label: "Default" },
    { value: "compact", label: "Compact" },
    { value: "dense", label: "Dense" },
] as const;

export const FONTS = [
    { value: "material", label: "Roboto" },
    { value: "system", label: "System" },
    { value: "serif", label: "Serif headings" },
    { value: "mono", label: "Monospace" },
] as const;

export const DIRECTIONS = [
    { value: "ltr", label: "Left to right" },
    { value: "rtl", label: "Right to left" },
] as const;

export const MOTIONS = [
    { value: "system", label: "System" },
    { value: "reduce", label: "Reduced" },
    { value: "full", label: "Full" },
] as const;

export const INDICATIONS = [
    { value: "material", label: "Ripple" },
    { value: "sparkle", label: "Sparkle" },
    { value: "no-ripple", label: "No ripple" },
    { value: "bold", label: "Bold (custom)" },
    { value: "none", label: "None" },
] as const;

type Values<T extends readonly { value: string }[]> = T[number]["value"];

const values = <T extends readonly { value: string }[]>(options: T) =>
    options.map((option) => option.value) as [Values<T>, ...Values<T>[]];

const HEX = /^#[0-9a-f]{6}$/i;

/** Whether `value` is a `#rrggbb` color, the only form a custom seed takes. */
export const isHexColor = (value: string): value is `#${string}` =>
    HEX.test(value);

export const DEFAULT_SETTINGS = {
    scheme: "system",
    color: "baseline",
    customSeed: "#7D5260",
    shape: "material",
    density: "default",
    font: "material",
    dir: "ltr",
    motion: "system",
    indication: "material",
} as const satisfies Record<string, string>;

// Each field falls back to its default on its own, so a cookie from an older version of the demo
// keeps what still makes sense.
const field = <T extends z.ZodType>(schema: T, fallback: z.output<T>) =>
    schema.catch(fallback);

export const settingsSchema = z.object({
    scheme: field(z.enum(values(SCHEMES)), DEFAULT_SETTINGS.scheme),
    color: field(z.enum(values(COLORS)), DEFAULT_SETTINGS.color),
    customSeed: field(
        z.string().refine(isHexColor),
        DEFAULT_SETTINGS.customSeed,
    ),
    shape: field(z.enum(values(SHAPES)), DEFAULT_SETTINGS.shape),
    density: field(z.enum(values(DENSITIES)), DEFAULT_SETTINGS.density),
    font: field(z.enum(values(FONTS)), DEFAULT_SETTINGS.font),
    dir: field(z.enum(values(DIRECTIONS)), DEFAULT_SETTINGS.dir),
    motion: field(z.enum(values(MOTIONS)), DEFAULT_SETTINGS.motion),
    indication: field(z.enum(values(INDICATIONS)), DEFAULT_SETTINGS.indication),
});

export type Settings = z.output<typeof settingsSchema>;

/** The cookie the settings live in: not secret, so the browser writes it, and the server reads
 *  it before rendering. */
export const SETTINGS_COOKIE = "pureform-demo-settings";

const YEAR = 60 * 60 * 24 * 365;

/** Stores the settings in the browser's cookie, for the server's next render. */
export const storeSettings = (settings: Settings) => {
    document.cookie = `${SETTINGS_COOKIE}=${encodeURIComponent(
        JSON.stringify(settings),
    )}; Path=/; Max-Age=${YEAR}; SameSite=Lax`;
};

/** Settings from a value of any shape: every field it gets wrong is its default. */
export const toSettings = (value: unknown): Settings =>
    settingsSchema.parse(
        typeof value === "object" && value !== null ? value : {},
    );

/** The settings in a `Cookie` header, or the defaults. */
export const readSettings = (cookieHeader: string | null): Settings => {
    for (const pair of cookieHeader?.split(";") ?? []) {
        const [name, ...rest] = pair.trim().split("=");
        if (name !== SETTINGS_COOKIE) continue;
        try {
            return toSettings(JSON.parse(decodeURIComponent(rest.join("="))));
        } catch {
            break;
        }
    }
    return toSettings({});
};
