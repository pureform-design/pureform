// The Zag packages the machines depend on, for a browser test's `optimizeDeps.include`. Read from the
// machines' own dependencies, so a new machine is pre-bundled too: Vite would otherwise find it
// mid-run, reload the page, and leave two copies of React ("Invalid hook call").

import { createRequire } from "node:module";

const machines = createRequire(import.meta.url)(
    "../../machines/package.json",
) as { dependencies: Record<string, string> };

export interface ZagOptimizeOptions {
    /** The packages to resolve it through, outermost first: `["@pureform/react",
     *  "@pureform/machines"]` for a package that gets the machines from the React binding. Left
     *  out: the bare package name, for a project that depends on Zag itself. */
    via?: readonly string[];
    /** Zag packages (without `@zag-js/`) to leave out, for those a project lists by its own. */
    except?: readonly string[];
}

export const zagOptimizeDeps = ({
    via = [],
    except = [],
}: ZagOptimizeOptions = {}): string[] =>
    Object.keys(machines.dependencies)
        .filter((name) => name.startsWith("@zag-js/"))
        .filter((name) => !except.includes(name.slice("@zag-js/".length)))
        .map((name) => [...via, name].join(" > "));
