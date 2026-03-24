# Advanced ER Relationship Coverage Spec

## Why
Current support exists for several advanced ER modeling constructs, but we need explicit end-to-end verification that they remain consistent across all projections. This change formalizes coverage for binary, ternary, multiple relationships, generalization, and self-relationships in DSL, diagram, logical model, and SQL outputs.

## What Changes
- Add explicit verification requirements for binary, ternary, and multiple relationships across all model projections.
- Add explicit verification requirements for generalization between entities and self-relationships across all model projections.
- Strengthen template models so each template exercises at least one advanced modeling pattern and the whole set covers all required patterns.
- Extend automated validations to assert consistency from DSL parsing through diagram projection, logical transformation, and SQL generation.

## Impact
- Affected specs: ERDSL grammar/semantics, diagram projection, conceptual-to-logical transformation, SQL generation, template gallery validation.
- Affected code: parser/semantic validation modules, diagram projection/editor modules, logical model transformation modules, SQL generator modules, template model definitions, template validation tests.

## ADDED Requirements
### Requirement: End-to-End Advanced Relationship Consistency
The system SHALL preserve semantic meaning for binary, ternary, and multiple relationships from DSL through diagram, logical model, and SQL outputs.

#### Scenario: Binary relationship consistency
- **WHEN** a valid DSL model declares a binary relationship
- **THEN** the diagram projection shows exactly two participants with matching cardinalities
- **AND** the logical model contains the expected relationship mapping
- **AND** generated SQL for supported targets includes the expected relational structures

#### Scenario: Ternary relationship consistency
- **WHEN** a valid DSL model declares a ternary relationship
- **THEN** the diagram projection shows exactly three participants with matching cardinalities
- **AND** the logical model contains the expected ternary mapping
- **AND** generated SQL for supported targets includes equivalent structures for the ternary mapping

#### Scenario: Multiple relationships consistency
- **WHEN** a valid DSL model declares multiple distinct relationships involving the same entities
- **THEN** the diagram projection preserves each relationship identity and cardinality independently
- **AND** the logical model preserves each relationship as a distinct mapping
- **AND** generated SQL preserves each relationship without collisions or unintended merges

### Requirement: Generalization and Self-Relationship Consistency
The system SHALL preserve semantic meaning for generalization between entities and self-relationships across DSL, diagram, logical model, and SQL outputs.

#### Scenario: Generalization consistency
- **WHEN** a valid DSL model declares a generalization hierarchy between entities
- **THEN** the diagram projection renders the hierarchy correctly
- **AND** the logical model applies the configured inheritance mapping strategy
- **AND** generated SQL reflects the resulting inheritance mapping for supported targets

#### Scenario: Self-relationship consistency
- **WHEN** a valid DSL model declares a relationship where an entity relates to itself
- **THEN** the diagram projection preserves the self-reference semantics
- **AND** the logical model maps the self-relationship correctly
- **AND** generated SQL includes the expected self-referencing relational structures

### Requirement: Template Coverage for Advanced Modeling
The system SHALL include template models that collectively and explicitly cover binary, ternary, multiple relationships, generalization, and self-relationships.

#### Scenario: Template semantic coverage
- **WHEN** shipped templates are validated
- **THEN** each required advanced modeling construct is present in at least one template
- **AND** every template remains semantically valid

#### Scenario: Template generation coverage
- **WHEN** shipped templates are executed through generation targets
- **THEN** diagram, logical model, and SQL outputs succeed for each template
- **AND** validations assert expected advanced-construct artifacts in each output layer

## MODIFIED Requirements
### Requirement: Template Validation Scope
Template validation SHALL include structural assertions for advanced relationship constructs in addition to parse-only and success-only generation checks.

### Requirement: Diagram Canvas Rendering of Advanced Constructs
Diagram rendering SHALL make self-relationships and generalizations visibly represented in the canvas view, not only present in projection data.

#### Scenario: Self-relationship visible in canvas
- **WHEN** a relationship has the same source and target entity
- **THEN** the diagram canvas renders a visible self-loop path and labels
- **AND** users can still select the relationship from the rendered loop

#### Scenario: Generalization visible in canvas
- **WHEN** entities contain inheritance/specialization relationships
- **THEN** the diagram canvas renders visible generalization connectors between super and subtype entities
- **AND** connectors update consistently as layout positions change

## REMOVED Requirements
- None.
