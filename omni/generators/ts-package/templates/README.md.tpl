# {{ vars.full_package_name }}

{{ inputs.package_description }}

> Placeholder: say what the package is for, who uses it, and what it depends on, then keep the
> sections below in step with the package.

## Layout

At the package's root:

- `package.json`: the name, the version, {% if inputs.package_type == 'lib' or inputs.package_type == 'ui-lib' or (inputs.package_type == 'script' and inputs.script_can_be_used_as_lib) %}the `exports`, {% endif %}and the dependencies.
- `project.omni.yaml`: the omni project: the preset it extends, and which tasks are enabled.
- `vite.config.ts`: the package's Vite config, built on the shared one from `vite-config`.
- `tsconfig*.json`: the TypeScript configs of the sources, the Node config files, and the declarations.
{% if inputs.unit_test -%}
- `vitest.config.unit.ts`: the unit tests' Vitest config.
{% endif -%}
{% if inputs.component_test -%}
- `vitest.config.component.ts`: the component tests' Vitest config.
- `vitest.config.browser.ts`: the browser test environment: the Playwright provider, and where the framework's plugin goes.
{% endif -%}
{% if inputs.integration_test -%}
- `vitest.config.integration.ts`: the integration tests' Vitest config.
{% endif -%}
{% if inputs.package_type == 'e2e-tests' -%}
- `vitest.config.e2e.ts`: the end-to-end tests' Vitest config.
{% elif inputs.package_type == 'service-tests' -%}
- `vitest.config.service.ts`: the service tests' Vitest config.
{% endif %}
In `src/`:

{% if inputs.package_type == 'lib' or inputs.package_type == 'ui-lib' or inputs.package_type == 'script' -%}
- `index.ts`: the package's entry.
- `add.ts`: an example module. Replace it.
{% endif -%}
{% if inputs.package_type == 'script' -%}
- `cli/index.ts`: the command line entry (`bin`).
{% endif -%}
{% if inputs.unit_test -%}
- `add.spec.ts`: an example unit test. Unit tests sit next to the code they test.
{% endif -%}
{% if inputs.component_test -%}
- `add.component.spec.ts`: an example component test. Component tests sit next to the component they render.
{% endif -%}
{% if inputs.integration_test -%}
- `__tests__/`: integration tests.
{% endif -%}
{% if inputs.package_type == 'e2e-tests' or inputs.package_type == 'service-tests' -%}
- the tests.
{% endif %}
## Tasks

Run them with omni, for example `omni run test -p {{ vars.full_package_name }}`.

| Task | What it does |
| ---- | ------------ |
{% if inputs.package_type != 'e2e-tests' and inputs.package_type != 'service-tests' -%}
| `build` | Vite build into `dist/`. |
{% endif -%}
| `check` | Format, lint, and type checks. |
{% if inputs.unit_test -%}
| `test:unit` | Unit tests: `src/**/*.spec.*`. |
{% endif -%}
{% if inputs.component_test -%}
| `test:component` | Component tests: `src/**/*.component.spec.*`, real components rendered in Chromium. |
{% endif -%}
{% if inputs.integration_test -%}
| `test:integration` | Integration tests: `src/**/__tests__/**/*.spec.*`. |
{% endif -%}
{% if inputs.package_type == 'e2e-tests' -%}
| `test:e2e` | End-to-end tests: `src/**/*.e2e.test.*`. |
{% elif inputs.package_type == 'service-tests' -%}
| `test:service` | Service tests: `src/**/*.service.test.*`. |
{% endif -%}
{% if inputs.published -%}
| `publish` | Publish to the registry ({{ inputs.publish_access }}). |
{% endif %}
## Release

{% if inputs.release_group == 'core' -%}
Versioned with the core: one version, shared with every core package.
{% elif inputs.release_group == 'binding' -%}
A binding: its own version, peering on the core.
{% elif inputs.release_group == 'tooling' -%}
Internal tooling: its own version.
{% else -%}
Not released.
{% endif %}
