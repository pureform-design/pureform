// What withPureform hands pureform's Metro transformer, apart from both so neither bundles the
// other.

/** Where `withPureform` tells the transformer, in Metro's workers, what it needs. */
export const OPTIONS_ENV = "PUREFORM_METRO";

/** What the transformer reads from the environment. */
export interface TransformerOptions {
    /** The Babel transformer pureform's runs every other file through. */
    upstream: string;
    /** Absolute paths whose contents key the cache. */
    watch: string[];
}
