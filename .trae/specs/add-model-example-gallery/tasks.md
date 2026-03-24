# Tasks
- [x] Task 1: Define the template gallery domain contract and data source
  - [x] Add template metadata and content structure for UI listing and loading
  - [x] Register themed templates (university courses, social network, artificial intelligence)
  - [x] Ensure template declarations are centralized and reusable by UI and tests

- [x] Task 2: Implement template gallery UI with direct access
  - [x] Add a visible template selector entry point in the main interface
  - [x] Render template options with clear names and theme labels
  - [x] Provide a single-action control to load the selected template

- [x] Task 3: Integrate loading flow with synchronized projections
  - [x] Route template loading through the existing state/sync pipeline
  - [x] Populate textual DSL editor from selected template content
  - [x] Trigger diagram and generated output refresh from the same loaded model state

- [x] Task 4: Validate semantic correctness and generation for all templates
  - [x] Add automated checks that parse and semantically validate each template
  - [x] Add generation checks for default targets to ensure successful output creation
  - [x] Fail validation when any shipped template is invalid

- [x] Task 5: Add user-facing verification for example loading
  - [x] Add or update end-to-end coverage for selecting and loading templates from UI
  - [x] Assert textual, graphical, and generated outputs are all updated after loading
  - [x] Run project validation suite and confirm no regressions

- [x] Task 6: Verify generated diagram correctness for every template
  - [x] Add automated checks for expected entities and relationships by template
  - [x] Validate relationship participants and cardinalities in projected diagrams
  - [x] Run validation suite ensuring diagram checks pass without regressions

- [x] Task 7: Expand templates to cover supported DSL feature matrix
  - [x] Audit `.trae/Features.md` rows 13-32 and extract supported modeling features
  - [x] Update existing templates or add focused templates to cover all supported features
  - [x] Keep all template DSLs semantically valid after feature expansion

- [x] Task 8: Add automated feature-coverage validation for templates
  - [x] Encode a feature-to-template coverage map for supported DSL capabilities
  - [x] Add tests that fail when any supported feature is not represented
  - [x] Add generator target coverage checks for diagram, logical model, MySQL, and PostgreSQL

- [x] Task 9: Re-verify gallery loading and synchronization after template expansion
  - [x] Validate template loading still updates textual DSL, diagram, and outputs consistently
  - [x] Re-run semantic, diagram, and generation validation for all templates
  - [x] Run lint, tests, and build to confirm no regressions

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1 and Task 2
- Task 4 depends on Task 1 and can run in parallel with Task 2
- Task 5 depends on Task 3 and Task 4
- Task 6 depends on Task 1 and Task 3
- Task 7 depends on Task 1
- Task 8 depends on Task 7
- Task 9 depends on Task 7 and Task 8
