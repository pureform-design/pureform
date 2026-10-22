// Waiting out the page's motion: an overlay entering or leaving.

/** Waits for every animation and transition in the page that ends to end (an overlay entering),
 *  leaving those that run forever (indeterminate progress). */
export const animationsDone = async (): Promise<void> => {
    await Promise.all(
        document
            .getAnimations()
            .filter(
                (animation) =>
                    animation.effect?.getComputedTiming().endTime !== Infinity,
            )
            .map((animation) => animation.finished.catch(() => {})),
    );
};
