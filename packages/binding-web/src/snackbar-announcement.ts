// Keep the live region exposed to accessibility while removing it from visual layout. Its text
// is inserted after mount; the animated surface must not itself announce a second time.
export const SNACKBAR_ANNOUNCEMENT_STYLE = {
    position: "absolute",
    width: "1px",
    height: "1px",
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
    pointerEvents: "none",
} as const;
