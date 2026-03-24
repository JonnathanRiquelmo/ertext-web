import type { ModuleDescriptor } from '../../shared/types/contracts';
import type { ErdslDocumentNode, GenerateTarget } from '../ast';
import { projectAstToDiagram } from '../sync';
import { transformConceptualToLogical, type LogicalSchema, type LogicalTable } from '../transforms';
import { generateOccurrenceData, type OccurrenceData } from './occurrenceGenerator';

export * from './occurrenceGenerator';

export const GeneratorModule: ModuleDescriptor = {
  name: 'generators',
  status: 'ready'
};

export type GeneratorTarget = 'MySQL' | 'PostgreSQL';

export interface SqlGeneratorPlugin {
  readonly target: GeneratorTarget;
  generate(schema: LogicalSchema): string;
}

export interface GeneratorRegistry {
  register(plugin: SqlGeneratorPlugin): void;
  resolve(target: GeneratorTarget): SqlGeneratorPlugin;
}

export function createGeneratorRegistry(initialPlugins: readonly SqlGeneratorPlugin[]): GeneratorRegistry {
  const plugins = new Map<GeneratorTarget, SqlGeneratorPlugin>();
  for (const plugin of initialPlugins) {
    plugins.set(plugin.target, plugin);
  }
  return {
    register(plugin) {
      plugins.set(plugin.target, plugin);
    },
    resolve(target) {
      const plugin = plugins.get(target);
      if (!plugin) {
        throw new Error(`Missing SQL generator plugin for target "${target}".`);
      }
      return plugin;
    }
  };
}

function quoteIdentifier(target: GeneratorTarget, identifier: string): string {
  return target === 'MySQL' ? `\`${identifier}\`` : `"${identifier}"`;
}

function mapDataType(target: GeneratorTarget, value: string): string {
  const normalized = value.toLowerCase();
  const mappings: Record<string, string> = {
    uuid: target === 'MySQL' ? 'CHAR(36)' : 'UUID',
    string: 'VARCHAR(255)',
    datetime: target === 'MySQL' ? 'DATETIME' : 'TIMESTAMP',
    date: 'DATE',
    int: target === 'MySQL' ? 'INT' : 'INTEGER',
    integer: target === 'MySQL' ? 'INT' : 'INTEGER',
    double: target === 'MySQL' ? 'DOUBLE' : 'DOUBLE PRECISION',
    money: target === 'MySQL' ? 'DECIMAL(19,4)' : 'MONEY',
    file: target === 'MySQL' ? 'LONGBLOB' : 'BYTEA',
    boolean: target === 'MySQL' ? 'TINYINT(1)' : 'BOOLEAN'
  };
  return mappings[normalized] ?? 'VARCHAR(255)';
}

function renderCreateTable(target: GeneratorTarget, table: LogicalTable): string {
  if (table.columns.length === 0) {
    throw new Error(`Cannot generate ${target} SQL for table "${table.name}" without columns.`);
  }
  const quotedTable = quoteIdentifier(target, table.name);
  const columnLines = table.columns.map((column) => {
    const nullable = column.nullable ? '' : ' NOT NULL';
    return `  ${quoteIdentifier(target, column.name)} ${mapDataType(target, column.dataType)}${nullable}`;
  });
  const primaryKeyLine =
    table.primaryKey.length > 0
      ? `  PRIMARY KEY (${table.primaryKey.map((column) => quoteIdentifier(target, column)).join(', ')})`
      : null;
  const foreignKeyLines = table.foreignKeys.map(
    (foreignKey) =>
      `  CONSTRAINT ${quoteIdentifier(target, foreignKey.name)} FOREIGN KEY (${foreignKey.columns
        .map((column) => quoteIdentifier(target, column))
        .join(', ')}) REFERENCES ${quoteIdentifier(target, foreignKey.referencesTable)} (${foreignKey.referencesColumns
        .map((column) => quoteIdentifier(target, column))
        .join(', ')})`
  );
  const parts = [...columnLines, ...(primaryKeyLine ? [primaryKeyLine] : []), ...foreignKeyLines];
  return `CREATE TABLE ${quotedTable} (\n${parts.join(',\n')}\n);`;
}

export const mysqlGeneratorPlugin: SqlGeneratorPlugin = {
  target: 'MySQL',
  generate(schema) {
    return schema.tables.map((table) => renderCreateTable('MySQL', table)).join('\n\n');
  }
};

export const postgresqlGeneratorPlugin: SqlGeneratorPlugin = {
  target: 'PostgreSQL',
  generate(schema) {
    return schema.tables.map((table) => renderCreateTable('PostgreSQL', table)).join('\n\n');
  }
};

export interface GenerationArtifacts {
  readonly logicalSchema?: LogicalSchema;
  readonly mysql?: string;
  readonly postgresql?: string;
  readonly occurrenceData?: OccurrenceData[];
}

function resolveTargets(generateTarget: GenerateTarget | null): readonly GenerateTarget[] {
  if (!generateTarget || generateTarget === 'All') {
    return ['All'];
  }
  return [generateTarget];
}

export function generateArtifacts(
  document: ErdslDocumentNode,
  registry = createGeneratorRegistry([mysqlGeneratorPlugin, postgresqlGeneratorPlugin])
): GenerationArtifacts {
  const logicalSchema = transformConceptualToLogical(document);
  const targets = resolveTargets(document.generate?.target ?? null);
  const shouldEmit = (target: GenerateTarget): boolean =>
    targets.includes('All') || targets.includes(target);
  const mysql = shouldEmit('MySQL')
    ? registry.resolve('MySQL').generate(logicalSchema)
    : undefined;
  const postgresql = shouldEmit('PostgreSQL')
    ? registry.resolve('PostgreSQL').generate(logicalSchema)
    : undefined;
  
  let occurrenceData: OccurrenceData[] | undefined;
  if (shouldEmit('OccurrenceDiagram')) {
    const diagram = projectAstToDiagram(document);
    occurrenceData = generateOccurrenceData(diagram);
  }

  return {
    logicalSchema: shouldEmit('LogicalSchema') ? logicalSchema : undefined,
    mysql,
    postgresql,
    occurrenceData
  };
}
