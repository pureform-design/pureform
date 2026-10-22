// Waiting out the page's motion: an overlay entering or leaving, a state layer's fade.

import { animationsDone } from "@pureform/component-cases";

export { animationsDone };

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/** Waits out every animation that ends, then two frames for what follows its end (the
 *  `animationend` that lets a closing overlay hide). */
export const motionDone = async (): Promise<void> => {
    await animationsDone();
    await frame();
    await frame();
};
