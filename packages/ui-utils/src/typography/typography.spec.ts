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
                    fontFamily: "asd",
                    lineHeight: "asd",
                    fontSize: "asd",
                    letterSpacing: "asd",
                    fontWeight: "asd",
                },
            },
        });
        expect(t.get("asd")).toBeTruthy();
    });
});
