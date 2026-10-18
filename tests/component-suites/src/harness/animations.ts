// Waiting out the page's motion: an overlay entering or leaving, a state layer's fade.

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

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/** Waits out every animation that ends, then two frames for what follows its end (the
 *  `animationend` that lets a closing overlay hide). */
export const motionDone = async (): Promise<void> => {
    await animationsDone();
    await frame();
    await frame();
};
