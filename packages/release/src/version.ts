function escape(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Sets a package.json's top-level `version`, keeping the rest of the text as it is.
 */
export function setManifestVersion(manifest: string, version: string): string {
    const parsed = JSON.parse(manifest) as { version?: unknown };
    if (typeof parsed.version !== "string")
        throw new Error("package.json has no version");

    const updated = manifest.replace(
        /^(\s*"version"\s*:\s*")[^"]*(")/m,
        (_, before: string, after: string) => `${before}${version}${after}`,
    );
    if ((JSON.parse(updated) as { version?: unknown }).version !== version) {
        throw new Error(
            "the first version field in package.json isn't the top-level one",
        );
    }
    return updated;
}

/**
 * Sets a workspace's `version` in bun.lock, keeping the rest of the lockfile as it is.
 * Returns the lockfile unchanged when the workspace records no version.
 */
export function setLockVersion(
    lock: string,
    path: string,
    version: string,
): string {
    const workspace = new RegExp(
        `("${escape(path)}": \\{\\s*\\n\\s*"name": "[^"]*",\\s*\\n\\s*"version": ")[^"]*(")`,
    );
    return lock.replace(
        workspace,
        (_, before: string, after: string) => `${before}${version}${after}`,
    );
}
