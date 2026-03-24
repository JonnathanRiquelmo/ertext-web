# Bidirectional Web-Based ERDSL Modeling Tool Spec

## Why
Current ER modeling workflows split textual and graphical editing into disconnected tools, causing drift and data loss. This change defines a deterministic AST-centered architecture that guarantees consistent bidirectional synchronization.

## What Changes
- Build an open-source web application for conceptual ER modeling using a dedicated DSL and visual editor.
- Define a formal grammar with structured parsing (no regex parsing) including comments, generation options, entities, relationships, and constraints.
- Implement an AST as the only source of truth for all projections: DSL text, diagram view, logical schema, and SQL outputs.
- Integrate a code editor with syntax highlighting, inline diagnostics, and precise line/column error reporting.
- Integrate a diagram engine for entity creation, attribute editing, relationship management, cardinalities, and inheritance hierarchies.
- Implement deterministic transformations:
  - Conceptual AST → Logical schema
  - Logical schema → SQL (MySQL, PostgreSQL)
- Implement deterministic regeneration:
  - AST → DSL (canonical formatting)
  - AST → Diagram view model
- Add undo/redo at AST operation level and export diagram as SVG/PNG.
- Define an extensible generator architecture for additional DBMS targets.

## Impact
- Affected specs: ERDSL grammar, AST model, synchronization engine, diagram projection, logical transformation, SQL generation, diagnostics, export, undo/redo.
- Affected code: frontend application shell, parser module, AST domain module, state store, Monaco integration, diagram integration, transformation services, generator plugins, validation/reporting services.

## Architecture Decisions
- Single source of truth: Centralized immutable AST state in a single store; all views are derived projections.
- Bidirectional sync strategy:
  - Text edits trigger parse pipeline producing a candidate AST transaction.
  - Diagram edits emit semantic AST commands (create entity, connect relationship, set cardinality, etc.).
  - Both pipelines commit through one transactional reducer with versioning and conflict-safe ordering.
- Race-condition prevention:
  - Serialized AST command queue with monotonic revision IDs.
  - Debounced text parsing with stale-result rejection by revision check.
  - Diagram actions apply synchronously as AST commands.
- Information preservation:
  - Parser attaches source ranges and stable node IDs.
  - Canonical formatter preserves semantic fidelity while normalizing style.
  - Unsupported transient UI metadata is kept outside semantic AST.
- Determinism and reversibility:
  - Grammar-to-AST mapping is total for supported syntax.
  - AST-to-text generator is canonical and idempotent.
  - Diagram projection uses stable IDs and explicit layout metadata partitioning.
- Separation of concerns:
  - Parser/formatter isolated from diagram and SQL generator.
  - Logical/SQL transformations consume AST contracts only.
  - UI components never contain transformation logic.

## ADDED Requirements
### Requirement: Structured ERDSL Parsing
The system SHALL parse ERDSL source into a typed AST using a formal grammar and parser generator, including single-line and multi-line comments.

#### Scenario: Successful parsing
- **WHEN** a user provides valid ERDSL text
- **THEN** the parser returns a complete AST with stable node identifiers and source locations

#### Scenario: Syntax error diagnostics
- **WHEN** a user provides invalid ERDSL text
- **THEN** the system reports deterministic syntax errors with exact line and column positions

### Requirement: AST-Centered Bidirectional Synchronization
The system SHALL keep AST as the only source of truth and synchronize textual and graphical representations through AST transactions only.

#### Scenario: Text to diagram synchronization
- **WHEN** ERDSL text changes and parses successfully
- **THEN** diagram projection, logical schema projection, and SQL outputs update from the committed AST revision

#### Scenario: Diagram to text synchronization
- **WHEN** a user edits entities, relationships, cardinalities, attributes, or specializations in the diagram
- **THEN** the corresponding AST commands commit and the DSL text is regenerated from AST canonically

### Requirement: Conceptual Model Coverage
The system SHALL support entities, typed attributes, identifier attributes, binary/ternary/self relationships, relationship attributes, cardinalities, and specialization/generalization modes.

#### Scenario: Model with advanced relationships
- **WHEN** a user defines ternary and self-referencing relationships with attributes and cardinalities
- **THEN** the AST and diagram render these constructs without semantic loss

### Requirement: Deterministic Transformations
The system SHALL transform conceptual AST into logical schema and generate SQL for MySQL and PostgreSQL deterministically.

#### Scenario: SQL generation target switch
- **WHEN** the selected generate option changes between MySQL and PostgreSQL
- **THEN** target-specific SQL output updates from the same AST without changing conceptual semantics

### Requirement: Real-Time Editing Experience
The system SHALL provide syntax highlighting, real-time validation, undo/redo, and diagram export capabilities.

#### Scenario: Continuous edits
- **WHEN** the user performs rapid alternating text and diagram edits
- **THEN** the system remains consistent, with no lost updates across projections

## MODIFIED Requirements
### Requirement: Generation Option Semantics
The system SHALL treat `Generate` as optional with default `All`, and SHALL support `All`, `Diagram`, `LogicalSchema`, `MySQL`, and `PostgreSQL` as explicit generation targets.

## REMOVED Requirements
### Requirement: Direct View-to-View Synchronization
**Reason**: Direct text-to-diagram or diagram-to-text mapping duplicates logic and causes inconsistency.
**Migration**: Replace direct mapping with parser/command pipelines that always converge on AST transactions.
