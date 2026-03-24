# Tasks
- [x] Task 1: Initialize modular web application foundation
  - [x] Define project structure with clear module boundaries (parser, AST, sync, UI, generators)
  - [x] Configure TypeScript, linting, and shared domain contracts
  - [x] Prepare open-source metadata, contribution guide entry points, and extensibility conventions

- [x] Task 2: Define formal ERDSL grammar and parser pipeline
  - [x] Implement grammar supporting comments, `Generate`, `Domain`, `Entities`, and `Relationships` blocks
  - [x] Parse entity attributes, identifier flags, relationship types, cardinalities, and specialization modes
  - [x] Produce typed AST nodes with source location metadata and stable IDs
  - [x] Add deterministic parser diagnostics with line/column precision

- [x] Task 3: Implement AST domain model and centralized state engine
  - [x] Create immutable AST schema and command-based mutation API
  - [x] Implement revisioned transactional reducer and command queue
  - [x] Add undo/redo based on AST command history
  - [x] Ensure all projections subscribe to AST revisions only

- [x] Task 4: Implement textual editor integration
  - [x] Integrate Monaco Editor with syntax highlighting for ERDSL grammar
  - [x] Connect real-time parse/validate loop with debounced updates
  - [x] Surface structured diagnostics and semantic validation feedback
  - [x] Regenerate canonical DSL text from AST after diagram-originated changes

- [x] Task 5: Implement diagram editor integration
  - [x] Integrate selected diagram engine and render entities, attributes, and relationships
  - [x] Support binary, ternary, and self-referencing relationship editing
  - [x] Support cardinality editing and specialization/generalization visualization
  - [x] Emit semantic AST commands for all diagram interactions

- [x] Task 6: Implement deterministic bidirectional synchronization
  - [x] Wire text-edit parse commits into AST transaction flow
  - [x] Wire diagram-edit commands into AST transaction flow
  - [x] Reject stale parse results using revision checks
  - [x] Guarantee canonical AST-to-text and AST-to-diagram projections

- [x] Task 7: Implement conceptual-to-logical transformation
  - [x] Define logical schema intermediate model from conceptual AST
  - [x] Implement mapping rules for identifiers, relationships, and inheritance variants
  - [x] Validate mapping determinism and completeness for supported constructs

- [x] Task 8: Implement SQL generation engine
  - [x] Implement generator plugin interface and target registry
  - [x] Implement MySQL SQL generator
  - [x] Implement PostgreSQL SQL generator
  - [x] Honor `Generate` options with default `All`

- [x] Task 9: Add export and quality capabilities
  - [x] Implement diagram export as SVG and PNG
  - [x] Add end-to-end scenario covering text↔diagram sync and SQL generation
  - [x] Add automated tests for parser, synchronization, transformations, and generators
  - [x] Verify continuous edit consistency under rapid mixed operations

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 2 and Task 3
- Task 5 depends on Task 3
- Task 6 depends on Task 4 and Task 5
- Task 7 depends on Task 3
- Task 8 depends on Task 7
- Task 9 depends on Task 6 and Task 8

# Parallelization Notes
- Task 4 and Task 5 can progress in parallel after Task 3 is complete
- Task 7 can progress in parallel with Task 4 and Task 5 after Task 3 is complete
