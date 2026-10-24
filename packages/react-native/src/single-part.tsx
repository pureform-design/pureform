// The single-part components: text in a type style, the avatar, the badge, the standalone icon, the
// separator, supporting text, the scrim, and media. Each is one view (or text, or image) in its
// component's style; they don't move, so they render without the engine's animated views, but for
// a scrim given `open`, which fades in and out on the engine's view.

import {
    avatarAnatomy,
    badgeAnatomy,
    iconAnatomy,
    mediaAnatomy,
    scrimAnatomy,
    separatorAnatomy,
    supportingTextAnatomy,
    textAnatomy,
} from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    avatarSelection,
    badgeSelection,
    iconSelection,
    mediaSelection,
    scrimSelection,
    separatorSelection,
    supportingTextSelection,
    textSelection,
} from "@pureform/binding-core";
import type {
    AvatarPart,
    AvatarVariantProps,
    BadgeVariantProps,
    IconVariantProps,
    MediaVariantProps,
    ScrimVariantProps,
    SeparatorVariantProps,
    SupportingTextVariantProps,
    TextVariantProps,
} from "@pureform/binding-core";
import type { Selected, Style } from "@pureform/rn-adapter/factory";
import { useTokens } from "@pureform/rn-adapter/react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Image, Text as NativeText, View } from "react-native";
import type {
    ImageSourcePropType,
    ImageStyle,
    TextStyle,
    ViewStyle,
} from "react-native";

import { isDev } from "./env";
import { IconSlot, ownText } from "./icon-style";
import { testIdOf, withEngine } from "./parts";
import { useOverlayPresence } from "./presence";
import { useEngine } from "./provider";
import { nativeSlots } from "./slot-props";
import type { NativeSlotProps, PartSlots } from "./slot-props";
import { useSelectedStyles } from "./styles";

// The one style of a component: under `root` where it has slots, else `""`.
const rootOf = (selected: Selected): Style =>
    selected.styles.root ?? selected.styles[""] ?? {};
const rootDrawing = (selected: Selected) =>
    selected.drawings.root ?? selected.drawings[""];

type Root = "root";

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface TextHosts {
    readonly root: "Text";
}

export interface TextProps
    extends TextVariantProps, NativeSlotProps<TextHosts> {
    readonly children?: ReactNode;
    readonly testId?: TestIdOverride<Root> | undefined;
}

/** Text in a type style: `<Text textStyle="titleLarge">Inbox</Text>`. Nothing inherits on React
 *  Native, so it takes the surface's text color unless its style says otherwise. */
export function Text(props: TextProps): ReactNode {
    const slot = nativeSlots(props);
    const selected = useSelectedStyles("text", textSelection(props));
    const tokens = useTokens();
    return (
        <NativeText
            {...slot.props("root")}
            style={slot.style("root", [
                { color: String(tokens["colors.onSurface"]) },
                rootOf(selected) as TextStyle,
            ])}
            testID={testIdOf(textAnatomy, "root", props.testId)}
        >
            {props.children}
        </NativeText>
    );
}

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface AvatarHosts {
    readonly root: "View";
    readonly image: "Image";
    readonly fallback: "Text";
}

export interface AvatarProps
    extends AvatarVariantProps, NativeSlotProps<AvatarHosts> {
    /** Who it stands for, for assistive technology. */
    readonly label?: string | undefined;
    /** The picture. It shows once it has loaded; until then, and if it fails, the children do. */
    readonly src?: string | undefined;
    /** Called when the picture loads or fails. */
    readonly onStatusChange?:
        | ((details: { readonly status: "loaded" | "error" }) => void)
        | undefined;
    /** Initials, or anything else to show: the fallback. */
    readonly children?: ReactNode;
    readonly testId?: TestIdOverride<AvatarPart> | undefined;
}

// An image that hasn't loaded still has to, so it stays mounted but takes no room.
const HIDDEN = {
    position: "absolute",
    width: 0,
    height: 0,
    opacity: 0,
} as const;

function AvatarImpl(props: AvatarProps): ReactNode {
    const slot = nativeSlots(props);
    const engine = useEngine();
    const selected = useSelectedStyles("avatar", avatarSelection(props));
    const style = rootOf(selected);
    const Drawing = engine.Drawing;
    // The picture's load, per `src`: a new one starts over.
    const [status, setStatus] = useState<{
        src: string | undefined;
        loaded: boolean;
    }>({ src: props.src, loaded: false });
    const loaded = status.src === props.src && status.loaded;
    const settle = (next: "loaded" | "error") => {
        setStatus({ src: props.src, loaded: next === "loaded" });
        props.onStatusChange?.({ status: next });
    };
    return (
        <View
            // Named by `label` as an image, like the web's root; without one it's decorative.
            {...slot.props("root")}
            {...(props.label === undefined
                ? { "aria-hidden": true }
                : { role: "img" as const, "aria-label": props.label })}
            style={slot.style("root", style as ViewStyle)}
            testID={testIdOf(avatarAnatomy, "root", props.testId)}
        >
            {Drawing ? <Drawing drawing={rootDrawing(selected)} /> : null}
            {props.src !== undefined && (
                <Image
                    {...slot.props("image")}
                    accessibilityElementsHidden
                    alt=""
                    onError={slot.on("image", "onError", () => settle("error"))}
                    onLoad={slot.on("image", "onLoad", () => settle("loaded"))}
                    source={{ uri: props.src }}
                    style={slot.style("image", [
                        selected.styles.image as ImageStyle,
                        loaded ? null : HIDDEN,
                    ])}
                    testID={testIdOf(avatarAnatomy, "image", props.testId)}
                />
            )}
            {loaded ? null : (
                <NativeText
                    {...slot.props("fallback")}
                    style={slot.style("fallback", ownText(style) as TextStyle)}
                    testID={testIdOf(avatarAnatomy, "fallback", props.testId)}
                >
                    {props.children}
                </NativeText>
            )}
        </View>
    );
}

/** Material's avatar, in its shape: `<Avatar label="Ada Lovelace">AL</Avatar>`. */
export const Avatar = withEngine(AvatarImpl, "Avatar");

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface BadgeHosts {
    readonly root: "View";
}

export interface BadgeProps
    extends BadgeVariantProps, NativeSlotProps<BadgeHosts> {
    /** What it says for assistive technology ("3 unread"). */
    readonly label?: string | undefined;
    /** The count or short label of a large badge. */
    readonly children?: ReactNode;
    readonly testId?: TestIdOverride<Root> | undefined;
}

function BadgeImpl(props: BadgeProps): ReactNode {
    const slot = nativeSlots(props);
    const engine = useEngine();
    const selected = useSelectedStyles("badge", badgeSelection(props));
    const style = rootOf(selected);
    const Drawing = engine.Drawing;
    const hidden = props.label === undefined && props.size === "small";
    return (
        <View
            {...slot.props("root")}
            {...(props.label === undefined
                ? {}
                : { role: "img" as const, "aria-label": props.label })}
            aria-hidden={hidden ? true : undefined}
            style={slot.style("root", style as ViewStyle)}
            testID={testIdOf(badgeAnatomy, "root", props.testId)}
        >
            {Drawing ? <Drawing drawing={rootDrawing(selected)} /> : null}
            {props.children === undefined ? null : (
                <NativeText style={ownText(style) as TextStyle}>
                    {props.children}
                </NativeText>
            )}
        </View>
    );
}

/** Material's badge: `<Badge>3</Badge>`, or a dot, `<Badge size="small" />`. */
export const Badge = withEngine(BadgeImpl, "Badge");

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface IconHosts {
    readonly root: "View";
}

export interface IconProps
    extends IconVariantProps, NativeSlotProps<IconHosts> {
    /** The icon's name for assistive technology; without it, the icon is decorative. */
    readonly label?: string | undefined;
    /** Flips a pointing icon under right to left. */
    readonly mirror?: boolean | undefined;
    /** The icon: anything reading `useIconStyle()`, or a `Glyph`. */
    readonly children?: ReactNode;
    readonly testId?: TestIdOverride<Root> | undefined;
}

/** A standalone icon in Material's sizes and colors: `<Icon label="Star"><Glyph glyph="★" />
 *  </Icon>`. Without a color, it takes the surface's text color. */
export function Icon(props: IconProps): ReactNode {
    const slot = nativeSlots(props);
    const selected = useSelectedStyles(
        "icon",
        iconSelection(props),
        props.mirror ? { mirrored: true } : {},
    );
    const tokens = useTokens();
    const own = rootOf(selected);
    const style = { color: String(tokens["colors.onSurface"]), ...own };
    return (
        <View
            {...slot.props("root")}
            {...(props.label === undefined
                ? { "aria-hidden": true }
                : { role: "img", "aria-label": props.label })}
            style={slot.style("root", own as ViewStyle)}
            testID={testIdOf(iconAnatomy, "root", props.testId)}
        >
            <IconSlot
                style={style}
                iconFill={selected.iconFills.root ?? selected.iconFills[""]}
                motion={style}
            >
                {props.children}
            </IconSlot>
        </View>
    );
}

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface SeparatorHosts {
    readonly root: "View";
}

export interface SeparatorProps
    extends SeparatorVariantProps, NativeSlotProps<SeparatorHosts> {
    readonly testId?: TestIdOverride<Root> | undefined;
}

/** Material's divider: `<Separator inset="start" />`. */
export function Separator(props: SeparatorProps): ReactNode {
    const slot = nativeSlots(props);
    const selected = useSelectedStyles("separator", separatorSelection(props));
    return (
        <View
            {...slot.props("root")}
            role="separator"
            style={slot.style("root", rootOf(selected) as ViewStyle)}
            testID={testIdOf(separatorAnatomy, "root", props.testId)}
        />
    );
}

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface SupportingTextHosts {
    readonly root: "Text";
}

export interface SupportingTextProps
    extends SupportingTextVariantProps, NativeSlotProps<SupportingTextHosts> {
    readonly children?: ReactNode;
    readonly testId?: TestIdOverride<Root> | undefined;
}

/** Text under a control, in a tone: `<SupportingText tone="error">…</SupportingText>`. */
export function SupportingText(props: SupportingTextProps): ReactNode {
    const slot = nativeSlots(props);
    const selected = useSelectedStyles(
        "supportingText",
        supportingTextSelection(props),
    );
    return (
        <NativeText
            {...slot.props("root")}
            style={slot.style("root", rootOf(selected) as TextStyle)}
            testID={testIdOf(supportingTextAnatomy, "root", props.testId)}
        >
            {props.children}
        </NativeText>
    );
}

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface ScrimHosts {
    readonly root: "View";
}

export interface ScrimProps
    extends ScrimVariantProps, NativeSlotProps<ScrimHosts> {
    /** Whether it shows: it fades in when this turns true and out when it turns false,
     *  rendering nothing once it's gone. Without it, the scrim is always shown, still. */
    readonly open?: boolean | undefined;
    readonly testId?: TestIdOverride<Root> | undefined;
    /** The owner's per-part props in its place (a dialog's `backdrop`), for its own scrim. */
    readonly slot?: PartSlots | undefined;
}

/** A layer dimming what sits behind it, over the whole of its parent. */
export function Scrim(props: ScrimProps): ReactNode {
    const engine = useEngine();
    const selected = useSelectedStyles("scrim", scrimSelection(props));
    const presence = useOverlayPresence(props.open, "scrim");
    if (!presence.present) return null;
    const testID = testIdOf(scrimAnatomy, "root", props.testId);
    const slot = props.slot ?? nativeSlots(props);
    if (props.open === undefined) {
        return (
            <View
                {...slot.props("root")}
                pointerEvents="none"
                style={slot.style("root", rootOf(selected) as ViewStyle)}
                testID={testID}
            />
        );
    }
    return (
        <engine.View
            {...slot.props("root")}
            {...slot.with("root", presence.props)}
            pointerEvents="none"
            style={slot.style("root", {
                ...rootOf(selected),
                ...presence.style,
            })}
            testID={testID}
        />
    );
}

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface MediaHosts {
    readonly root: "Image";
}

export interface MediaProps
    extends MediaVariantProps, NativeSlotProps<MediaHosts> {
    /** The picture's address, as the web's `src` and the avatar's. */
    readonly src?: string | undefined;
    /** The picture, as React Native's `Image` takes it: a `require()`d asset, `{ uri, headers,
     *  cache }`, or an array of resolutions. It wins over `src`; development warns when both are
     *  given. */
    readonly source?: ImageSourcePropType | undefined;
    /** What it shows, for assistive technology; empty when decorative. */
    readonly alt?: string | undefined;
    readonly testId?: TestIdOverride<Root> | undefined;
}

type Sized = { width?: number; height?: number; uri?: string };

// The proportions a source gives without loading it: an asset's, from the bundler, or the
// width and height a remote source names.
const knownRatio = (source: ImageSourcePropType): number | undefined => {
    const sized = (s: Sized | null | undefined) =>
        s?.width && s.height ? s.width / s.height : undefined;
    if (typeof source === "number") {
        const resolve = (
            Image as { resolveAssetSource?: (s: number) => Sized | null }
        ).resolveAssetSource;
        return resolve ? sized(resolve(source)) : undefined;
    }
    if (Array.isArray(source))
        return source.map((s) => sized(s as Sized)).find(Boolean);
    return sized(source as Sized);
};

// The remote picture a source names, for measuring: its address and request headers. An array
// measures its first resolution, since they share proportions.
const remoteOf = (
    source: ImageSourcePropType,
): { uri: string; headers?: Record<string, string> } | undefined => {
    const one = (Array.isArray(source) ? source[0] : source) as
        | { uri?: string; headers?: Record<string, string> }
        | number
        | undefined;
    if (typeof one !== "object" || !one?.uri) return undefined;
    return one.headers
        ? { uri: one.uri, headers: one.headers }
        : { uri: one.uri };
};

let warnedBoth = false;

function MediaImpl(props: MediaProps): ReactNode {
    const engine = useEngine();
    const selected = useSelectedStyles("media", mediaSelection(props));
    const { objectFit, ...style } = rootOf(selected);
    const fit = objectFit === "contain" ? "contain" : "cover";
    const drawing = rootDrawing(selected);
    const testID = testIdOf(mediaAnatomy, "root", props.testId);
    const slot = nativeSlots(props);
    const Drawing = engine.Drawing;
    if (isDev && !warnedBoth && props.source != null && props.src != null) {
        warnedBoth = true;
        console.warn("Media: both `source` and `src` are set; `source` wins.");
    }
    const source: ImageSourcePropType = props.source ?? {
        uri: props.src ?? "",
    };
    // At `auto`, the web's picture takes its own proportions at the container's width. A React
    // Native image has none until it's measured, so it would draw with no height.
    const auto = style.aspectRatio === undefined;
    const known = auto ? knownRatio(source) : undefined;
    const remote = auto && known === undefined ? remoteOf(source) : undefined;
    const key = remote ? JSON.stringify(remote) : "";
    const [ratio, setRatio] = useState<{ key: string; ratio: number }>();
    useEffect(() => {
        if (!remote) return undefined;
        let current = true;
        const done = (width: number, height: number) =>
            current &&
            width > 0 &&
            height > 0 &&
            setRatio({ key, ratio: width / height });
        // React Native Web has no `getSizeWithHeaders`: it measures without them.
        if (remote.headers && typeof Image.getSizeWithHeaders === "function")
            Image.getSizeWithHeaders(
                remote.uri,
                remote.headers,
                done,
                () => {},
            );
        else Image.getSize(remote.uri, done, () => {});
        return () => {
            current = false;
        };
        // `key` stands for `remote`, a new object each render.
    }, [key]);
    // A source's own width and height size an `Image` whose style doesn't: the aspect sizes it.
    if (style.height === undefined) style.height = "auto";
    if (known !== undefined) style.aspectRatio = known;
    else if (remote && ratio?.key === key) style.aspectRatio = ratio.ratio;
    // A shaped picture is drawn clipped to its shape; React Native's Image can't clip to one.
    if (drawing && Drawing) {
        return (
            <View
                {...(slot.props("root") as object)}
                role="img"
                aria-label={props.alt ?? ""}
                style={slot.style("root", style as ViewStyle)}
                testID={testID}
            >
                <Drawing drawing={drawing} image={{ source, fit }} />
            </View>
        );
    }
    return (
        <Image
            {...slot.props("root")}
            source={source}
            accessibilityLabel={props.alt ?? ""}
            resizeMode={fit}
            style={slot.style("root", style as ImageStyle)}
            testID={testID}
        />
    );
}

/** A picture in Material's aspects and shapes: `<Media src={uri} aspect="square" />`. */
export const Media = withEngine(MediaImpl, "Media");
