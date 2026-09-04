# results/

The conformance runs the [parity manifests](../parity/) are claims about. A manifest says which fixtures an
implementation does not pass; the run beside it is what that claim was read off, so a reader can check it rather than
take it.

One directory per implementation and version, `<implementation>-<version>/`, each holding:

| File | |
|---|---|
| `results.json` | The machine-readable run — one entry per fixture, its outcome, and on a failure every stated fact that did not hold. Validates against [`../results.schema.json`](../results.schema.json). |
| `README.md` | The provenance: which driver, which release, which protocol ref, when, and the totals. A run with no provenance is not evidence. |
| `ORACLE-RUN.md` | Present when the run was read against [`../ORACLE.md`](../ORACLE.md): for each fixture the negative oracle lists, whether it failed and whether the failure is the defect that was recorded. |

| Run | |
|---|---|
| [`dotnet-1.0.0-beta.1/`](dotnet-1.0.0-beta.1/) | The first run of any driver against any implementation — [Sakwala/affiant](https://github.com/Sakwala/affiant)'s .NET packages at `1.0.0-beta.1`, 2026-09-04. 63 fixtures run, 3 passed, 60 failed. All 19 oracle fixtures failed. |

A run directory is a record of one run at one moment and is not updated in place: a later run against a later release is
published as a new directory beside it. The lint validates every `results.json` here against the result schema, checks
that every fixture id it reports is one the conformance index lists, and asserts that a run and the manifest about the
same implementation and version agree on the failing set exactly.
