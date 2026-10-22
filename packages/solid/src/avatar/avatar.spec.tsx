// The single-part components: Root is the whole component.

import { testIds } from "@pureform/anatomy";
import { describe, expect, it, vi } from "vitest";

import { Avatar } from ".";
import { PureformProvider } from "..";
import { displayRegistry } from "../__fixtures__/registry";
import { Badge } from "../badge";
import { Icon } from "../icon";
import { Media } from "../media";
import { Scrim } from "../scrim";
import { Separator } from "../separator";
import { SupportingText } from "../supporting-text";
import { byTestId, mount, settle, until } from "../testing/mount";
import { Text } from "../text";
import { TouchTarget } from "../touch-target";

const GIF =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const withRegistry = (view: () => unknown) =>
    mount(() => (
        <PureformProvider registry={displayRegistry()}>
            {view() as never}
        </PureformProvider>
    ));

describe("Avatar", () => {
    it("shows its fallback until the picture loads, then the picture", async () => {
        withRegistry(() => (
            <Avatar src={GIF} label="Ada Lovelace" size="large">
                AL
            </Avatar>
        ));
        await settle();
        const root = byTestId(testIds.avatar.root);
        expect(root.tagName).toBe("SPAN");
        expect(root.getAttribute("role")).toBe("img");
        expect(root.getAttribute("aria-label")).toBe("Ada Lovelace");
        expect(root.className).toBe("avatar avatar--size-large");
        const image = byTestId<HTMLImageElement>(testIds.avatar.image);
        expect(image.className).toBe("avatar__image");
        expect(image.alt).toBe("");
        const fallback = byTestId(testIds.avatar.fallback);
        expect(fallback.textContent).toBe("AL");
        // A one pixel gif: it loads.
        await until(() => expect(image.hidden).toBe(false));
        expect(fallback.hidden).toBe(true);
    });

    it("keeps its fallback when the picture fails", async () => {
        const onStatusChange = vi.fn();
        withRegistry(() => (
            <Avatar
                src="/missing-avatar.png"
                label="Ada"
                onStatusChange={onStatusChange}
            >
                AL
            </Avatar>
        ));
        await until(() =>
            expect(onStatusChange).toHaveBeenCalledWith({ status: "error" }),
        );
        expect(byTestId(testIds.avatar.image).hidden).toBe(true);
        expect(byTestId(testIds.avatar.fallback).hidden).toBe(false);
    });

    it("is a named image of its children without a picture", async () => {
        withRegistry(() => <Avatar label="Ada Lovelace">AL</Avatar>);
        await settle();
        const root = byTestId(testIds.avatar.root);
        expect(root.tagName).toBe("SPAN");
        expect(root.getAttribute("role")).toBe("img");
        expect(root.getAttribute("aria-label")).toBe("Ada Lovelace");
        expect(root.textContent).toBe("AL");
        expect(
            document.querySelector(`[data-testid="${testIds.avatar.image}"]`),
        ).toBeNull();
    });

    it("is hidden from assistive technology without a label", async () => {
        withRegistry(() => <Avatar>AL</Avatar>);
        await settle();
        expect(byTestId(testIds.avatar.root).getAttribute("aria-hidden")).toBe(
            "true",
        );
    });
});

describe("Badge", () => {
    it("is its count in the registry's classes, anchored when asked", async () => {
        withRegistry(() => <Badge placement="anchored">3</Badge>);
        await settle();
        const root = byTestId(testIds.badge.root);
        expect(root.tagName).toBe("SPAN");
        expect(root.textContent).toBe("3");
        expect(root.className).toBe("badge badge--placement-anchored");
    });

    it("is a hidden dot without a label, a named image with one", async () => {
        withRegistry(() => (
            <>
                <Badge size="small" />
                <Badge label="3 unread">3</Badge>
            </>
        ));
        await settle();
        const [dot, named] = document.querySelectorAll(
            `[data-testid="${testIds.badge.root}"]`,
        );
        expect(dot?.getAttribute("aria-hidden")).toBe("true");
        expect(named?.getAttribute("role")).toBe("img");
        expect(named?.getAttribute("aria-label")).toBe("3 unread");
    });
});

describe("the other single-part components", () => {
    it("render their element with the registry's classes and their own props", async () => {
        withRegistry(() => (
            <>
                <Media src="data:," alt="" aspect="square" />
                <Separator inset="middle" />
                <Scrim />
                <SupportingText tone="error" id="hint">
                    Required
                </SupportingText>
                <Text textStyle="titleLarge" as="h2" class="extra">
                    Inbox
                </Text>
                <Icon label="Done" mirror size="small">
                    ✓
                </Icon>
                <TouchTarget />
            </>
        ));
        await settle();
        const media = byTestId(testIds.media.root);
        expect(media.tagName).toBe("IMG");
        expect(media.className).toBe("media media--aspect-square");
        const separator = byTestId(testIds.separator.root);
        expect(separator.tagName).toBe("HR");
        expect(separator.className).toBe("separator separator--inset-middle");
        expect(byTestId(testIds.scrim.root).getAttribute("aria-hidden")).toBe(
            "true",
        );
        const supporting = byTestId(testIds.supportingText.root);
        expect(supporting.id).toBe("hint");
        expect(supporting.className).toBe(
            "supporting-text supporting-text--tone-error",
        );
        const text = byTestId(testIds.text.root);
        expect(text.tagName).toBe("H2");
        expect(text.className).toBe("text text--style-titleLarge extra");
        expect(text.hasAttribute("textstyle")).toBe(false);
        const icon = byTestId(testIds.icon.root);
        expect(icon.getAttribute("role")).toBe("img");
        expect(icon.getAttribute("aria-label")).toBe("Done");
        expect(icon.hasAttribute("data-pf-mirror")).toBe(true);
        expect(
            byTestId(testIds.touchTarget.root).getAttribute("aria-hidden"),
        ).toBe("true");
    });
});
