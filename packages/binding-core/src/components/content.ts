// What ready-made components share about their content: whether a content prop is there to
// render, and the accessible name an icon-only component needs.

/** Whether a content prop is there to render: not `undefined`, `null`, or `false`. */
export const isPresent = (node: unknown): boolean =>
    node !== undefined && node !== null && node !== false;

/** The accessible name an icon-only component needs, since its icon is hidden: `aria-label` or
 *  `aria-labelledby`. */
export type IconOnlyName =
    | {
          readonly "aria-label": string;
          readonly "aria-labelledby"?: string | undefined;
      }
    | {
          readonly "aria-label"?: string | undefined;
          readonly "aria-labelledby": string;
      };

/** The development warning for an icon-only component with no accessible name. */
export const missingNameMessage = (component: string): string =>
    `pureform: ${component} shows only an icon, which is hidden from assistive technology. Name it with \`aria-label\` or \`aria-labelledby\`.`;

/** Whether props carry an accessible name for an icon-only component. */
export const hasAccessibleName = (props: object): boolean => {
    const named = props as {
        "aria-label"?: unknown;
        "aria-labelledby"?: unknown;
    };
    return Boolean(named["aria-label"] || named["aria-labelledby"]);
};

/** A machine's trigger props without `aria-controls` unless `controls` holds: a header (a tab,
 *  a step) with no content to point at. */
export const withoutControls = <P extends object>(
    props: P,
    controls: boolean,
): P => {
    if (controls) return props;
    const { "aria-controls": _controls, ...named } = props as P & {
        "aria-controls"?: unknown;
    };
    return named as unknown as P;
};
