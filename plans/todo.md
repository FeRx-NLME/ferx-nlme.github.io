# ferx-site documentation TODO

## Model DSL

### Mu-referencing best practice
Document the canonical mu-reference form for individual parameters that include
covariate effects. The recommended pattern is:

```
CL = TVCL * exp(ETA_CL) * (WT / 70)^0.75
```

NOT:

```
CL = TVCL * (WT / 70)^0.75 * exp(ETA_CL)
```

**Why it matters:**
- `TVCL * exp(ETA_CL)` is the unambiguous mu-reference pair: in log-space,
  `ln(CL_i) = ln(TVCL) + ETA_CL_i + 0.75 * ln(WT/70)`.
- When the covariate sits between the theta and `exp(ETA)`, ferx's parser may
  not confidently detect the mu-reference and will emit a warning.
- Mathematically both forms are identical; the difference is whether the engine
  can exploit the explicit mu-reference for faster/more stable gradient
  computation (better linearisation expansion point in FOCEI).
- Rule of thumb: **theta * exp(eta) first, covariates as trailing multipliers.**

Suggested location: model-dsl page (individual_parameters section) and/or a
"Performance tips" article.

---

### Derived intermediates as ETA base show [custom] instead of [log-normal]

When a rate constant is derived from another parameter and then used as the base
of a log-normal ETA, `print()` shows `[custom]` and suppresses CV%:

```
KTR = 4.0 / TVMTT          # derived intermediate
KA  = KTR * exp(ETA_KA)    # parser does not recognise as log-normal
```

**Workaround to document:** use a dedicated theta for any parameter that carries IIV:

```
theta TVKA(4.0, 0.1, 20.0)
...
KA = TVKA * exp(ETA_KA)    # unambiguously log-normal
```

Document in the `[individual_parameters]` section: ETAs should always be
applied directly to a declared theta, not to a derived intermediate. This also
avoids tightly coupling two structural parameters (e.g. forcing KA = KTR at the
typical level, which is a strong assumption in transit absorption models).

Tracked in ferx-r issue #55. Fix on the engine side: resolve intermediates one
level deeper before classifying the ETA transform.

Suggested location: model-dsl page (individual_parameters section), with a
callout box warning.
