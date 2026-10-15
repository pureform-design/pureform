// A Vite plugin writing a config's Tailwind stylesheet to a file, since Tailwind's Vite plugin
// reads imports from disk, and serving the class name functions as `virtual:pureform/components`.
//
//   plugins: [pureformTailwind({ config, outFile: "src/pureform.gen.css" }), tailwindcss()]

import type { GenerateOptions } from "@pureform/css-adapter/build";
import type { PureformPluginOptions } from "@pureform/css-adapter/vite";
import { pureformPlugin } from "@pureform/css-adapter/vite";
import type { Plugin } from "vite";

import { compileTailwind } from "./tailwind";
import type { TailwindOptions } from "./tailwind";

export interface PureformTailwindOptions
    extends
        Omit<PureformPluginOptions, keyof GenerateOptions>,
        TailwindOptions,
        Pick<GenerateOptions, "transform" | "runtime"> {
    /** Where to write the stylesheet. It can be gitignored: the plugin writes it before the
     *  build starts. */
    outFile: string;
    /** The output format. Only `css` for now: Tailwind's plugin API can't keep the layers
     *  that order components below utilities. */
    format?: "css";
}

/** Write a config's Tailwind stylesheet to `outFile`, and serve its class name functions. */
export const pureformTailwind = (options: PureformTailwindOptions): Plugin =>
    pureformPlugin(
        { ...options, compile: (config) => compileTailwind(config, options) },
        { name: "pureform-tailwind", outFile: options.outFile },
    );
