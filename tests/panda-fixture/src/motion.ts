// Application utilities, not recipes: exercise Panda's public motion conditions too.
import { css } from "../styled-system/css";

export const motionSafe = css({ opacity: 0, _motionSafe: { opacity: 1 } });
export const motionReduce = css({ opacity: 0, _motionReduce: { opacity: 1 } });
