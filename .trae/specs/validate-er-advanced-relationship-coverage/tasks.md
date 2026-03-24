# Tasks
- [x] Task 1: Audit current advanced relationship support coverage
  - [x] Identify existing checks for binary, ternary, multiple, self-relationship, and generalization behavior
  - [x] Map gaps across DSL parsing, diagram projection, logical model, and SQL generation

- [x] Task 2: Define expected cross-layer artifacts for each modeling construct
  - [x] Specify what must be asserted in diagram output for each construct
  - [x] Specify what must be asserted in logical model output for each construct
  - [x] Specify what must be asserted in SQL outputs for each construct

- [x] Task 3: Upgrade template models to exercise advanced constructs
  - [x] Update existing templates so each one uses at least one advanced modeling method
  - [x] Ensure collective template set covers binary, ternary, multiple, self-relationship, and generalization cases
  - [x] Keep all templates semantically valid

- [x] Task 4: Implement automated validation for end-to-end consistency
  - [x] Add or update tests that assert DSL-to-diagram consistency for required constructs
  - [x] Add or update tests that assert DSL-to-logical-model consistency for required constructs
  - [x] Add or update tests that assert DSL-to-SQL consistency for required constructs

- [x] Task 5: Validate template-driven generation across all targets
  - [x] Add checks that templates produce expected advanced-construct artifacts in diagram output
  - [x] Add checks that templates produce expected advanced-construct artifacts in logical model output
  - [x] Add checks that templates produce expected advanced-construct artifacts in MySQL and PostgreSQL outputs

- [x] Task 6: Run quality gates and close verification
  - [x] Run lint and targeted test suites for parser, projections, generators, and templates
  - [x] Resolve regressions and confirm deterministic outputs
  - [x] Update checklist with completed verification evidence

- [x] Task 7: Fix canvas rendering for self-relationships and generalizations
  - [x] Render self-relationships as visible loop connectors in DiagramCanvas
  - [x] Render generalization connectors between supertype and subtype entities in DiagramCanvas
  - [x] Add tests validating visual projection data used by canvas for both cases
  - [x] Re-run focused diagram, sync, and template tests to confirm no regression

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 2 and Task 3
- Task 5 depends on Task 3 and can run in parallel with Task 4 after Task 3
- Task 6 depends on Task 4 and Task 5
- Task 7 depends on Task 6
