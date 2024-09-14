export type StateProperties = {
  container: { opacity?: `${number}%` };
  content: { opacity?: `${number}%` };
  stateLayer: { opacity?: `${number}%` };
};

export type BaseState =
  | "hovered"
  | "focused"
  | "pressed"
  | "dragged"
  | "disabled"
  | "selected"
  | "activated"
  | "enabled";

export type States<CustomStates extends string = BaseState> = Record<
  CustomStates | BaseState,
  StateProperties
>;
