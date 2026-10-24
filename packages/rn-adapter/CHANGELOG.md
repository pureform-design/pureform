# Changelog

All notable changes to this project will be documented in this file. See [conventional commits](https://www.conventionalcommits.org/) for commit guidelines.

- - -

## Unreleased

#### Breaking changes

- `withSetTokens(selected, selectFrom, where)` now takes the selection's `variants` and `state` in `where` (both required): it evaluates the tokens a selection sets together from their templates (`evaluateSetTokens`, also exported) and resolves the component once with them, instead of resolving again up to four times until they settle. Callers outside `@pureform/rn-adapter` pass the same `variants` and `state` they selected with. (r9a, `15581773`)

- - -
