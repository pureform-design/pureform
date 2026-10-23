// The toast on React Native: `createToaster()` is Zag's toast store, as on the web, and
// `<Toaster toaster={…} />` shows its toasts in a column at the toaster's placement, over the page
// (put it last in the app's root, inside the provider). Each toast closes after its duration (held
// while it's pressed or the pointer is over it; a `loading` toast stays), by its action, its close
// button, the store's `dismiss`, or a sideways swipe (as on the web: past half its width or a
// flick, it leaves that way; short of that, it settles back; a toast that can't be closed doesn't
// move), then fades out. Zag's machines need the DOM, so this times the
// toasts itself, from the store's data.

import { toastAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    isPresent,
    isToastType,
    TOAST_GLYPHS,
    toasterOptions,
    toastSelection,
    toastSwipeRelease,
} from "@pureform/binding-core";
import type {
    IndicationProps,
    ToasterOptions,
    ToastPart,
    ToastVariantProps,
} from "@pureform/binding-core";
import * as toast from "@pureform/machines/toast";
import { NATIVE_DRIVER } from "@pureform/rn-adapter/animated";
import { useReducedMotion, useTokens } from "@pureform/rn-adapter/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Animated, Easing, Pressable } from "react-native";
import type { LayoutChangeEvent } from "react-native";

import { useHeldTimeout } from "../overlay";
import { testIdOf, withEngine } from "../parts";
import { usePortalHost } from "../portal-host";
import { usePresence } from "../presence";
import { useEngine } from "../provider";
import { useSidewaysPan } from "../sideways-pan";
import { useComponentSlots } from "../styles";
import { SurfaceButton } from "../surface-button";

/** A toaster: Zag's toast store. Call `create`, `success`, `error`, `warning`, `info`, `loading`,
 *  `update` and `dismiss` on it. */
export type ToastStore = toast.Store<ReactNode>;

/** One toast's data, as the store holds it. */
export type ToastData = toast.Props<ReactNode>;

/** A new toaster, with pureform's defaults (bottom end, at most 3, 5 s each). Make it once. */
export const createToaster = (options?: ToasterOptions): ToastStore =>
    toast.createStore(toasterOptions(options));

export interface ToasterProps extends ToastVariantProps, IndicationProps {
    readonly toaster: ToastStore;
    /** The close buttons' name for assistive technology. Default "Dismiss". */
    readonly closeLabel?: string | undefined;
    readonly testId?: TestIdOverride<ToastPart> | undefined;
}

// A toast the store holds, and whether it's on its way out.
type Shown = ToastData & { readonly message?: string };

// The store's visible toasts, newest first, each with its latest data.
function useToasts(store: ToastStore): readonly Shown[] {
    const [toasts, setToasts] = useState<readonly Shown[]>(
        () => store.getVisibleToasts() as Shown[],
    );
    useEffect(
        () =>
            store.subscribe((next: Shown & { dismiss?: boolean }) => {
                setToasts((prev) => {
                    if (next.dismiss) {
                        return prev.filter((item) => item.id !== next.id);
                    }
                    const index = prev.findIndex((item) => item.id === next.id);
                    if (index === -1) return [next, ...prev];
                    return prev.map((item, i) =>
                        i === index ? { ...item, ...next } : item,
                    );
                });
            }),
        [store],
    );
    return toasts;
}

function ToastButtonImpl(props: {
    readonly toaster: ToasterProps;
    readonly type: string | undefined;
    readonly part: "actionTrigger" | "closeTrigger";
    readonly label: string | undefined;
    readonly onPress: () => void;
    readonly children: ReactNode;
}): ReactNode {
    return (
        <SurfaceButton
            anatomy={toastAnatomy}
            component="toast"
            part={props.part}
            selection={toastSelection(props.type, props.toaster)}
            indication={props.toaster.indication}
            testId={props.toaster.testId}
            label={props.label}
            onPress={props.onPress}
        >
            {props.children}
        </SurfaceButton>
    );
}

const ToastButton = withEngine(ToastButtonImpl, "ToastButton");

// Moves shorter than this are a press, not a swipe (the web's toast swipe's).
const SWIPE_SLOP = 8;
// How long a let-go toast takes to settle back or leave, and on what curve (the web's).
const SWIPE_SETTLE_MS = 200;
const SWIPE_EASING = Easing.bezier(0.2, 0, 0, 1);

// A toast's sideways swipe: where it is (`x`), how faded, whether a drag holds it, and the pan
// handlers. `dismiss` runs once a swipe has carried it out.
function useToastSwipe(closable: boolean, dismiss: () => void) {
    const [x] = useState(() => new Animated.Value(0));
    const [width, setWidth] = useState(0);
    const latestWidth = useRef(0);
    latestWidth.current = width;
    const [held, setHeld] = useState(false);
    const reducedMotion = useReducedMotion();
    const to = (value: number, done?: () => void) => {
        if (reducedMotion) {
            x.setValue(value);
            done?.();
            return;
        }
        Animated.timing(x, {
            toValue: value,
            duration: SWIPE_SETTLE_MS,
            easing: SWIPE_EASING,
            useNativeDriver: NATIVE_DRIVER,
        }).start(({ finished }) => {
            if (finished) done?.();
        });
    };
    const handlers = useSidewaysPan({
        slop: SWIPE_SLOP,
        enabled: () => closable,
        start: () => {
            x.stopAnimation();
            setHeld(true);
        },
        move: (dx) => x.setValue(dx),
        release: (dx, vx) => {
            setHeld(false);
            const away = latestWidth.current;
            if (
                toastSwipeRelease({ offset: dx, velocity: vx, width: away }) ===
                "dismissed"
            ) {
                to((Math.sign(dx) || 1) * away, dismiss);
            } else to(0);
        },
        cancel: () => {
            setHeld(false);
            to(0);
        },
    });
    const away = Math.max(width, 1);
    return {
        held,
        handlers,
        onLayout: (event: LayoutChangeEvent) =>
            setWidth(event.nativeEvent.layout.width),
        style: {
            transform: [{ translateX: x }],
            // Fades as it goes, gone at its own width.
            opacity: x.interpolate({
                inputRange: [-away, 0, away],
                outputRange: [0, 1, 0],
                extrapolate: "clamp",
            }),
        },
    };
}

function ToastItem(props: {
    readonly item: Shown;
    readonly toaster: ToasterProps;
    readonly zIndex: number;
}): ReactNode {
    const { item, toaster } = props;
    const store = toaster.toaster;
    const engine = useEngine();
    const open = item.message !== "DISMISS";
    const presence = usePresence(open, "popup");
    const { styles: s, views: v } = useComponentSlots<ToastPart>(
        "toast",
        toastSelection(item.type, toaster),
    );
    const duration =
        item.type === "loading"
            ? Infinity
            : (item.duration ?? store.attrs.duration);
    const dismiss = () => store.dismiss(item.id);
    const swipe = useToastSwipe(open && item.closable !== false, dismiss);
    const { holdProps } = useHeldTimeout(open, duration, dismiss, swipe.held);
    useLayoutEffect(() => {
        if (!presence.present) store.remove(item.id);
    }, [presence.present, store, item.id]);
    if (!presence.present) return null;
    const id = (part: ToastPart) =>
        testIdOf(toastAnatomy, part, toaster.testId);
    const type = isToastType(item.type) ? item.type : "info";
    return (
        <engine.View
            {...presence.props}
            style={{
                pointerEvents: open ? "auto" : "none",
                zIndex: props.zIndex,
                ...presence.style,
            }}
        >
            <Animated.View
                {...swipe.handlers}
                onLayout={swipe.onLayout}
                style={swipe.style}
            >
                <Pressable {...holdProps}>
                    <v.root.View
                        role="status"
                        aria-live="polite"
                        style={{ ...s.root, maxWidth: "100%" }}
                        testID={id("root")}
                    >
                        <v.icon.Text
                            aria-hidden
                            style={s.icon}
                            testID={id("icon")}
                        >
                            {TOAST_GLYPHS[type]}
                        </v.icon.Text>
                        {isPresent(item.title) ? (
                            <v.title.Text style={s.title} testID={id("title")}>
                                {item.title}
                            </v.title.Text>
                        ) : null}
                        {isPresent(item.description) ? (
                            <v.description.Text
                                style={s.description}
                                testID={id("description")}
                            >
                                {item.description}
                            </v.description.Text>
                        ) : null}
                        {item.action ? (
                            <ToastButton
                                toaster={toaster}
                                type={item.type}
                                part="actionTrigger"
                                label={item.action.label}
                                onPress={() => {
                                    item.action?.onClick();
                                    store.dismiss(item.id);
                                }}
                            >
                                {item.action.label}
                            </ToastButton>
                        ) : null}
                        {item.closable !== false ? (
                            <ToastButton
                                toaster={toaster}
                                type={item.type}
                                part="closeTrigger"
                                label={toaster.closeLabel ?? "Dismiss"}
                                onPress={() => store.dismiss(item.id)}
                            >
                                ×
                            </ToastButton>
                        ) : null}
                    </v.root.View>
                </Pressable>
            </Animated.View>
        </engine.View>
    );
}

function ToasterImpl(props: ToasterProps): ReactNode {
    const toasts = useToasts(props.toaster);
    const host = usePortalHost();
    const insets = host?.insets ?? { top: 0, right: 0, bottom: 0, left: 0 };
    const margin = Number(useTokens()["spacing.4"] ?? 16) || 16;
    const { styles: s, views: v } = useComponentSlots<ToastPart>(
        "toast",
        toastSelection(undefined, props),
    );
    const { placement, gap } = props.toaster.attrs;
    const [side, align = "center"] = placement.split("-");
    const top = side === "top";
    return (
        <v.group.View
            pointerEvents="box-none"
            role="region"
            aria-label="Notifications"
            style={{
                ...s.group,
                position: "absolute",
                ...(top
                    ? { top: insets.top + margin }
                    : { bottom: insets.bottom + margin }),
                start: insets.left + margin,
                end: insets.right + margin,
                width: undefined,
                flexDirection: top ? "column" : "column-reverse",
                alignItems:
                    align === "start"
                        ? "flex-start"
                        : align === "end"
                          ? "flex-end"
                          : "center",
                gap,
            }}
            testID={testIdOf(toastAnatomy, "group", props.testId)}
        >
            {toasts.map((item, index) => (
                <ToastItem
                    key={item.id}
                    item={item}
                    toaster={props}
                    zIndex={toasts.length - index}
                />
            ))}
        </v.group.View>
    );
}

/** The toaster's region, which shows a toast store's toasts: `<Toaster toaster={toaster} />`,
 *  then `toaster.success({ title: "Saved" })`. A notification outside Material 3; Material's own
 *  message is the snackbar. */
export const Toaster = withEngine(ToasterImpl, "Toaster");
