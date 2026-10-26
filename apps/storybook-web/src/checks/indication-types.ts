// Storybook type-checks the web and React Native bindings in one program. Importing
// `@pureform/binding-web/indication` must not retype React Native's indication elements, so an
// indication written for each platform and a platform-neutral one all type-check together.

import type { Indication as CoreIndication } from "@pureform/binding-core/indication";
import type {
    Indication as DomIndication,
    IndicationTarget as DomTarget,
} from "@pureform/binding-web/indication";
import type { Indication as NativeIndication } from "@pureform/react-native";

type Equal<A, B> =
    (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
        ? true
        : false;
const assert = <_T extends true>() => undefined;

// Each platform keeps its own element type.
assert<Equal<DomTarget["surface"], HTMLElement>>();
assert<
    Equal<
        Parameters<NonNullable<NativeIndication["web"]>>[0]["surface"],
        unknown
    >
>();

// The neutral one is the same for both, and each fits where core's `Indication` is taken.
export const neutral: CoreIndication = { name: "neutral" };
export const dom: DomIndication = neutral;
export const native: NativeIndication = neutral;
export const asCoreFromDom: CoreIndication = dom;
export const asCoreFromNative: CoreIndication = native;
