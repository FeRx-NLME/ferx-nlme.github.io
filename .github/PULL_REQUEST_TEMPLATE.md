<!-- Title format: type(scope): short description  [closes #N] -->
<!--
  type  : feat | fix | content | refactor | style
  scope : examples | articles | model-dsl | reference | learn | get-started | faq
  e.g.  : feat(examples): add IOV example page
-->

## Why
<!-- What prompted this change? Link to a ferx-r or ferx-core PR if this follows a code change. -->

## Cross-repo dependency
| Repo | PR | Status |
|------|----|--------|
| ferx-r | FeRx-NLME/ferx-r#___ | open / merged / not needed |
| ferx-core | FeRx-NLME/ferx-core#___ | open / merged / not needed |

## What changed
<!-- New pages, updated content, structural changes. -->

## Example audit
<!-- For changes to examples/ pages, verify coverage against both source repos. -->

### ferx-r coverage
- [ ] Every `inst/examples/*.R` script has a corresponding ferx-site example page (or is intentionally excluded — note why)
- [ ] Every `inst/examples/models/*.ferx` referenced in site pages exists at that path in ferx-r
- [ ] Every `inst/examples/data/*.csv` referenced in site pages exists in ferx-r

### ferx-core coverage
- [ ] Every `examples/*.ferx` in ferx-core is either covered by a site page or is an internal/test-only model (note which)

### Example execution (run locally on your CPU before marking ready for review)
- [ ] Installed ferx-r from local build: `cd ../ferx-r && FERX_NO_AUTODIFF=1 R CMD INSTALL .`
- [ ] All new or changed example `.qmd` pages render cleanly: `quarto render examples/<page>.qmd`
- [ ] Full site renders without error: `quarto render`
- [ ] No execution needed (style / structural / non-example change)

## Checklist
- [ ] Internal links and cross-references are valid
- [ ] `ferx_example("name")` calls in code blocks use names that exist in the current ferx-r bundle
- [ ] Any new page added to `_quarto.yml` navigation

## Reviewer hints
<!-- Where to focus. What can be skimmed. -->
