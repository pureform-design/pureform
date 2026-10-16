// The build step the bundler plugin and the CLI share: load `pureform.config.ts`, ask the target's
// adapter for its factory modules, and write `.pureform/`. Adapters implement the codegen
// interface below in their `/codegen` subpath.

export { defineCodegen, TARGET_PACKAGES } from "./adapter";
export type {
    CodegenAdapter,
    CodegenContext,
    CodegenOutput,
    ComponentModule,
    ComponentShape,
    GeneratedFile,
    Platform,
    Target,
} from "./adapter";
export { componentShape } from "./shape";
