import { pureform } from "@pureform/preset";

// Precomputed while Metro bundles: the button's styles, in the light scheme.
import { precompute } from "../../src/index";

export default precompute(pureform(), {
    components: ["button"],
    schemes: ["light"],
});
