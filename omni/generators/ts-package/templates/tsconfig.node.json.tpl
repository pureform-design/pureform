{
    "extends": ["@pureform/tsconfig/node.json"],
    "include": [
        "vite.config.ts",
        {% if inputs.unit_test %}
        "vitest.config.unit.ts"
        {% endif %}
    ]
}
