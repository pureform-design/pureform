// The media: a picture (an `<img>`) or a video (`as="video"`) that fills its container's width at
// an aspect ratio, cropped to fill. Its `src` and `alt` are the element's own.

import { mediaAnatomy } from "@pureform/anatomy";
import { MEDIA_ROOT_PROPS, mediaSelection } from "@pureform/binding-core";
import type { MediaRootOwnProps } from "@pureform/binding-core";
import type { JSX, ValidComponent } from "@solidjs/web";

import { createSinglePart } from "../single-part";

/** The element props media takes: a picture's, and a video's. */
type MediaElementProps = JSX.ImgHTMLAttributes<HTMLElement> &
    JSX.VideoHTMLAttributes<HTMLElement>;

/** The media's props: the variants and tokens, `testId`, `unstyled`, `as`, and the element's own
 *  props. */
export type MediaProps = Omit<MediaElementProps, keyof MediaRootOwnProps> &
    MediaRootOwnProps & {
        /** Another element or component to render instead of `<img>`: `"video"`. */
        readonly as?: ValidComponent | undefined;
    };

const Root = createSinglePart({
    anatomy: mediaAnatomy,
    element: (_props: MediaProps) => "img",
    ownProps: MEDIA_ROOT_PROPS,
    selection: mediaSelection,
});

/** Material's media: `<Media src="/beach.jpg" alt="" aspect="landscape" />`. Give it alt text, or
 *  an empty `alt` when decorative. */
export const Media: ((props: MediaProps) => JSX.Element) & {
    readonly Root: (props: MediaProps) => JSX.Element;
} = Object.assign(Root, { Root });
