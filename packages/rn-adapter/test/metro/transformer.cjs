// The transformer from source, for Metro's workers, which load it with Node: jiti runs its
// TypeScript and its imports, so the test needs no build.
module.exports = require("jiti")(__filename)("../../src/metro-transformer.ts");
