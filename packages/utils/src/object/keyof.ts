export function keyOf<T extends Record<string, unknown>, K extends keyof T>(
    obj: T,
): K[] {
    return Object.keys(obj) as K[];
}
