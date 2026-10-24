// The fade through: Material's transition between content that isn't spatially related, such as
// navigation destinations. The app wraps the content and names what it shows with `value`; a new
// value fades the shown page out (growing to 105%), then the new one in as it grows from 80%, on
// the provider's engine, the growth on the theme's default spatial spring. Under reduced motion
// only the fades run. The page shown first doesn't move; a page that left stays, out of the flow,
// out of reach and hidden from assistive technology, until its exit ends.

import { fadeThroughAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    changePages,
    fadeThroughSelection,
    pagesLeaving,
} from "@pureform/binding-core";
import type {
    FadeThroughPart,
    FadeThroughValue,
    PageKey,
    TransitionPage,
} from "@pureform/binding-core";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { useTransitionPages } from "../page-transition";
import { testIdOf } from "../parts";
import { useOverlayPresence } from "../presence";
import { useEngine } from "../provider";
import { nativeSlots } from "../slot-props";
import type { NativeSlotProps, PartSlots } from "../slot-props";
import { useSelectedStyles } from "../styles";

/** The fade through's props. */
/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface FadeThroughHosts {
    readonly root: "View";
    readonly page: "View";
}

export interface FadeThroughProps extends NativeSlotProps<FadeThroughHosts> {
    /** What the content shows, such as the selected navigation destination's value; a new value
     *  fades through to the content given with it. */
    readonly value: FadeThroughValue;
    /** The content `value` shows, or a function of the value giving it. */
    readonly children?: ReactNode | ((value: FadeThroughValue) => ReactNode);
    readonly testId?: TestIdOverride<FadeThroughPart> | undefined;
}

interface PageProps {
    readonly page: TransitionPage;
    readonly gone: (page: TransitionPage) => void;
    readonly style: StyleProp<ViewStyle>;
    readonly testID: string;
    readonly slot: PartSlots;
    readonly children: ReactNode;
}

function Page({
    page,
    gone,
    style,
    testID,
    slot,
    children,
}: PageProps): ReactNode {
    const engine = useEngine();
    // The first page is still; the others enter, and leave once closed. An entered page stays
    // `entering` (it doesn't settle), so its presence stays open.
    const presence = useOverlayPresence(
        page.state === "current" ? undefined : page.state === "entering",
        "fadeThrough",
    );
    const leave = useRef(() => gone(page));
    leave.current = () => gone(page);
    useEffect(() => {
        if (!presence.present) leave.current();
    }, [presence.present]);
    const leaving = page.state === "leaving";
    return (
        <engine.View
            {...slot.props("page")}
            {...slot.with("page", presence.props)}
            pointerEvents={leaving ? "none" : "auto"}
            aria-hidden={leaving}
            importantForAccessibility={leaving ? "no-hide-descendants" : "auto"}
            style={[
                slot.style("page", style),
                leaving ? StyleSheet.absoluteFill : null,
                presence.style,
            ]}
            testID={testID}
        >
            {children}
        </engine.View>
    );
}

// Quick switches keep every page still leaving until its own exit ends.
const change = (pages: readonly TransitionPage[], key: PageKey) =>
    changePages(pages, key, { keepLeaving: true });

/** Material's fade through: `<FadeThrough value={destination}>{page}</FadeThrough>`, with the
 *  navigation bar's or rail's `value`. */
export function FadeThrough(props: FadeThroughProps): ReactNode {
    const slot = nativeSlots(props);
    const selected = useSelectedStyles("fadeThrough", fadeThroughSelection());
    const given = props.children;
    const { pages, contents, settle } = useTransitionPages(
        props.value,
        typeof given === "function" ? given(props.value) : given,
        change,
    );
    const pageTestId = testIdOf(fadeThroughAnatomy, "page", props.testId);
    return (
        <View
            {...slot.props("root")}
            style={slot.style("root", [
                selected.styles.root as ViewStyle,
                // While a page leaves, clip to the incoming one, so a taller page doesn't spill.
                pagesLeaving(pages) ? CLIP : null,
            ])}
            testID={testIdOf(fadeThroughAnatomy, "root", props.testId)}
        >
            {pages.map((page) => (
                <Page
                    key={page.key}
                    page={page}
                    gone={settle}
                    style={selected.styles.page as ViewStyle}
                    testID={pageTestId}
                    slot={slot}
                >
                    {contents.get(page.key)}
                </Page>
            ))}
        </View>
    );
}

const CLIP: ViewStyle = { overflow: "hidden" };
