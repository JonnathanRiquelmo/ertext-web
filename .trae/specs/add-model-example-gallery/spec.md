# Model Example Gallery Spec

## Why
Users need fast onboarding and confidence that the modeling pipeline works end to end. A curated gallery of valid templates lets users instantly inspect DSL, diagram, logical schema, and generated SQL outputs without manual setup.

## What Changes
- Add a built-in list of semantically valid model templates available directly in the interface
- Add one-click loading for each template into the current workspace state
- Ensure each template materializes across all synchronized views (textual DSL, graphical diagram, and generated outputs)
- Provide initial templates for themes: university courses, social network, and artificial intelligence
- Define validation gates so only semantically correct templates can be shipped
- Add explicit correctness verification for generated diagrams of every shipped template
- Expand shipped templates to cover all currently supported DSL modeling features listed in `.trae/Features.md` table rows 13-32
- Add explicit feature-coverage assertions so regressions in template capability coverage fail automated validation

## Impact
- Affected specs: Template browsing, model loading workflow, sync projections, output generation visibility
- Affected code: UI template selector, template registry data, loading action/state flow, parser/validator integration tests, end-to-end example tests, diagram projection verification tests, template feature coverage tests

## ADDED Requirements
### Requirement: Built-in Template Gallery
The system SHALL provide a built-in template gallery in the interface containing semantically valid ERDSL examples.

#### Scenario: List templates in interface
- **WHEN** the user opens the template area
- **THEN** the system displays available templates with readable names and domain themes

### Requirement: One-Click Template Loading
The system SHALL allow users to load a selected template with a single action.

#### Scenario: Load selected template
- **WHEN** the user selects a template and triggers load
- **THEN** the textual editor is populated with the template DSL
- **AND** the diagram view reflects the same model through existing synchronization
- **AND** generated outputs are refreshed from the loaded model

### Requirement: Semantic Correctness of Shipped Templates
The system SHALL ship only templates that pass semantic validation and generation checks.

#### Scenario: Validate template quality
- **WHEN** automated validation runs for shipped templates
- **THEN** each template parses successfully
- **AND** semantic validation reports no blocking errors
- **AND** generation targets configured by default produce outputs successfully

### Requirement: Themed Starter Templates
The system SHALL include starter templates for university courses, social network, and artificial intelligence domains.

#### Scenario: View themed templates
- **WHEN** the user opens the template gallery
- **THEN** at least one template for each required domain is available for selection

### Requirement: Diagram Correctness Verification for Templates
The system SHALL verify that each shipped template generates a diagram projection with the expected semantic structure.

#### Scenario: Verify generated diagram projection
- **WHEN** automated verification runs for each shipped template
- **THEN** the projected diagram contains expected entities and relationships for that template
- **AND** relationship participants and cardinalities are consistent with the template DSL

### Requirement: DSL Feature Coverage by Templates
The system SHALL provide template content that collectively exercises every DSL modeling feature marked as supported in `.trae/Features.md` rows 13-32.

#### Scenario: Verify supported feature coverage
- **WHEN** automated coverage validation runs against shipped templates
- **THEN** every supported feature in the reference table is mapped to at least one template example
- **AND** unsupported features are not required by this coverage gate

### Requirement: Generator Coverage from Templates
The system SHALL ensure templates demonstrate all supported generation targets from the same DSL set.

#### Scenario: Verify generator target coverage
- **WHEN** generation validation runs for shipped templates
- **THEN** supported targets for conceptual diagram, logical model, MySQL, and PostgreSQL are exercised successfully
- **AND** target-specific outputs remain semantically aligned with loaded template models

## MODIFIED Requirements
### Requirement: Initial User Workflow
The system SHALL include template-first onboarding by exposing the gallery in the primary modeling workflow without removing manual modeling capabilities.

## REMOVED Requirements
### Requirement: None
**Reason**: No existing requirement is removed by this change.
**Migration**: No migration is required.
