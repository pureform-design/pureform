#!/usr/bin/env node
// The `pureform` bin. Under Node on purpose, as Vite runs the bundler plugin: Bun evaluates some
// of the preset's values differently, which would change the output's hash.

import { main } from "../program";

process.exitCode = await main(process.argv.slice(2));
