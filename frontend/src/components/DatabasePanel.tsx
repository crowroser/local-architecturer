import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface DBColumn {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
  isUnique: boolean;
}

interface DBRelation {
  from: { table: string; column: string };
  to: { table: string; column: string };
  type: string;
}

interface DBTable {
  name: string;
  columns: DBColumn[];
}

interface DatabaseSchema {
  name: string;
  platform: string;
  file: string;
  tables: DBTable[];
  relations: DBRelation[];
}

interface DatabasePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DatabasePanel({ isOpen, onClose }: DatabasePanelProps) {
  const { colors } = useTheme();
  const [schemas, setSchemas] = useState<DatabaseSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<DBTable | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSchemas();
    }
  }, [isOpen]);

  const fetchSchemas = async () => {
    try {
      const response = await fetch('/api/database');
      const data = await response.json();
      setSchemas(data);
    } catch (error) {
      console.error('Failed to fetch database schemas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const platformIcons: Record<string, string> = {
    prisma: '💎',
    laravel: '🔷',
    typeorm: '📦',
    drizzle: '❄️',
    sequelize: '📦',
    sqlalchemy: '🐍',
  };

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      right: 10,
      width: '320px',
      maxHeight: 'calc(100vh - 20px)',
      overflowY: 'auto',
      background: colors.surface,
      borderRadius: '8px',
      boxShadow: `0 2px 8px ${colors.shadow}`,
      zIndex: 20,
    }}>
      <div style={{
        padding: '16px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>🗄️ Database Schemas</h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0 4px',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ color: colors.textSecondary, fontSize: '13px' }}>Loading schemas...</div>
        ) : schemas.length === 0 ? (
          <div style={{ color: colors.textSecondary, fontSize: '13px' }}>No database schemas found</div>
        ) : (
          schemas.map((schema, idx) => (
            <div key={idx} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px' }}>{platformIcons[schema.platform] || '🗄️'}</span>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{schema.name}</div>
                  <div style={{ fontSize: '10px', color: colors.textSecondary }}>{schema.platform} • {schema.file}</div>
                </div>
              </div>

              <div style={{ fontSize: '11px', color: colors.textSecondary, marginBottom: '8px' }}>
                {schema.tables.length} tables • {schema.relations.length} relations
              </div>

              {selectedTable && (
                <div style={{
                  padding: '8px',
                  background: colors.surfaceAlt,
                  borderRadius: '4px',
                  marginBottom: '8px',
                }}>
                  <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>
                    {selectedTable.name}
                  </div>
                  <div style={{ fontSize: '10px', color: colors.textSecondary }}>
                    {selectedTable.columns.map(col => (
                      <div key={col.name} style={{ marginBottom: '2px' }}>
                        <span style={{ fontWeight: col.isPrimaryKey ? 'bold' : 'normal' }}>
                          {col.name}
                        </span>
                        {' '}<span style={{ color: colors.textSecondary }}>{col.type}</span>
                        {col.isPrimaryKey && ' 🔑'}
                        {!col.isNullable && ' *'}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setSelectedTable(null)}
                    style={{
                      marginTop: '4px',
                      fontSize: '10px',
                      color: colors.primary,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                </div>
              )}

              {schema.tables.map(table => (
                <div
                  key={table.name}
                  onClick={() => setSelectedTable(selectedTable?.name === table.name ? null : table)}
                  style={{
                    padding: '6px 8px',
                    background: selectedTable?.name === table.name ? `${colors.primary}15` : colors.surfaceAlt,
                    borderRadius: '4px',
                    marginBottom: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{table.name}</span>
                  <span style={{ color: colors.textSecondary }}>{table.columns.length} cols</span>
                </div>
              ))}

              {schema.relations.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: colors.textSecondary }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Relations:</div>
                  {schema.relations.map((rel, relIdx) => (
                    <div key={relIdx} style={{ marginBottom: '2px' }}>
                      {rel.from.table}.{rel.from.column} → {rel.to.table}.{rel.to.column}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
