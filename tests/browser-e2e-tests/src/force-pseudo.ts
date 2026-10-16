// Forcing pseudo-classes through the DevTools protocol, for states no attribute can set: focus
// matches only one element at a time, and the parity tests style every element in a state at
// once.

import { cdp } from "vitest/browser";

interface DomNode {
    nodeId: number;
    attributes?: string[];
    children?: DomNode[];
    contentDocument?: DomNode;
}

interface Session {
    send(method: string, params?: object): Promise<unknown>;
}

const find = (
    node: DomNode,
    test: (node: DomNode) => boolean,
): DomNode | undefined => {
    if (test(node)) return node;
    for (const child of [
        ...(node.children ?? []),
        ...(node.contentDocument ? [node.contentDocument] : []),
    ]) {
        const found = find(child, test);
        if (found) return found;
    }
    return undefined;
};

/** Force pseudo-classes (`focus-visible`, `focus-within`, …) on every element matching the
 *  selector inside the frame. The frame needs a unique `id`. */
export const forcePseudoClasses = async (
    frame: HTMLIFrameElement,
    selector: string,
    pseudoClasses: string[],
): Promise<void> => {
    const session = cdp() as unknown as Session;
    await session.send("DOM.enable");
    await session.send("CSS.enable");
    const { root } = (await session.send("DOM.getDocument", {
        depth: -1,
        pierce: true,
    })) as { root: DomNode };
    const host = find(root, ({ attributes = [] }) => {
        const index = attributes.indexOf("id");
        return (
            index >= 0 && index % 2 === 0 && attributes[index + 1] === frame.id
        );
    });
    const doc = host?.contentDocument;
    if (!doc) throw new Error(`no frame #${frame.id} in the DOM tree`);
    const { nodeIds } = (await session.send("DOM.querySelectorAll", {
        nodeId: doc.nodeId,
        selector,
    })) as { nodeIds: number[] };
    for (const nodeId of nodeIds) {
        await session.send("CSS.forcePseudoState", {
            nodeId,
            forcedPseudoClasses: pseudoClasses,
        });
    }
    // The state's transitions (color fades run even under reduced motion) finish at once, so
    // computed styles show the state rather than partway to it.
    for (const animation of frame.contentDocument?.getAnimations() ?? []) {
        if ("transitionProperty" in animation) animation.finish();
    }
};
