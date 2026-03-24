import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { ErdslDocumentNode, GenerateTarget, RelationCardinality } from '../modules/ast';
import { generateArtifacts } from '../modules/generators';
import { parseErdsl } from '../modules/parser';
import { projectAstToDiagram } from '../modules/sync';
import { listTemplateDefinitions } from './templateRegistry';
import {
  GENERATION_TARGET_TEMPLATE_MAP,
  SUPPORTED_GENERATION_FEATURE_TARGET_MAP,
  SUPPORTED_MODELING_FEATURE_TEMPLATE_MAP,
  type GenerationCoverageTarget,
  type SupportedModelingFeature
} from './templateFeatureCoverage';

interface FeatureTableRow {
  readonly feature: string;
  readonly language: string;
  readonly generators: string;
}

const FEATURES_REFERENCE_PATH = new URL('../../.trae/Features.md', import.meta.url);
const SUPPORTED_ICON = ':heavy_check_mark:';
const CARDINALITIES: readonly RelationCardinality[] = ['(0:1)', '(1:1)', '(0:N)', '(1:N)'];
const GENERATION_FEATURES = new Set(Object.keys(SUPPORTED_GENERATION_FEATURE_TARGET_MAP));

const TEMPLATE_DEFINITIONS_BY_ID = new Map(
  listTemplateDefinitions().map((template) => [template.metadata.id, template] as const)
);

function parseFeaturesRows13To32(): readonly FeatureTableRow[] {
  const content = readFileSync(FEATURES_REFERENCE_PATH, 'utf8');
  const rows: FeatureTableRow[] = [];

  for (const line of content.split(/\r?\n/)) {
    if (!line.startsWith('|')) {
      continue;
    }

    const cells = line.split('|').map((cell) => cell.trim());
    if (cells.length < 5) {
      continue;
    }

    const feature = cells[1];
    const language = cells[2];
    const generators = cells[3];
    if (!feature || feature === '**ERtext Feature**' || feature === '---') {
      continue;
    }

    rows.push({ feature, language, generators });
    if (feature === 'Occurrence Diagram') {
      break;
    }
  }

  return rows;
}

function isSupportedRow(row: FeatureTableRow): boolean {
  return row.language.includes(SUPPORTED_ICON) && row.generators.includes(SUPPORTED_ICON);
}

function parseTemplateAst(templateId: string): ErdslDocumentNode {
  const template = TEMPLATE_DEFINITIONS_BY_ID.get(templateId);
  if (!template) {
    throw new Error(`Template "${templateId}" is not registered.`);
  }

  const parsed = parseErdsl(template.content.dsl);
  if (!parsed.ok) {
    throw new Error(
      `Template "${templateId}" failed to parse: ${parsed.diagnostics[0]?.message ?? 'unknown parser error'}`
    );
  }

  return parsed.ast;
}

function rewriteGenerateTarget(dsl: string, target: GenerationCoverageTarget): string {
  const withoutGenerateStatement = dsl.replace(
    /^\s*Generate\s+(All|Diagram|LogicalSchema|MySQL|PostgreSQL)\s*;\s*/u,
    ''
  );
  return `Generate ${target};\n${withoutGenerateStatement.trimStart()}`;
}

describe('template feature coverage', () => {
  it('keeps a complete feature-to-template map for all supported modeling features from Features.md rows 13-32', () => {
    const supportedRows = parseFeaturesRows13To32().filter(isSupportedRow);
    const supportedModelingFeatures = supportedRows
      .filter((row) => !GENERATION_FEATURES.has(row.feature))
      .map((row) => row.feature)
      .sort();
    const mappedFeatures = Object.keys(SUPPORTED_MODELING_FEATURE_TEMPLATE_MAP).sort();

    expect(mappedFeatures).toEqual(supportedModelingFeatures);
  });

  it('ensures mapped templates actually represent each supported modeling feature', () => {
    const toDocuments = (templateIds: readonly string[]) => templateIds.map(parseTemplateAst);

    const assertions: Record<SupportedModelingFeature, (documents: readonly ErdslDocumentNode[]) => void> = {
      Entities: (documents) => {
        expect(documents.some((document) => document.entities.entities.length > 0)).toBe(true);
      },
      'Referential Attribute': (documents) => {
        expect(
          documents.some((document) =>
            document.entities.entities.some((entity) => entity.attributes.some((attribute) => attribute.isIdentifier))
          )
        ).toBe(true);
      },
      'Descriptive Attribute': (documents) => {
        expect(
          documents.some((document) =>
            document.entities.entities.some((entity) =>
              entity.attributes.some((attribute) => !attribute.isIdentifier && attribute.dataType.length > 0)
            )
          )
        ).toBe(true);
      },
      'Binary Relationship': (documents) => {
        expect(
          documents.some((document) =>
            document.relationships.relationships.some(
              (relationship) =>
                relationship.leftSide.targetKind === 'Entity' && relationship.rightSide.targetKind === 'Entity'
            )
          )
        ).toBe(true);
      },
      'Ternary Relationship': (documents) => {
        expect(
          documents.some((document) =>
            document.relationships.relationships.some(
              (relationship) =>
                relationship.leftSide.targetKind === 'Relation' || relationship.rightSide.targetKind === 'Relation'
            )
          )
        ).toBe(true);
      },
      'Self-relationship': (documents) => {
        expect(
          documents.some((document) =>
            document.relationships.relationships.some(
              (relationship) =>
                relationship.leftSide.targetKind === 'Entity' &&
                relationship.rightSide.targetKind === 'Entity' &&
                relationship.leftSide.target === relationship.rightSide.target
            )
          )
        ).toBe(true);
      },
      'Relationship Attributes': (documents) => {
        expect(
          documents.some((document) =>
            document.relationships.relationships.some((relationship) => relationship.attributes.length > 0)
          )
        ).toBe(true);
      },
      Cardinalities: (documents) => {
        const represented = new Set<RelationCardinality>();
        for (const document of documents) {
          for (const relationship of document.relationships.relationships) {
            represented.add(relationship.leftSide.cardinality);
            represented.add(relationship.rightSide.cardinality);
          }
        }
        expect(new Set(CARDINALITIES)).toEqual(represented);
      },
      Generalization: (documents) => {
        expect(
          documents.some((document) => document.entities.entities.some((entity) => entity.generalization !== null))
        ).toBe(true);
      }
    };

    for (const [feature, templateIds] of Object.entries(SUPPORTED_MODELING_FEATURE_TEMPLATE_MAP)) {
      expect(templateIds.length).toBeGreaterThan(0);
      const documents = toDocuments(templateIds);
      assertions[feature as SupportedModelingFeature](documents);
    }
  });

  it('covers all supported generation features and exercises each generation target successfully', () => {
    const supportedRows = parseFeaturesRows13To32().filter(isSupportedRow);
    const supportedGenerationFeatures = supportedRows
      .filter((row) => GENERATION_FEATURES.has(row.feature))
      .map((row) => row.feature)
      .sort();
    const mappedGenerationFeatures = Object.keys(SUPPORTED_GENERATION_FEATURE_TARGET_MAP).sort();

    expect(mappedGenerationFeatures).toEqual(supportedGenerationFeatures);

    const expectedTargets = new Set<GenerateTarget>();
    for (const targets of Object.values(SUPPORTED_GENERATION_FEATURE_TARGET_MAP)) {
      for (const target of targets) {
        expectedTargets.add(target);
      }
    }

    const mappedTargets = new Set<GenerateTarget>(Object.keys(GENERATION_TARGET_TEMPLATE_MAP) as GenerateTarget[]);
    expect(mappedTargets).toEqual(expectedTargets);

    for (const [target, templateIds] of Object.entries(GENERATION_TARGET_TEMPLATE_MAP)) {
      const generationTarget = target as GenerationCoverageTarget;
      expect(templateIds.length).toBeGreaterThan(0);

      for (const templateId of templateIds) {
        const template = TEMPLATE_DEFINITIONS_BY_ID.get(templateId);
        if (!template) {
          throw new Error(`Template "${templateId}" is not registered.`);
        }

        const sourceWithTarget = rewriteGenerateTarget(template.content.dsl, generationTarget);
        const parsed = parseErdsl(sourceWithTarget);
        if (!parsed.ok) {
          throw new Error(
            `Template "${templateId}" failed under Generate ${generationTarget}: ${
              parsed.diagnostics[0]?.message ?? 'unknown parser error'
            }`
          );
        }

        const artifacts = generateArtifacts(parsed.ast);

        if (generationTarget === 'Diagram') {
          const projection = projectAstToDiagram(parsed.ast);
          expect(projection.entities.length).toBeGreaterThan(0);
          expect(projection.relationships.length).toBeGreaterThan(0);
          expect(artifacts.logicalSchema).toBeUndefined();
          expect(artifacts.mysql).toBeUndefined();
          expect(artifacts.postgresql).toBeUndefined();
        } else if (generationTarget === 'LogicalSchema') {
          expect(artifacts.logicalSchema?.tables.length).toBeGreaterThan(0);
          expect(artifacts.mysql).toBeUndefined();
          expect(artifacts.postgresql).toBeUndefined();
        } else if (generationTarget === 'MySQL') {
          expect(artifacts.logicalSchema).toBeUndefined();
          expect(artifacts.mysql).toContain('CREATE TABLE');
          expect(artifacts.postgresql).toBeUndefined();
        } else if (generationTarget === 'PostgreSQL') {
          expect(artifacts.logicalSchema).toBeUndefined();
          expect(artifacts.postgresql).toContain('CREATE TABLE');
          expect(artifacts.mysql).toBeUndefined();
        }
      }
    }
  });
});
