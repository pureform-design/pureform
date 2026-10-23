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
import type { ImageStyle, StyleProp, TextStyle, ViewStyle } from "react-native";

import { IconSlot, ownText } from "./icon-style";
import { testIdOf, withEngine } from "./parts";
import { useOverlayPresence } from "./presence";
import { useEngine } from "./provider";
import { useSelectedStyles, withUserStyle } from "./styles";
import type { RootStyleProps } from "./styles";

// The one style of a component: under `root` where it has slots, else `""`.
const rootOf = (selected: Selected): Style =>
    selected.styles.root ?? selected.styles[""] ?? {};
const rootDrawing = (selected: Selected) =>
    selected.drawings.root ?? selected.drawings[""];

type Root = "root";

export interface TextProps extends TextVariantProps {
    readonly children?: ReactNode;
    readonly style?: StyleProp<TextStyle>;
    readonly testId?: TestIdOverride<Root> | undefined;
}

/** Text in a type style: `<Text textStyle="titleLarge">Inbox</Text>`. Nothing inherits on React
 *  Native, so it takes the surface's text color unless its style says otherwise. */
export function Text(props: TextProps): ReactNode {
    const selected = useSelectedStyles("text", textSelection(props));
    const tokens = useTokens();
    return (
        <NativeText
            style={[
                { color: String(tokens["colors.onSurface"]) },
                rootOf(selected) as TextStyle,
                props.style,
            ]}
            testID={testIdOf(textAnatomy, "root", props.testId)}
        >
            {props.children}
        </NativeText>
    );
}

export interface AvatarProps extends AvatarVariantProps {
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
            {...(props.label === undefined
                ? { "aria-hidden": true }
                : { role: "img" as const, "aria-label": props.label })}
            style={style as ViewStyle}
            testID={testIdOf(avatarAnatomy, "root", props.testId)}
        >
            {Drawing ? <Drawing drawing={rootDrawing(selected)} /> : null}
            {props.src !== undefined && (
                <Image
                    accessibilityElementsHidden
                    alt=""
                    onError={() => settle("error")}
                    onLoad={() => settle("loaded")}
                    source={{ uri: props.src }}
                    style={[
                        selected.styles.image as ImageStyle,
                        loaded ? null : HIDDEN,
                    ]}
                    testID={testIdOf(avatarAnatomy, "image", props.testId)}
                />
            )}
            {loaded ? null : (
                <NativeText
                    style={ownText(style) as TextStyle}
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

export interface BadgeProps extends BadgeVariantProps, RootStyleProps {
    /** What it says for assistive technology ("3 unread"). */
    readonly label?: string | undefined;
    /** The count or short label of a large badge. */
    readonly children?: ReactNode;
    readonly testId?: TestIdOverride<Root> | undefined;
}

function BadgeImpl(props: BadgeProps): ReactNode {
    const engine = useEngine();
    const selected = useSelectedStyles("badge", badgeSelection(props));
    const style = rootOf(selected);
    const Drawing = engine.Drawing;
    const hidden = props.label === undefined && props.size === "small";
    return (
        <View
            {...(props.label === undefined
                ? {}
                : { role: "img" as const, "aria-label": props.label })}
            aria-hidden={hidden ? true : undefined}
            style={withUserStyle(style as ViewStyle, props.style)}
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

export interface IconProps extends IconVariantProps {
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
            {...(props.label === undefined
                ? { "aria-hidden": true }
                : { role: "img", "aria-label": props.label })}
            style={own as ViewStyle}
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

export interface SeparatorProps extends SeparatorVariantProps {
    readonly testId?: TestIdOverride<Root> | undefined;
}

/** Material's divider: `<Separator inset="start" />`. */
export function Separator(props: SeparatorProps): ReactNode {
    const selected = useSelectedStyles("separator", separatorSelection(props));
    return (
        <View
            role="separator"
            style={rootOf(selected) as ViewStyle}
            testID={testIdOf(separatorAnatomy, "root", props.testId)}
        />
    );
}

export interface SupportingTextProps extends SupportingTextVariantProps {
    readonly children?: ReactNode;
    readonly testId?: TestIdOverride<Root> | undefined;
}

/** Text under a control, in a tone: `<SupportingText tone="error">…</SupportingText>`. */
export function SupportingText(props: SupportingTextProps): ReactNode {
    const selected = useSelectedStyles(
        "supportingText",
        supportingTextSelection(props),
    );
    return (
        <NativeText
            style={rootOf(selected) as TextStyle}
            testID={testIdOf(supportingTextAnatomy, "root", props.testId)}
        >
            {props.children}
        </NativeText>
    );
}

export interface ScrimProps extends ScrimVariantProps {
    /** Whether it shows: it fades in when this turns true and out when it turns false,
     *  rendering nothing once it's gone. Without it, the scrim is always shown, still. */
    readonly open?: boolean | undefined;
    readonly testId?: TestIdOverride<Root> | undefined;
}

/** A layer dimming what sits behind it, over the whole of its parent. */
export function Scrim(props: ScrimProps): ReactNode {
    const engine = useEngine();
    const selected = useSelectedStyles("scrim", scrimSelection(props));
    const presence = useOverlayPresence(props.open, "scrim");
    if (!presence.present) return null;
    const testID = testIdOf(scrimAnatomy, "root", props.testId);
    if (props.open === undefined) {
        return (
            <View
                pointerEvents="none"
                style={rootOf(selected) as ViewStyle}
                testID={testID}
            />
        );
    }
    return (
        <engine.View
            {...presence.props}
            pointerEvents="none"
            style={{ ...rootOf(selected), ...presence.style }}
            testID={testID}
        />
    );
}

export interface MediaProps extends MediaVariantProps {
    /** The picture's address, as the web's `src` and the avatar's. */
    readonly src?: string | undefined;
    /** The picture, as React Native's `Image` takes it; `src` wins when both are given. */
    readonly source?: { readonly uri: string } | undefined;
    /** What it shows, for assistive technology; empty when decorative. */
    readonly alt?: string | undefined;
    readonly testId?: TestIdOverride<Root> | undefined;
}

function MediaImpl(props: MediaProps): ReactNode {
    const engine = useEngine();
    const selected = useSelectedStyles("media", mediaSelection(props));
    const { objectFit, ...style } = rootOf(selected);
    const fit = objectFit === "contain" ? "contain" : "cover";
    const drawing = rootDrawing(selected);
    const testID = testIdOf(mediaAnatomy, "root", props.testId);
    const Drawing = engine.Drawing;
    const uri = props.src ?? props.source?.uri ?? "";
    // At `auto`, the web's picture takes its own proportions at the container's width. A React
    // Native image has none until it's measured, so it would draw with no height.
    const auto = style.aspectRatio === undefined;
    const [ratio, setRatio] = useState<{ uri: string; ratio: number }>();
    useEffect(() => {
        if (!auto || uri === "") return undefined;
        let current = true;
        Image.getSize(
            uri,
            (width, height) =>
                current &&
                width > 0 &&
                height > 0 &&
                setRatio({ uri, ratio: width / height }),
            () => {},
        );
        return () => {
            current = false;
        };
    }, [auto, uri]);
    if (auto && ratio?.uri === uri) style.aspectRatio = ratio.ratio;
    // A shaped picture is drawn clipped to its shape; React Native's Image can't clip to one.
    if (drawing && Drawing) {
        return (
            <View
                role="img"
                aria-label={props.alt ?? ""}
                style={style as ViewStyle}
                testID={testID}
            >
                <Drawing drawing={drawing} image={{ uri, fit }} />
            </View>
        );
    }
    return (
        <Image
            source={{ uri }}
            accessibilityLabel={props.alt ?? ""}
            resizeMode={fit}
            style={style as ImageStyle}
            testID={testID}
        />
    );
}

/** A picture in Material's aspects and shapes: `<Media src={uri} aspect="square" />`. */
export const Media = withEngine(MediaImpl, "Media");
