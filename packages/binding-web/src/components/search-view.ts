/** Where the positioner puts the view: over the viewport for `fullScreen`; at the top of Root,
 *  over the search bar's place, for `docked` and `contained`. Hidden once the view is gone. */
export const searchViewPositionerLayout = (
    variant: string | undefined,
    present: boolean,
) => ({
    hidden: !present,
    style:
        variant === "docked" || variant === "contained"
            ? ({
                  position: "absolute",
                  top: "0",
                  left: "0",
                  right: "0",
                  display: "flex",
                  boxSizing: "border-box",
              } as const)
            : ({
                  position: "fixed",
                  inset: "0",
                  display: "flex",
                  alignItems: "stretch",
                  boxSizing: "border-box",
              } as const),
});

/** Makes the dropped view (`docked` or `contained`) as wide as the search bar's trigger, and
 *  keeps it there while the trigger resizes: the positioner spans Root, but the bar may stop
 *  short of it (its `maxWidth`). Placed by the trigger's own offset, so it holds under `rtl`.
 *  Returns what stops following and restores the positioner's span. */
export const followTriggerWidth = (
    trigger: HTMLElement,
    positioner: HTMLElement,
): (() => void) => {
    const place = () => {
        positioner.style.left = `${trigger.offsetLeft}px`;
        positioner.style.right = "auto";
        positioner.style.width = `${trigger.offsetWidth}px`;
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(trigger);
    return () => {
        observer.disconnect();
        positioner.style.left = "0";
        positioner.style.right = "0";
        positioner.style.width = "";
    };
};

/** Root's own layout: positioned, so a docked view drops over the search bar inside it. */
export const SEARCH_VIEW_ROOT_STYLE = { position: "relative" } as const;
/** The web's trigger, a native `<button>` around the search bar: none of the button's own look,
 *  laid out as the block the bar was. */
export const SEARCH_VIEW_TRIGGER_STYLE = {
    display: "block",
    boxSizing: "border-box",
    width: "100%",
    margin: "0",
    padding: "0",
    border: "0",
    background: "none",
    font: "inherit",
    color: "inherit",
    textAlign: "inherit",
    cursor: "pointer",
} as const;

/** Only the bar's sizing and token vars belong on its hit target, not its padding or paint. */
export const searchViewBarSizing = (
    style: unknown,
): Record<string, string | number> =>
    style && typeof style === "object"
        ? Object.fromEntries(
              Object.entries(style).filter(
                  ([key, value]) =>
                      (key.startsWith("--") ||
                          [
                              "width",
                              "minWidth",
                              "maxWidth",
                              "min-width",
                              "max-width",
                          ].includes(key)) &&
                      (typeof value === "string" || typeof value === "number"),
              ),
          )
        : {};
