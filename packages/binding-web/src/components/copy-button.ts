/** The live region that announces the copy: there to be read, not seen. Its keys are the same in
 *  React's and Solid's `style`. */
export const COPY_ANNOUNCEMENT_STYLE = {
    position: "absolute",
    width: "1px",
    height: "1px",
    margin: "-1px",
    padding: "0",
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    border: "0",
} as const;
