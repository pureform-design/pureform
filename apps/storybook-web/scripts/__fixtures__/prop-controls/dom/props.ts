// Attributes a binding adds, declared outside binding-core.

export interface DomProps {
    readonly title?: string;
    readonly hidden?: boolean;
    readonly as?: string;
    readonly children?: unknown;
}
