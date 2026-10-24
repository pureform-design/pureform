import { registry } from "../../.pureform";
import { reactDomAdapter } from "../react/adapter";

// The bundler plugin resolves `.pureform/` to the native target here (its `include` in
// `pureform.codegen.ts`): factories over React Native's generated styles, as an app gets them.
export const nativeAdapter = reactDomAdapter(
    "native",
    "React Native",
    registry,
);
