/** A numeric channel derived from independently driven normalized clocks. Drivers lower the
 *  sum to their native arithmetic nodes; components never subscribe to per-frame values. */
export interface MotionChannel {
    readonly offset?: number;
    /** Angular channels are numeric until their driver lowers them to a transform value. */
    readonly unit?: "deg" | "rad";
    readonly terms?: readonly (
        | {
              readonly clock: string;
              readonly from: number;
              readonly to: number;
          }
        | {
              readonly clock: string;
              /** Ordered samples spanning 0..1. Curves can be baked here to share one linear clock. */
              readonly stops: readonly {
                  readonly offset: number;
                  readonly value: number;
              }[];
          }
    )[];
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
    (channel.terms ?? []).reduce((sum, term) => {
        const at = clocks[term.clock] ?? 0;
        if (!("stops" in term))
            return sum + term.from + (term.to - term.from) * at;
        const stops = term.stops;
        if (stops.length < 2)
            throw new Error(
                "pureform: a sampled channel needs at least two stops",
            );
        const index = Math.max(
            1,
            stops.findIndex((stop) => stop.offset >= at),
        );
        const end =
            at > stops[stops.length - 1]!.offset ? stops.length - 1 : index;
        const from = stops[end - 1]!;
        const to = stops[end]!;
        const t = Math.min(
            1,
            Math.max(0, (at - from.offset) / (to.offset - from.offset)),
        );
        return sum + from.value + (to.value - from.value) * t;
    }, 0);
