export function capitalize<S extends string>(str: S): Capitalize<S> {
    return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<S>;
}

export function lowerFirst<S extends string>(str: S): Lowercase<S> {
    return (str.charAt(0).toLowerCase() + str.slice(1)) as Lowercase<S>;
}
