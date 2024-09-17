export type StateProperties = {
    container: { opacity?: `${number}%` };
    content: { opacity?: `${number}%` };
    stateLayer: { opacity?: `${number}%` };
};

export type BaseStateName =
    | "hovered"
    | "focused"
    | "pressed"
    | "dragged"
    | "disabled"
    | "selected"
    | "activated"
    | "enabled";

export type States<TCustomStateNames extends string = BaseStateName> = Record<
    TCustomStateNames | BaseStateName,
    StateProperties
>;
