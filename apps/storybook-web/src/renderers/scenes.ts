/** A tile of the grid list case's `tiles`: a picture, with a header and a footer when it has them. */
export interface SceneTile {
    readonly src: string;
    readonly header?: string;
    readonly footer?: string;
    readonly subhead?: string;
}
