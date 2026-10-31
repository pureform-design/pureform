{
    "extends": ["@{{ vars.scope_name }}/tsconfig/node.json"],
    "include": [
        "vite.config.ts"
        {% if inputs.unit_test %}
        , "vitest.config.unit.ts"
        {% endif %}
        {% if inputs.component_test %}
        , "vitest.config.component.ts"
        {% endif %}
    ]
}
