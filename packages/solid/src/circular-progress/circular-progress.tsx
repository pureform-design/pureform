// The circular progress indicator: Root, a `role="progressbar"` circle, around its track and its two
// halves, each clipping an arc, and the ready-made CircularProgress over them. It has no machine: the app sets
// the value, which turns the arcs through the preset's `value` token. Without one it's
// indeterminate, and the circle spins.

import { circularProgressAnatomy } from "@pureform/anatomy";
import {
    PROGRESS_ROOT_PROPS,
    progressRootProps,
    progressSelection,
} from "@pureform/binding-core";
import type { ProgressRootOwnProps } from "@pureform/binding-core";
import type { JSX, ValidComponent } from "@solidjs/web";
import { omit } from "solid-js";

import { createPartContext } from "../part-context";
import { createSlotProps, useComponent, plainParts } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";

type Anatomy = typeof circularProgressAnatomy;

/** What Root shares with its parts. */
interface CircularProgressContextValue {
    readonly scope: ComponentScope<Anatomy>;
}

const context =
    createPartContext<CircularProgressContextValue>("CircularProgress");

/** Root's props: the value and its range, the variants and tokens, `testId` and `unstyled` for
 *  every part, `as`, and the element's own props. Name it with `aria-label` or
 *  `aria-labelledby`. */
export interface CircularProgressRootProps
    extends
        Omit<PartProps, keyof ProgressRootOwnProps<"circularProgress">>,
        ProgressRootOwnProps<"circularProgress"> {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface CircularProgressPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The circular progress indicator's root: the circle, with `role="progressbar"` and the value. */
function Root(props: CircularProgressRootProps): JSX.Element {
    const scope = useComponent(circularProgressAnatomy, {
        selection: () => progressSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return (
        <context.Provider value={{ scope }}>
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => progressRootProps(props),
                props: omit(props, "as", ...PROGRESS_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

const part = plainParts(context.use, "span");

/** The track: the rest of the circle, with a gap after the indicator and before its start. Holds
 *  `TrackEndHalf` and `TrackStartHalf`. */
const TrackPart = part("track", "Track");
/** The half of the track at the end side. Holds `TrackEndArc`. */
const TrackEndHalf = part("trackEndHalf", "TrackEndHalf");
/** The arc the track's end half clips. Empty. */
const TrackEndArc = part("trackEndArc", "TrackEndArc");
/** The half of the track at the start side. Holds `TrackStartArc`. */
const TrackStartHalf = part("trackStartHalf", "TrackStartHalf");
/** The arc the track's start half clips. Empty. */
const TrackStartArc = part("trackStartArc", "TrackStartArc");
/** The half at the end side, which draws the first half of the amount. Holds `EndArc`. */
const EndHalf = part("endHalf", "EndHalf");
/** The arc the end half clips. Empty. */
const EndArc = part("endArc", "EndArc");
/** The half at the start side, which draws the rest. Holds `StartArc`. */
const StartHalf = part("startHalf", "StartHalf");
/** The arc the start half clips. Empty. */
const StartArc = part("startArc", "StartArc");

/** The ready-made circular progress indicator's props: Root's, with `class`, `style`, and
 *  `slotProps` keyed by part. */
export interface CircularProgressProps
    extends
        Omit<
            CircularProgressRootProps,
            keyof SlotKeyedProps<Anatomy> | "children"
        >,
        SlotKeyedProps<Anatomy> {}

/** The ready-made circular progress indicator: Root, its track, its halves, and their arcs. */
function ReadyMade(props: CircularProgressProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(
        props,
        "class",
        "style",
        "slotProps",
    ) as CircularProgressRootProps;
    const root = slots("root") as object;
    const track = slots("track");
    const trackEndHalf = slots("trackEndHalf");
    const trackEndArc = slots("trackEndArc");
    const trackStartHalf = slots("trackStartHalf");
    const trackStartArc = slots("trackStartArc");
    const endHalf = slots("endHalf");
    const endArc = slots("endArc");
    const startHalf = slots("startHalf");
    const startArc = slots("startArc");
    return (
        <Root {...own} {...root}>
            <TrackPart {...track}>
                <TrackEndHalf {...trackEndHalf}>
                    <TrackEndArc {...trackEndArc} />
                </TrackEndHalf>
                <TrackStartHalf {...trackStartHalf}>
                    <TrackStartArc {...trackStartArc} />
                </TrackStartHalf>
            </TrackPart>
            <EndHalf {...endHalf}>
                <EndArc {...endArc} />
            </EndHalf>
            <StartHalf {...startHalf}>
                <StartArc {...startArc} />
            </StartHalf>
        </Root>
    );
}

/** Material's circular progress indicator. Use it ready-made, `<CircularProgress value={40}
 *  aria-label="Loading" />` (leave `value` out while the amount is unknown), or compose its parts
 *  under `CircularProgress.Root`: `Track` (its two halves, each holding an arc), then `EndHalf`
 *  holding `EndArc`, then `StartHalf` holding `StartArc`. */
export const CircularProgress = Object.assign(ReadyMade, {
    Root,
    Track: TrackPart,
    TrackEndHalf,
    TrackEndArc,
    TrackStartHalf,
    TrackStartArc,
    EndHalf,
    EndArc,
    StartHalf,
    StartArc,
});
