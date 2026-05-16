# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## What this is

ferx-site is the Quarto documentation website for the ferx R package. It documents features implemented in two sibling repos:

- `../ferx-r` — R package (user API, bundled examples, roxygen docs)
- `../ferx-core` — Rust engine (`.ferx` DSL, fit options, estimators)

**The site must accurately reflect the current state of both sibling repos.** When either repo changes, this site may need updating.

## Repository layout

```
examples/       # One .qmd per worked example (mirrors inst/examples/*.R in ferx-r)
articles/       # Long-form articles / how-tos
model-dsl/      # DSL reference pages (mirrors ferx-core docs/src/model-file/)
reference/      # Function reference (mirrors roxygen output from ferx-r)
learn/          # Tutorial pages
_quarto.yml     # Site nav — new pages must be registered here
```

## Keeping examples in sync with ferx-r and ferx-core

### Canonical source of truth for examples

| What | Where in ferx-r | Where in ferx-core |
|------|----------------|-------------------|
| R scripts | `inst/examples/*.R` | — |
| Model files | `inst/examples/models/*.ferx` | `examples/*.ferx` |
| Data files | `inst/examples/data/*.csv` | `data/*.csv` |
| Bundled names | `ferx_example()` registry in `R/example.R` | — |

### Audit procedure (run this before any PR that touches examples)

1. List all R scripts in ferx-r: `ls ../ferx-r/inst/examples/*.R`
2. List all site example pages: `ls examples/*.qmd`
3. Every R script should have a corresponding `.qmd` (filenames may differ — check content coverage, not just names)
4. List all `.ferx` models in ferx-core: `ls ../ferx-core/examples/*.ferx`
5. Every ferx-core model should appear in at least one site page or be documented as internal/test-only
6. Grep for `ferx_example("...")` calls across all `.qmd` files and verify each name resolves in `../ferx-r/R/example.R`
7. Check that every data file referenced in `.qmd` code blocks exists in `../ferx-r/inst/examples/data/`

### Example execution

All example `.qmd` pages use knitr R chunks that call `library(ferx)`. Before rendering:

1. Rebuild ferx-r (which compiles ferx-core Rust via Enzyme): `cd ../ferx-r && FERX_NO_AUTODIFF=1 R CMD INSTALL .`
2. Render a single page: `quarto render examples/<page>.qmd`
3. Render the full site: `quarto render`

Run examples on the local CPU build — do not assume outputs from a prior build are still valid after ferx-r or ferx-core changes.

### When ferx-r adds a new feature

- If a new R function is added: add or update the reference page and add an example `.qmd` if it has a user-facing workflow
- If a new `inst/examples/*.R` script is added: create a matching `examples/<name>.qmd` that runs the same workflow
- If a new bundled dataset or model is added: reference it via `ferx_example()` in the relevant example page

### When ferx-core adds a new DSL feature or fit option

- Update or add a page under `model-dsl/`
- If a new `.ferx` example is added to `ferx-core/examples/`, add a corresponding site example page

## Model DSL reference

The authoritative DSL spec is in `../ferx-core/docs/src/`. When updating `model-dsl/` pages, verify against the current ferx-core source — not this site's existing content, which may be stale.

## Pull Requests

When creating a PR in this repo, always read `.github/PULL_REQUEST_TEMPLATE.md` and fill every section before calling `gh pr create`.
