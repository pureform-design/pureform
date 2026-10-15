// The theme's corner shape, applied to components: every style that rounds a corner also says
// how the corner curves, so one setting turns every rounded corner into a squircle or a bevel.

import type {
    CornerShapeKeyword,
    KeywordNode,
    StyleMap,
} from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";

type AnySpec = CoreConfig["components"][string];

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

const shaped = (map: StyleMap, corner: CornerShapeKeyword): StyleMap => {
    const rounds = RADIUS_KEYS.some((key) => key in map);
    const states = map.states
        ? Object.fromEntries(
              Object.entries(map.states).map(([state, styles]) => [
                  state,
                  shaped(styles as StyleMap, corner),
              ]),
          )
        : undefined;
    return {
        ...map,
        ...(rounds ? { cornerShape: keyword(corner) } : {}),
        ...(states ? { states } : {}),
    };
};

const keyword = (
    value: CornerShapeKeyword,
): KeywordNode<CornerShapeKeyword> => ({
    type: "keyword",
    value,
});

const mapValues = <T, U>(record: Record<string, T>, map: (value: T) => U) =>
    Object.fromEntries(
        Object.entries(record).map(([key, value]) => [key, map(value)]),
    );

/** The component with `cornerShape` set wherever it rounds a corner. `round` changes
 *  nothing, since it is how corners curve already. */
export const withCorner = <S extends AnySpec>(
    spec: S,
    corner: CornerShapeKeyword = "round",
): S => {
    if (corner === "round") return spec;
    const apply = (map: StyleMap) => shaped(map, corner);
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
