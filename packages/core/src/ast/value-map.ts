// Value-kind registry and the per-kind value map.
//
// The node types split into leaf values (concrete primitives) and reference values
// (indirection that resolves elsewhere). This module makes that split explicit so the
// style map can constrain each property to only the leaf kinds that make sense for it.

import type {
    AnimationNode,
    CalcNode,
    ColorMixNode,
    ColorNode,
    EasingNode,
    FilterNode,
    FontFamilyNode,
    FontVariationNode,
    GradientNode,
    KeywordNode,
    LiteralScalarNode,
    MathFnNode,
    NumericScalarNode,
    RefNode,
    ShadowNode,
    ShapeNode,
    TransformNode,
    TransitionNode,
} from "./nodes";

/** Concrete (leaf) value nodes, keyed by their `type` discriminant. This is the single
 *  registry of value kinds: every new leaf node adds its key here and immediately becomes
 *  referenceable from `StyleMap` through `ValueNodeMap`. */
export interface LeafNodeMap {
    literal: LiteralScalarNode;
    keyword: KeywordNode;
    numeric: NumericScalarNode;
    calc: CalcNode;
    mathFn: MathFnNode;
    color: ColorNode;
    colorMix: ColorMixNode;
    gradient: GradientNode;
    shadow: ShadowNode;
    transform: TransformNode;
    filter: FilterNode;
    shape: ShapeNode;
    transition: TransitionNode;
    animation: AnimationNode;
    easing: EasingNode;
    fontFamily: FontFamilyNode;
    fontVariation: FontVariationNode;
}

export type ValueKind = keyof LeafNodeMap;

/** Reference and indirection nodes. Defined in `nodes.ts` so composite-node fields can use
 *  it too, and re-exported here because `ValueNodeMap` folds it into every entry: a ref
 *  resolves to some value defined elsewhere, so it is valid wherever any concrete value is.
 *  Its resolved kind is checked at compile time, not by TypeScript, the one deliberate hole
 *  in kind-safety. */
export type { RefNode };

/** The map `StyleMap` indexes into. `ValueNodeMap[K]` is the leaf node(s) for kind `K` plus
 *  any reference node. Indexing with a union of kinds distributes, so a property can advertise
 *  several leaf kinds at once:
 *
 *      color: ValueNodeMap["color" | "gradient"] // ColorNode | GradientNode | RefNode
 *
 *  `ValueNodeMap[ValueKind]` is exactly `ValueNode` (the full union in `nodes.ts`). */
export type ValueNodeMap = { [K in ValueKind]: LeafNodeMap[K] | RefNode };
