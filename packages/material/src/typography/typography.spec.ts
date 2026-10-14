import { describe, expect, it } from "vitest";

import { Typography } from "./typography";

describe("Typography", () => {
    it("should be able to create a typography instance", () => {
        const t = Typography.create();

        expect(t).toBeTruthy();
    });

    it("should be able to get default typography styles", () => {
        const t = Typography.create();

        expect(t.get("displayLarge")).toBeTruthy();
        expect(t.get("displayMedium")).toBeTruthy();
        expect(t.get("displaySmall")).toBeTruthy();
        expect(t.get("headlineLarge")).toBeTruthy();
        expect(t.get("headlineMedium")).toBeTruthy();
        expect(t.get("headlineSmall")).toBeTruthy();
        expect(t.get("titleLarge")).toBeTruthy();
        expect(t.get("titleMedium")).toBeTruthy();
        expect(t.get("titleSmall")).toBeTruthy();
        expect(t.get("bodyLarge")).toBeTruthy();
        expect(t.get("bodyMedium")).toBeTruthy();
        expect(t.get("bodySmall")).toBeTruthy();
        expect(t.get("labelLarge")).toBeTruthy();
        expect(t.get("labelMedium")).toBeTruthy();
        expect(t.get("labelSmall")).toBeTruthy();
    });

    it("should be able to create a typography instance with custom options", () => {
        const t = Typography.create({
            custom: {
                asd: {
                    font: "plain",
                    lineHeight: "asd",
                    fontSize: "asd",
                    letterSpacing: "asd",
                    fontWeight: 400,
                },
            },
        });
        expect(t.get("asd")).toBeTruthy();
    });

    it("sets display, headline, and title in brand, body and label in plain", () => {
        const t = Typography.create();
        expect(t.get("titleSmall").font).toBe("brand");
        expect(t.get("bodyLarge").font).toBe("plain");
        expect(t.get("labelSmall").font).toBe("plain");
    });

    it("overrides a built-in font stack and keeps the other", () => {
        const t = Typography.create({
            fonts: { plain: { families: ["Inter"], generic: "system-ui" } },
        });
        expect(t.fonts.plain.families).toEqual(["Inter"]);
        expect(t.fonts.brand.families).toEqual(["Roboto"]);
    });

    it("adds font roles after the built-in ones", () => {
        const t = Typography.create({
            fonts: {
                mono: { families: ["JetBrains Mono"], generic: "monospace" },
            },
            custom: { labelSmall: { font: "mono" } },
        });
        expect(t.fontRoles).toEqual(["brand", "plain", "mono"]);
        expect(t.get("labelSmall").font).toBe("mono");
        expect(t.get("labelSmall").fontSize).toBe("0.6875rem");
    });
});
