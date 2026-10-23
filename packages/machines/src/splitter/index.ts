// Zag's splitter, re-exported so bindings take every machine from one package. It sizes panes in
// percent of the root, resized by dragging the divider between two or by the arrow keys on it
// (Shift for 10%, Home and End to the limits). Snapping a drag to anchors is the bindings'.

export * from "@zag-js/splitter";
export { anatomy, parts } from "./splitter.anatomy";
