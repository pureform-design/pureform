/* @refresh reload */
import { render } from "solid-js/web";

import "~/app.css";
import { App } from "./app";

const root = document.getElementById("root");

// biome-ignore lint/style/noNonNullAssertion: <explanation>
render(() => <App />, root!);
