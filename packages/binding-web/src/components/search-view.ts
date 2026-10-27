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
