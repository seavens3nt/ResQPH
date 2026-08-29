# Data workspace

Use this workspace for dataset metadata, small test samples, and documented transformations.

- `raw/` contains untouched source data and is ignored by Git.
- `interim/` contains intermediate outputs and is ignored by Git.
- `processed/` contains generated application-ready data and is ignored by Git.
- `samples/` contains small, non-sensitive fixtures suitable for tests.
- `metadata/` records sources, licenses, coverage, coordinate reference systems, and limitations.

Do not commit large road, flood, elevation, or rainfall datasets directly to ordinary Git history.
