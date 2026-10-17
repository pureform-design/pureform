// Material's navigation bar and rail: pureform's own machine, in Zag's shape. The destinations
// are links or buttons, each reached with Tab; the current one is marked with `aria-current`.
export { anatomy } from "./navigation.anatomy";
export { connect } from "./navigation.connect";
export { machine } from "./navigation.machine";
export * from "./navigation.props";
export type {
    ElementIds,
    ItemProps,
    ItemState,
    NavigationApi as Api,
    NavigationMachine as Machine,
    NavigationProps as Props,
    NavigationSchema as Schema,
    NavigationService as Service,
    ValueChangeDetails,
} from "./navigation.types";
