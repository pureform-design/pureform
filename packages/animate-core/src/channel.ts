/** A numeric channel derived from independently driven normalized clocks. Drivers lower the
 *  sum to their native arithmetic nodes; components never subscribe to per-frame values. */
export interface MotionChannel {
    readonly offset?: number;
    readonly terms?: readonly {
        readonly clock: string;
        readonly from: number;
        readonly to: number;
    }[];
}

/** A normalized repeating clock. Each platform lowers the portable curve to its driver. */
export interface MotionClock<Curve> {
    readonly duration: number;
    readonly easing: Curve;
    readonly enabled?: boolean;
}

/** Driver contract: values and hosts stay on their platform's execution path. */
export interface MotionTimeline<Value, Host> {
    readonly View: Host;
    readonly driver: "native" | "ui" | "js";
    value(channel: MotionChannel): Value;
}

/** Driver-neutral sampling, useful for geometry and driver parity checks. Missing clocks are
 *  at their first frame. */
export const channelAt = (
    channel: MotionChannel,
    clocks: Readonly<Record<string, number>>,
): number =>
    (channel.offset ?? 0) +
    (channel.terms ?? []).reduce(
        (sum, term) =>
            sum + term.from + (term.to - term.from) * (clocks[term.clock] ?? 0),
        0,
    );
