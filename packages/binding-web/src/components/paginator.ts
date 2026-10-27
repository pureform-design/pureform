/** A trigger's props from Zag's, when the whole paginator is disabled: the buttons are never
 *  enabled, whatever page it's on. */
export const paginatorTriggerProps = <P extends object>(
    props: P,
    disabled: boolean | undefined,
): P =>
    disabled ? ({ ...props, disabled: true, "data-disabled": "" } as P) : props;
