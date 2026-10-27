/** The attribute naming a part (`data-pf-part="label"`). */
export const PART_ATTRIBUTE = "data-pf-part";

/** The attribute naming the component a part belongs to. */
export const SCOPE_ATTRIBUTE = "data-scope";

/** The attribute holding a part's test id on the web. */
export const TEST_ID_ATTRIBUTE = "data-testid";

/** The attributes every part carries on the web. */
export interface PartAttributes {
    readonly [SCOPE_ATTRIBUTE]: string;
    readonly [PART_ATTRIBUTE]: string;
    readonly [TEST_ID_ATTRIBUTE]: string;
}
