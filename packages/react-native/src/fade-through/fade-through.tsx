// The fade through: Material's transition between content that isn't spatially related, such as
// navigation destinations. The app wraps the content and names what it shows with `value`; a new
// value fades the shown page out (growing to 105%), then the new one in as it grows from 80%, on
// the provider's engine, the growth on the theme's default spatial spring. Under reduced motion
// only the fades run. The page shown first doesn't move; a page that left stays, out of the flow,
// out of reach and hidden from assistive technology, until its exit ends.

import { fadeThroughAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    dropPage,
    fadeThroughSelection,
    showPage,
} from "@pureform/binding-core";
import type {
    FadeThroughPart,
    FadeThroughState,
    FadeThroughValue,
} from "@pureform/binding-core";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { testIdOf } from "../parts";
import { useOverlayPresence } from "../presence";
import { useEngine } from "../provider";
import { useSelectedStyles } from "../styles";

/** The fade through's props. */
export interface FadeThroughProps {
    /** What the content shows, such as the selected navigation destination's value; a new value
     *  fades through to the content given with it. */
    readonly value: FadeThroughValue;
    /** The content `value` shows, or a function of the value giving it. */
    readonly children?: ReactNode | ((value: FadeThroughValue) => ReactNode);
    readonly style?: StyleProp<ViewStyle>;
    readonly testId?: TestIdOverride<FadeThroughPart> | undefined;
}

interface PageProps {
    readonly state: FadeThroughState;
    readonly gone: () => void;
    readonly style: StyleProp<ViewStyle>;
    readonly testID: string;
    readonly children: ReactNode;
}

function Page({ state, gone, style, testID, children }: PageProps): ReactNode {
    const engine = useEngine();
    // The first page is still; the others enter, and leave once closed.
    const presence = useOverlayPresence(
        state === undefined ? undefined : state === "open",
        "fadeThrough",
    );
    const leave = useRef(gone);
    leave.current = gone;
    useEffect(() => {
        if (!presence.present) leave.current();
    }, [presence.present]);
    const leaving = state === "closed";
    return (
        <engine.View
            {...presence.props}
            pointerEvents={leaving ? "none" : "auto"}
            aria-hidden={leaving}
            importantForAccessibility={leaving ? "no-hide-descendants" : "auto"}
            style={[
                style,
                leaving ? StyleSheet.absoluteFill : null,
                presence.style,
            ]}
            testID={testID}
        >
            {children}
        </engine.View>
    );
}

/** Material's fade through: `<FadeThrough value={destination}>{page}</FadeThrough>`, with the
 *  navigation bar's or rail's `value`. */
export function FadeThrough(props: FadeThroughProps): ReactNode {
    const selected = useSelectedStyles("fadeThrough", fadeThroughSelection());
    const [pages, setPages] = useState(() =>
        showPage<null>([], props.value, null),
    );
    const next = showPage(pages, props.value, null);
    // A new value updates the pages during this render, as derived state does.
    if (next !== pages) setPages(next);
    // Each page's content: the shown one's from this render, a leaving one's as it last was.
    const contents = useRef(new Map<FadeThroughValue, ReactNode>()).current;
    const given = props.children;
    contents.set(
        props.value,
        typeof given === "function" ? given(props.value) : given,
    );
    for (const value of contents.keys()) {
        if (!next.some((page) => page.value === value)) contents.delete(value);
    }
    const pageTestId = testIdOf(fadeThroughAnatomy, "page", props.testId);
    return (
        <View
            style={[selected.styles.root as ViewStyle, props.style]}
            testID={testIdOf(fadeThroughAnatomy, "root", props.testId)}
        >
            {next.map((page) => (
                <Page
                    key={page.value}
                    state={page.state}
                    gone={() =>
                        setPages((current) => dropPage(current, page.value))
                    }
                    style={selected.styles.page as ViewStyle}
                    testID={pageTestId}
                >
                    {contents.get(page.value)}
                </Page>
            ))}
        </View>
    );
}
