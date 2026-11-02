import { describe, expect, it } from "vitest";

import { PureformProvider, ProvidedTokens } from ".";
import { providedTokensRegistry } from "./__fixtures__/registry";
import { IconButton } from "./icon-button";
import { byTestId, mount } from "./testing/mount";

const accent = (testId: string) =>
    byTestId(`${testId}-root`).style.getPropertyValue("--accent");

describe("ProvidedTokens", () => {
    it("gives a nested component its tokens, under the component's own, the nearest winning", async () => {
        mount(() => (
            <PureformProvider registry={providedTokensRegistry()}>
                <IconButton aria-label="Plain" icon="A" testId="plain" />
                <ProvidedTokens tokens={{ iconButton: { accent: "red" } }}>
                    <IconButton aria-label="P" icon="P" testId="provided" />
                    <IconButton
                        aria-label="T"
                        icon="T"
                        tokens={{ accent: "green" }}
                        testId="instance"
                    />
                    <ProvidedTokens tokens={{ iconButton: { accent: "blue" } }}>
                        <IconButton aria-label="N" icon="N" testId="nearest" />
                    </ProvidedTokens>
                </ProvidedTokens>
            </PureformProvider>
        ));
        expect(accent("plain")).toBe("");
        expect(accent("provided")).toBe("red");
        expect(accent("instance")).toBe("green");
        expect(accent("nearest")).toBe("blue");
    });
});
