import type { LogicalSchema, LogicalTable } from '../modules/transforms';

export interface LogicalSchemaViewerProps {
  schema?: LogicalSchema | null;
}

export function LogicalSchemaViewer({ schema }: LogicalSchemaViewerProps) {
  if (!schema || schema.tables.length === 0) {
    return <div className="logical-schema-empty">Nenhuma tabela gerada.</div>;
  }

  return (
    <div className="logical-schema-container">
      <div className="logical-schema-domain" style={{ width: '100%', marginBottom: '10px' }}>
        <strong>Domain:</strong> <span>{schema.domain}</span>
      </div>
      {schema.tables.map((table: LogicalTable) => (
        <div key={table.name} className="logical-table-card">
          <div className="logical-table-header">
            <strong>{table.name}</strong>
          </div>
          <div className="logical-table-content">
            {table.columns.map(column => {
              const isFk = table.foreignKeys.some(fk => fk.columns.includes(column.name));
              return (
                <div key={column.name} className="logical-table-row">
                  <div className="logical-column-info">
                    <div className="logical-column-icons">
                      {column.isPrimaryKey && <span className="logical-badge pk-badge" title="Primary Key">PK</span>}
                      {isFk && <span className="logical-badge fk-badge" title="Foreign Key">FK</span>}
                    </div>
                    <span className="logical-column-name">{column.name}</span>
                  </div>
                  <div className="logical-column-type">
                    {column.dataType}
                    <span className="logical-column-nullability">
                      {column.nullable ? ' (null)' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
