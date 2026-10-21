// The theme's corner shape, applied to components: every style that rounds a corner also says
// how the corner curves, so one setting turns every rounded corner into a squircle or a bevel.
//
// When every theme shares a corner, it is written into the styles. When named themes differ,
// each rounded component gets a `corner` token instead, its styles read it, and each theme
// sets it, so the corner changes with the theme like any token.

import { alias, dynamic } from "@pureform/core/ast";
import type {
    CornerShapeKeyword,
    KeywordNode,
    RefNode,
    StyleMap,
} from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";

type AnySpec = CoreConfig["components"][string];

/** The token a rounded component reads its corner shape from, when themes differ. */
export const CORNER_TOKEN = "corner";

const RADIUS_KEYS = [
    "borderRadius",
    "borderTopLeftRadius",
    "borderTopRightRadius",
    "borderBottomLeftRadius",
    "borderBottomRightRadius",
    "borderStartStartRadius",
    "borderStartEndRadius",
    "borderEndStartRadius",
    "borderEndEndRadius",
];

/** A corner shape as a keyword value. */
export const cornerKeyword = (
    value: CornerShapeKeyword,
): KeywordNode<CornerShapeKeyword> => ({
    type: "keyword",
    value,
});

// Set the corner shape wherever a style rounds a corner, and note whether any did.
const shaped = (
    map: StyleMap,
    corner: KeywordNode<CornerShapeKeyword> | RefNode,
    found: { rounds: boolean },
): StyleMap => {
    // A style that sets its own corner shape keeps it: a geometry that must stay round.
    const rounds =
        RADIUS_KEYS.some((key) => key in map) && !("cornerShape" in map);
    if (rounds) found.rounds = true;
    const states = map.states
        ? Object.fromEntries(
              Object.entries(map.states).map(([state, styles]) => [
                  state,
                  shaped(styles as StyleMap, corner, found),
              ]),
          )
        : undefined;
    return {
        ...map,
        ...(rounds ? { cornerShape: corner } : {}),
        ...(states ? { states } : {}),
    };
};

const mapValues = <T, U>(record: Record<string, T>, map: (value: T) => U) =>
    Object.fromEntries(
        Object.entries(record).map(([key, value]) => [key, map(value)]),
    );

const mapStyles = <S extends AnySpec>(
    spec: S,
    apply: (map: StyleMap) => StyleMap,
): S => {
    if (spec.kind === "slotComponent") {
        const slots = (styles: Record<string, StyleMap>) =>
            mapValues(styles, apply);
        const { recipe } = spec;
        return {
            ...spec,
            recipe: {
                ...recipe,
                base: slots(recipe.base),
                ...(recipe.variants
                    ? {
                          variants: mapValues(recipe.variants, (values) =>
                              mapValues(values, slots),
                          ),
                      }
                    : {}),
                ...(recipe.compoundVariants
                    ? {
                          compoundVariants: recipe.compoundVariants.map(
                              (compound) => ({
                                  ...compound,
                                  style: slots(compound.style),
                              }),
                          ),
                      }
                    : {}),
            },
        };
    }
    const { recipe } = spec;
    return {
        ...spec,
        recipe: {
            ...recipe,
            base: apply(recipe.base),
            ...(recipe.variants
                ? {
                      variants: mapValues(recipe.variants, (values) =>
                          mapValues(values, apply),
                      ),
                  }
                : {}),
            ...(recipe.compoundVariants
                ? {
                      compoundVariants: recipe.compoundVariants.map(
                          (compound) => ({
                              ...compound,
                              style: apply(compound.style),
                          }),
                      ),
                  }
                : {}),
        },
    };
};

/** The component with `cornerShape` set wherever it rounds a corner. `round` changes
 *  nothing, since it is how corners curve already. */
export const withCorner = <S extends AnySpec>(
    spec: S,
    corner: CornerShapeKeyword = "round",
): S => {
    if (corner === "round") return spec;
    const value = cornerKeyword(corner);
    return mapStyles(spec, (map) => shaped(map, value, { rounds: false }));
};

/** The component reading its corner shape from a `corner` token, which defaults to `corner`,
 *  so a theme or an app can change it. A component that rounds no corner is returned as is,
 *  with no token. */
export const withCornerToken = <S extends AnySpec>(
    spec: S,
    corner: CornerShapeKeyword = "round",
): S => {
    const found = { rounds: false };
    const ref = alias("components", spec.name, CORNER_TOKEN);
    const mapped = mapStyles(spec, (map) => shaped(map, ref, found));
    if (!found.rounds) return spec;
    return {
        ...mapped,
        tokens: {
            ...spec.tokens,
            [CORNER_TOKEN]: dynamic(
                ["components", spec.name, CORNER_TOKEN],
                cornerKeyword(corner),
            ),
        },
    };
};
