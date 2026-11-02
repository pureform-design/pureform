{% if inputs.package_type == 'lib' or inputs.package_type == 'ui-lib' or inputs.package_type == 'script' -%}
export * from "./add";
{% endif %}
