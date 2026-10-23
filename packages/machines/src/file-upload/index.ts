// Zag's file upload, re-exported so bindings take every machine from one package, with the parts
// the preset draws. The dropzone takes a click or Enter and Space (opening the file dialog), a
// drop, and keyboard focus; the trigger opens the same dialog; the hidden input is reachable by
// keyboard through them. The machine keeps `acceptedFiles` and `rejectedFiles` (each with its
// errors); the app reports an upload's progress itself.

import type { Machine as ZagMachine } from "@zag-js/file-upload";

import type { SchemaOf } from "../interaction";

export * from "@zag-js/file-upload";
export { anatomy, parts } from "./file-upload.anatomy";

/** The machine's schema, for the props a binding or a test passes it. */
export type Schema = SchemaOf<ZagMachine>;
