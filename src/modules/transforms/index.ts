import type { ErdslDocumentNode, RelationCardinality, RelationshipNode } from '../ast';

export interface LogicalColumn {
  readonly name: string;
  readonly dataType: string;
  readonly nullable: boolean;
  readonly isPrimaryKey: boolean;
}

export interface LogicalForeignKey {
  readonly name: string;
  readonly columns: readonly string[];
  readonly referencesTable: string;
  readonly referencesColumns: readonly string[];
}

export interface LogicalTable {
  readonly name: string;
  readonly columns: readonly LogicalColumn[];
  readonly primaryKey: readonly string[];
  readonly foreignKeys: readonly LogicalForeignKey[];
}

export interface LogicalSchema {
  readonly domain: string;
  readonly tables: readonly LogicalTable[];
}

function toSnakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function cloneTable(table: LogicalTable): LogicalTable {
  return {
    ...table,
    columns: table.columns.map((column) => ({ ...column })),
    primaryKey: [...table.primaryKey],
    foreignKeys: table.foreignKeys.map((foreignKey) => ({
      ...foreignKey,
      columns: [...foreignKey.columns],
      referencesColumns: [...foreignKey.referencesColumns]
    }))
  };
}

function cardinalityMax(cardinality: RelationCardinality): number | '*' {
  if (cardinality === '(0:1)' || cardinality === '(1:1)') {
    return 1;
  }
  return '*';
}

function upsertColumn(table: LogicalTable, column: LogicalColumn): LogicalTable {
  const nextTable = cloneTable(table);
  const existingColumnIndex = nextTable.columns.findIndex((item) => item.name === column.name);
  if (existingColumnIndex >= 0) {
    const existingColumn = nextTable.columns[existingColumnIndex];
    if (!existingColumn) {
      return nextTable;
    }
    const columns = nextTable.columns.map((item) =>
      item.name === column.name
        ? {
            ...item,
            nullable: item.nullable && column.nullable,
            isPrimaryKey: item.isPrimaryKey || column.isPrimaryKey
          }
        : item
    );
    return {
      ...nextTable,
      columns
    };
  }
  return {
    ...nextTable,
    columns: [...nextTable.columns, column]
  };
}

function upsertPrimaryKeyColumns(table: LogicalTable, primaryKeyColumns: readonly string[]): LogicalTable {
  const nextPrimaryKey = new Set(table.primaryKey);
  for (const primaryKeyColumn of primaryKeyColumns) {
    nextPrimaryKey.add(primaryKeyColumn);
  }
  return {
    ...table,
    primaryKey: Array.from(nextPrimaryKey)
  };
}

function upsertForeignKey(table: LogicalTable, foreignKey: LogicalForeignKey): LogicalTable {
  if (table.foreignKeys.some((item) => item.name === foreignKey.name)) {
    return table;
  }
  return {
    ...table,
    foreignKeys: [...table.foreignKeys, foreignKey]
  };
}

function createDescendantsByEntity(document: ErdslDocumentNode): Map<string, readonly string[]> {
  const childrenBySuper = new Map<string, string[]>();
  for (const entity of document.entities.entities) {
    if (!entity.superEntity) {
      continue;
    }
    const current = childrenBySuper.get(entity.superEntity) ?? [];
    childrenBySuper.set(entity.superEntity, [...current, entity.name]);
  }

  const descendantsByEntity = new Map<string, readonly string[]>();
  const resolveDescendants = (entityName: string): readonly string[] => {
    const cached = descendantsByEntity.get(entityName);
    if (cached) {
      return cached;
    }
    const children = childrenBySuper.get(entityName) ?? [];
    const all = [entityName, ...children.flatMap((child) => resolveDescendants(child))];
    const deduplicated = Array.from(new Set(all));
    descendantsByEntity.set(entityName, deduplicated);
    return deduplicated;
  };

  for (const entity of document.entities.entities) {
    resolveDescendants(entity.name);
  }
  return descendantsByEntity;
}

function createRelationshipsByName(document: ErdslDocumentNode): Map<string, RelationshipNode> {
  return new Map(
    document.relationships.relationships.map((relationship) => [relationship.name, relationship] as const)
  );
}

function resolveRelationshipEntities(
  relationship: RelationshipNode,
  relationshipsByName: Map<string, RelationshipNode>,
  descendantsByEntity: Map<string, readonly string[]>,
  visited: Set<string>
): readonly string[] {
  const nextVisited = new Set(visited);
  nextVisited.add(relationship.name);

  const collectSideEntities = (
    side: RelationshipNode['leftSide'] | RelationshipNode['rightSide']
  ): readonly string[] => {
    if (side.targetKind === 'Entity') {
      return descendantsByEntity.get(side.target) ?? [side.target];
    }
    const nested = relationshipsByName.get(side.target);
    if (!nested || visited.has(nested.name)) {
      return [];
    }
    return resolveRelationshipEntities(nested, relationshipsByName, descendantsByEntity, nextVisited);
  };
  const entities = [...collectSideEntities(relationship.leftSide), ...collectSideEntities(relationship.rightSide)];
  return Array.from(new Set(entities));
}

function applyGeneralizationForeignKeys(
  document: ErdslDocumentNode,
  tablesByName: Map<string, LogicalTable>
): void {
  const entityByName = new Map(document.entities.entities.map((entity) => [entity.name, entity] as const));
  const processed = new Set<string>();

  const ensureGeneralization = (entityName: string): void => {
    if (processed.has(entityName)) {
      return;
    }
    const entity = entityByName.get(entityName);
    if (!entity || !entity.superEntity) {
      processed.add(entityName);
      return;
    }
    ensureGeneralization(entity.superEntity);

    const childTableName = toSnakeCase(entity.name);
    const superTableName = toSnakeCase(entity.superEntity);
    const childTable = tablesByName.get(childTableName);
    const superTable = tablesByName.get(superTableName);
    if (!childTable || !superTable || superTable.primaryKey.length === 0) {
      processed.add(entityName);
      return;
    }

    let nextChildTable = cloneTable(childTable);
    const inheritedPrimaryKeys: string[] = [];
    for (const superPrimaryKey of superTable.primaryKey) {
      const superPrimaryColumn = superTable.columns.find((column) => column.name === superPrimaryKey);
      if (!superPrimaryColumn) {
        continue;
      }
      const inheritedColumnName = `${superTableName}_${superPrimaryColumn.name}`;
      inheritedPrimaryKeys.push(inheritedColumnName);
      nextChildTable = upsertColumn(nextChildTable, {
        name: inheritedColumnName,
        dataType: superPrimaryColumn.dataType,
        nullable: false,
        isPrimaryKey: true
      });
    }

    if (inheritedPrimaryKeys.length > 0) {
      nextChildTable = upsertPrimaryKeyColumns(nextChildTable, inheritedPrimaryKeys);
      nextChildTable = upsertForeignKey(nextChildTable, {
        name: `fk_${childTableName}_inherits_${superTableName}`,
        columns: inheritedPrimaryKeys,
        referencesTable: superTableName,
        referencesColumns: [...superTable.primaryKey]
      });
    }

    tablesByName.set(childTableName, nextChildTable);
    processed.add(entityName);
  };

  for (const entity of document.entities.entities) {
    ensureGeneralization(entity.name);
  }
}

function mapRelationshipToForeignKeys(
  relationship: RelationshipNode,
  tablesByName: Map<string, LogicalTable>,
  relationshipsByName: Map<string, RelationshipNode>,
  descendantsByEntity: Map<string, readonly string[]>
): void {
  const resolveSideEntities = (
    side: RelationshipNode['leftSide'] | RelationshipNode['rightSide']
  ): readonly string[] => {
    if (side.targetKind === 'Entity') {
      return descendantsByEntity.get(side.target) ?? [side.target];
    }
    const nested = relationshipsByName.get(side.target);
    if (!nested) {
      return [];
    }
    return resolveRelationshipEntities(nested, relationshipsByName, descendantsByEntity, new Set([relationship.name]));
  };

  const leftEntities = resolveSideEntities(relationship.leftSide);
  const rightEntities = resolveSideEntities(relationship.rightSide);
  if (leftEntities.length === 0 || rightEntities.length === 0) {
    return;
  }

  const relationshipToken = toSnakeCase(relationship.name);
  let propagationIndex = 0;
  for (const leftEntity of leftEntities) {
    for (const rightEntity of rightEntities) {
      const targetOnRight =
        cardinalityMax(relationship.leftSide.cardinality) === 1 &&
        cardinalityMax(relationship.rightSide.cardinality) !== 1;
      const targetEntity = targetOnRight ? rightEntity : leftEntity;
      const referenceEntity = targetOnRight ? leftEntity : rightEntity;

      const targetTableName = toSnakeCase(targetEntity);
      const referenceTableName = toSnakeCase(referenceEntity);
      const targetTable = tablesByName.get(targetTableName);
      const referenceTable = tablesByName.get(referenceTableName);
      if (!targetTable || !referenceTable || referenceTable.primaryKey.length === 0) {
        continue;
      }

      let nextTargetTable = cloneTable(targetTable);
      const columnNames: string[] = [];
      const referenceColumns: string[] = [];
      for (const referencePrimaryKey of referenceTable.primaryKey) {
        const referencePrimaryColumn = referenceTable.columns.find((column) => column.name === referencePrimaryKey);
        if (!referencePrimaryColumn) {
          continue;
        }
        const columnName = `${referenceTableName}_${referencePrimaryKey}`;
        columnNames.push(columnName);
        referenceColumns.push(referencePrimaryKey);
        nextTargetTable = upsertColumn(nextTargetTable, {
          name: columnName,
          dataType: referencePrimaryColumn.dataType,
          nullable: targetOnRight ? relationship.rightSide.cardinality.startsWith('(0') : relationship.leftSide.cardinality.startsWith('(0'),
          isPrimaryKey: false
        });
      }

      if (columnNames.length === 0) {
        continue;
      }

      propagationIndex += 1;
      nextTargetTable = upsertForeignKey(nextTargetTable, {
        name: `fk_${relationshipToken}_${toSnakeCase(leftEntity)}_${toSnakeCase(rightEntity)}_${propagationIndex}`,
        columns: columnNames,
        referencesTable: referenceTableName,
        referencesColumns: referenceColumns
      });
      tablesByName.set(targetTableName, nextTargetTable);
    }
  }
}

export function transformConceptualToLogical(document: ErdslDocumentNode): LogicalSchema {
  const tablesByName = new Map<string, LogicalTable>();

  for (const entity of document.entities.entities) {
    const columns: LogicalColumn[] = entity.attributes.map((attribute) => ({
      name: toSnakeCase(attribute.name),
      dataType: attribute.dataType,
      nullable: !attribute.isIdentifier,
      isPrimaryKey: attribute.isIdentifier
    }));
    const primaryKey = columns.filter((column) => column.isPrimaryKey).map((column) => column.name);
    const tableName = toSnakeCase(entity.name);
    tablesByName.set(tableName, {
      name: tableName,
      columns,
      primaryKey,
      foreignKeys: []
    });
  }

  applyGeneralizationForeignKeys(document, tablesByName);
  const descendantsByEntity = createDescendantsByEntity(document);
  const relationshipsByName = createRelationshipsByName(document);

  for (const relationship of document.relationships.relationships) {
    mapRelationshipToForeignKeys(relationship, tablesByName, relationshipsByName, descendantsByEntity);
  }

  const tables = Array.from(tablesByName.values()).sort((left, right) =>
    left.name.localeCompare(right.name)
  );

  return {
    domain: document.domain.name,
    tables
  };
}
