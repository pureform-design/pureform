import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, rmdir } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { tempRoot } from "./__fixtures__/project";
import { withOutputLock } from "./output-lock";

describe("output lock", () => {
    it("times out without deleting another owner's lock", async () => {
        const output = join(tempRoot(), ".pureform");
        const lock = `${output}.pureform-lock`;
        await mkdir(lock);
        const now = vi
            .spyOn(Date, "now")
            .mockReturnValueOnce(0)
            .mockReturnValue(30_001);
        const run = vi.fn<() => Promise<void>>(async () => {});
        try {
            await expect(withOutputLock(output, run)).rejects.toMatchObject({
                code: "output-lock",
            });
            expect(run).not.toHaveBeenCalled();
            await expect(mkdir(lock)).rejects.toMatchObject({ code: "EEXIST" });
        } finally {
            now.mockRestore();
            await rmdir(lock);
        }
    });

    it("honors output ownership held by another process", async () => {
        const output = join(tempRoot(), ".pureform");
        const child = spawn(
            process.execPath,
            [
                "--input-type=module",
                "-e",
                `
            import { mkdir, rmdir } from "node:fs/promises";
            const lock = ${JSON.stringify(`${output}.pureform-lock`)};
            await mkdir(lock);
            try {
                process.stdout.write("owned\\n");
                await new Promise(resolve => process.stdin.once("data", resolve));
            } finally { await rmdir(lock); }
        `,
            ],
            { stdio: ["pipe", "pipe", "pipe"] },
        );
        const exited = once(child, "exit");
        let waiting: Promise<void> | undefined;
        let entered = false;
        try {
            await once(child.stdout, "data");
            waiting = withOutputLock(output, async () => {
                entered = true;
            });
            await withOutputLock(`${output}-other`, async () => {
                expect(entered).toBe(false);
            });
        } finally {
            child.stdin.end("release");
            const [code] = await exited;
            expect(code).toBe(0);
            await waiting;
        }
        expect(entered).toBe(true);
    });

    it("releases ownership after a failed run", async () => {
        const output = join(tempRoot(), ".pureform");
        await expect(
            withOutputLock(output, async () => {
                throw new Error("failed");
            }),
        ).rejects.toThrow("failed");
        await expect(
            withOutputLock(output, async () => "retried"),
        ).resolves.toBe("retried");
    });

    it("waits for a filesystem owner without blocking an unrelated output", async () => {
        const root = tempRoot();
        const output = join(root, ".pureform");
        const lock = `${output}.pureform-lock`;
        await mkdir(lock);
        let entered = false;
        const waiting = withOutputLock(output, async () => {
            entered = true;
        });
        try {
            await withOutputLock(join(root, "other"), async () => {
                expect(entered).toBe(false);
            });
        } finally {
            await rmdir(lock);
            await waiting;
        }
        expect(entered).toBe(true);
    });
});
