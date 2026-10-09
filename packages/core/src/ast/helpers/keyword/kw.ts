// Shared keyword builder. Not re-exported from the barrel.
import type { KeywordNode } from "../../nodes";

/** Generic keyword builder. Each export infers its narrow literal (`kw("center")` is
 *  `KeywordNode<"center">`), assignable to every slot whose vocabulary includes that token
 *  (`KeywordNode` is covariant in `V`). So one `center` serves both `Keyword<AlignKeyword>`
 *  and `Keyword<TextAlignKeyword>`, while a slot still rejects a token outside its vocabulary.
 *  Reach for `literal` only for an off-baseline value. */
export const kw = <const V extends string>(value: V): KeywordNode<V> => ({
    type: "keyword",
    value,
});
