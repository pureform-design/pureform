import { createAnatomy } from "@zag-js/anatomy";

export const anatomy = createAnatomy("slider").parts("root", "input");
export const parts = anatomy.build();
