#!/usr/bin/env node

/**
 * One-time, non-destructive SQLite -> Neon PostgreSQL data importer.
 *
 * Dry run (default):
 *   node scripts/one-time-import-sqlite-to-neon.mjs --source=dev.db
 *
 * Apply only after reviewing the dry run:
 *   node scripts/one-time-import-sqlite-to-neon.mjs --source=dev.db \
 *     --apply --confirm=IMPORT_SQLITE_DATA_TO_NEON
 *
 * Safety properties:
 * - opens SQLite in read-only/query-only mode
 * - never copies SQLite's provider-specific _prisma_migrations rows
 * - inserts model rows in a foreign-key-safe order
 * - uses ON CONFLICT DO NOTHING and never updates/deletes destination rows
 * - rejects conflicting existing rows before writing
 * - wraps the import in one PostgreSQL transaction
 * - redacts database credentials from all script output and errors
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { neonConfig, Pool } from '@neondatabase/serverless';
import nextEnvironment from '@next/env';

const { loadEnvConfig } = nextEnvironment;

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIRECTORY, '..');
const REQUESTED_SOURCE_PATH = resolve(PROJECT_ROOT, 'prisma', 'dev.db');
const BACKUP_PATH = resolve(
  PROJECT_ROOT,
  'prisma',
  'backups',
  'dev-before-neon-postgres-20260726-160547.db',
);
const SCHEMA_PATH = resolve(PROJECT_ROOT, 'prisma', 'schema.prisma');
const APPLY_CONFIRMATION = 'IMPORT_SQLITE_DATA_TO_NEON';
const SQLITE_MIGRATION_TABLE = '_prisma_migrations';
const MAX_INSERT_PARAMETERS = 5_000;

const IMPORTANT_TABLE_GROUPS = {
  articles: ['Article', 'ArticleCategory', 'ArticleTag', 'ArticleRelated'],
  affiliateProducts: ['Product', 'AffiliateProduct', 'AffiliateLink'],
  categories: ['ContentCategory', 'ArticleCategory'],
  tags: ['ContentTag', 'ArticleTag'],
  media: ['MediaFolder', 'MediaAsset'],
  recommendations: [
    'RecommendationScenario',
    'RecommendationSection',
    'RecommendationAssignment',
    'RecommendationRule',
    'RecommendationRuleOverride',
  ],
  creatorRecommendations: [
    'CreatorRecommendation',
    'CreatorRecommendationRule',
    'CreatorRecommendationGroup',
    'CreatorProductAssignment',
    'CreatorGuideLink',
  ],
  merchandise: ['MerchandiseProduct'],
  storeSettings: ['SiteContent'],
  subscribers: ['EmailSubscriber'],
  redirects: ['Redirect'],
};

loadEnvConfig(PROJECT_ROOT);

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const sourcePath = resolveSourcePath(options.source);
  const databaseUrl = requireDatabaseUrl();
  const destination = redactDestination(databaseUrl);
  const backup = inspectBackup(sourcePath);
  const models = readPrismaModels();

  if (models.length !== 32) {
    throw new Error(
      `Expected 32 Prisma models, but schema inspection found ${models.length}.`,
    );
  }

  const sqlite = new DatabaseSync(sourcePath, {
    readOnly: true,
  });
  sqlite.exec('PRAGMA query_only = ON;');
  sqlite.exec('PRAGMA foreign_keys = ON;');

  if (typeof globalThis.WebSocket === 'function') {
    neonConfig.webSocketConstructor = globalThis.WebSocket;
  }

  const pool = new Pool({ connectionString: databaseUrl });
  let client;

  try {
    const source = inspectSqlite(sqlite, models);
    client = await pool.connect();

    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    let destinationBefore;
    try {
      destinationBefore = await inspectPostgres(client, models);
      await client.query('ROLLBACK');
    } catch (error) {
      await safeRollback(client);
      throw error;
    }

    const dryRunPlan = buildImportPlan(source, destinationBefore, models);
    const dryRunReport = buildDryRunReport({
      sourcePath,
      source,
      backup,
      destination,
      destinationSnapshot: destinationBefore,
      models,
      plan: dryRunPlan,
    });

    process.stdout.write(`${JSON.stringify(dryRunReport, null, 2)}\n`);

    if (!options.apply) {
      process.stdout.write(
        '\nDRY RUN ONLY: no Neon rows were written. Review this report and obtain explicit approval before running apply mode.\n',
      );
      return;
    }

    if (options.confirmation !== APPLY_CONFIRMATION) {
      throw new Error(
        `Apply mode requires --confirm=${APPLY_CONFIRMATION}. No rows were written.`,
      );
    }

    assertPlanIsWritable(source, destinationBefore, dryRunPlan);

    await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');
    let importResult;
    try {
      const lockedDestination = await inspectPostgres(client, models);
      const lockedPlan = buildImportPlan(source, lockedDestination, models);
      assertPlanIsWritable(source, lockedDestination, lockedPlan);

      importResult = await importRows(
        client,
        source,
        lockedDestination,
        lockedPlan,
      );
      const integrityInsideTransaction = await checkPostgresForeignKeys(
        client,
        lockedDestination.foreignKeys,
      );

      if (integrityInsideTransaction.totalOrphans > 0) {
        throw new Error(
          `PostgreSQL foreign-key verification found ${integrityInsideTransaction.totalOrphans} orphaned rows. The import was rolled back.`,
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await safeRollback(client);
      throw error;
    }

    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    let destinationAfter;
    try {
      destinationAfter = await inspectPostgres(client, models);
      await client.query('ROLLBACK');
    } catch (error) {
      await safeRollback(client);
      throw error;
    }

    const verificationPlan = buildImportPlan(source, destinationAfter, models);
    const finalReport = {
      mode: 'apply-complete',
      sourceDatabase: sourceDescriptor(sourcePath),
      destination,
      tablesProcessed: importResult.tables,
      totals: {
        sourceRows: sumCounts(source.modelRowCounts),
        rowsCopied: importResult.rowsCopied,
        rowsSkippedAsAlreadyPresent: importResult.rowsSkipped,
        failures: 0,
        sourceRowsPresentByPrimaryKey:
          verificationPlan.totalAlreadyPresent,
        sourceRowsStillMissing: verificationPlan.totalToInsert,
        conflicts: verificationPlan.totalConflicts,
      },
      sourceRowCounts: source.allTableRowCounts,
      destinationRowCountsAfter: destinationAfter.modelRowCounts,
      sourceVersusDestination: compareCounts(
        source.modelRowCounts,
        destinationAfter.modelRowCounts,
      ),
      importantRecords: buildImportantRecordReport(
        source.modelRowCounts,
        destinationAfter.modelRowCounts,
      ),
      integrity: {
        sqliteIntegrity: source.integrity,
        sqliteForeignKeyViolations: source.foreignKeyViolations.length,
        neonForeignKeyOrphans:
          destinationAfter.foreignKeyIntegrity.totalOrphans,
        neonForeignKeyChecks:
          destinationAfter.foreignKeyIntegrity.checks,
      },
      sequences: importResult.sequences,
      idempotent:
        verificationPlan.totalToInsert === 0 &&
        verificationPlan.totalConflicts === 0,
    };

    process.stdout.write(`\n${JSON.stringify(finalReport, null, 2)}\n`);
  } finally {
    sqlite.close();
    client?.release();
    await pool.end();
  }
}

function parseArguments(argumentsList) {
  const sourceArgument = argumentsList.find((argument) =>
    argument.startsWith('--source='),
  );
  const confirmationArgument = argumentsList.find((argument) =>
    argument.startsWith('--confirm='),
  );

  return {
    source: sourceArgument?.slice('--source='.length),
    apply: argumentsList.includes('--apply'),
    confirmation: confirmationArgument?.slice('--confirm='.length),
  };
}

function resolveSourcePath(sourceArgument) {
  const sourcePath = sourceArgument
    ? isAbsolute(sourceArgument)
      ? sourceArgument
      : resolve(PROJECT_ROOT, sourceArgument)
    : REQUESTED_SOURCE_PATH;

  if (!existsSync(sourcePath)) {
    throw new Error(
      `SQLite source does not exist at ${sourcePath}. Pass --source=<path> explicitly; the script will not guess or create a database.`,
    );
  }

  return sourcePath;
}

function requireDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value || !/^postgres(?:ql)?:\/\//i.test(value)) {
    throw new Error(
      'DATABASE_URL must contain the Neon PostgreSQL connection string.',
    );
  }
  return value;
}

function redactDestination(databaseUrl) {
  const parsed = new URL(databaseUrl);
  return {
    protocol: parsed.protocol,
    host: parsed.hostname,
    port: parsed.port || '5432',
    database: decodeURIComponent(parsed.pathname.replace(/^\/+/, '')),
    pooled: parsed.hostname.includes('-pooler'),
    credentials: '[REDACTED]',
  };
}

function sourceDescriptor(sourcePath) {
  return {
    requestedPath: REQUESTED_SOURCE_PATH,
    requestedPathExists: existsSync(REQUESTED_SOURCE_PATH),
    selectedPath: sourcePath,
    selectedPathExists: existsSync(sourcePath),
    selectedSha256: hashFile(sourcePath),
  };
}

function inspectBackup(sourcePath) {
  if (!existsSync(BACKUP_PATH)) {
    throw new Error(`Required SQLite backup does not exist at ${BACKUP_PATH}.`);
  }

  const sourceHash = hashFile(sourcePath);
  const backupHash = hashFile(BACKUP_PATH);
  return {
    path: BACKUP_PATH,
    exists: true,
    sha256: backupHash,
    matchesSelectedSource: sourceHash === backupHash,
  };
}

function hashFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function readPrismaModels() {
  const schema = readFileSync(SCHEMA_PATH, 'utf8');
  return [...schema.matchAll(/\bmodel\s+(\w+)\s+\{([\s\S]*?)\n\}/g)].map(
    ([, modelName, body]) => ({
      modelName,
      tableName: body.match(/@@map\("([^"]+)"\)/)?.[1] ?? modelName,
    }),
  );
}

function inspectSqlite(sqlite, models) {
  const allTables = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    )
    .all()
    .map((row) => row.name);
  const allTableRowCounts = Object.fromEntries(
    allTables.map((tableName) => [
      tableName,
      readSqliteCount(sqlite, tableName),
    ]),
  );
  const modelTableNames = models.map((model) => model.tableName);
  const modelRows = Object.fromEntries(
    modelTableNames.map((tableName) => [
      tableName,
      sqlite.prepare(`SELECT * FROM ${quoteIdentifier(tableName)}`).all(),
    ]),
  );
  const modelRowCounts = Object.fromEntries(
    modelTableNames.map((tableName) => [
      tableName,
      modelRows[tableName].length,
    ]),
  );
  const columns = Object.fromEntries(
    modelTableNames.map((tableName) => [
      tableName,
      sqlite
        .prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`)
        .all()
        .map((column) => column.name),
    ]),
  );
  const foreignKeys = readSqliteForeignKeys(sqlite, modelTableNames);
  const insertionOrder = topologicalTableOrder(modelTableNames, foreignKeys);
  const integrityRow = sqlite.prepare('PRAGMA integrity_check').get();
  const foreignKeyViolations = sqlite
    .prepare('PRAGMA foreign_key_check')
    .all();

  return {
    allTables,
    allTableRowCounts,
    modelRows,
    modelRowCounts,
    columns,
    foreignKeys,
    insertionOrder,
    integrity:
      integrityRow?.integrity_check ??
      Object.values(integrityRow ?? {})[0] ??
      'unknown',
    foreignKeyViolations,
    missingModelTables: modelTableNames.filter(
      (tableName) => !allTables.includes(tableName),
    ),
    nonModelTables: allTables.filter(
      (tableName) => !modelTableNames.includes(tableName),
    ),
  };
}

function readSqliteCount(sqlite, tableName) {
  return Number(
    sqlite
      .prepare(
        `SELECT COUNT(*) AS ${quoteIdentifier('count')} FROM ${quoteIdentifier(tableName)}`,
      )
      .get().count,
  );
}

function readSqliteForeignKeys(sqlite, tableNames) {
  return tableNames.flatMap((tableName) => {
    const grouped = new Map();
    for (const row of sqlite
      .prepare(`PRAGMA foreign_key_list(${quoteIdentifier(tableName)})`)
      .all()) {
      const key = `${tableName}:${row.id}`;
      const entry = grouped.get(key) ?? {
        name: key,
        childTable: tableName,
        parentTable: row.table,
        childColumns: [],
        parentColumns: [],
      };
      entry.childColumns.push(row.from);
      entry.parentColumns.push(row.to);
      grouped.set(key, entry);
    }
    return [...grouped.values()];
  });
}

function topologicalTableOrder(tableNames, foreignKeys) {
  const tableSet = new Set(tableNames);
  const dependencies = new Map(
    tableNames.map((tableName) => [tableName, new Set()]),
  );

  for (const foreignKey of foreignKeys) {
    if (
      tableSet.has(foreignKey.parentTable) &&
      foreignKey.parentTable !== foreignKey.childTable
    ) {
      dependencies
        .get(foreignKey.childTable)
        .add(foreignKey.parentTable);
    }
  }

  const ordered = [];
  const remaining = new Set(tableNames);
  while (remaining.size > 0) {
    const ready = tableNames.filter(
      (tableName) =>
        remaining.has(tableName) &&
        [...dependencies.get(tableName)].every((dependency) =>
          ordered.includes(dependency),
        ),
    );

    if (ready.length === 0) {
      throw new Error(
        `Unable to determine a foreign-key-safe order for: ${[...remaining].join(', ')}`,
      );
    }

    for (const tableName of ready) {
      ordered.push(tableName);
      remaining.delete(tableName);
    }
  }

  return ordered;
}

async function inspectPostgres(client, models) {
  const modelTableNames = models.map((model) => model.tableName);
  const columnResult = await client.query(`
    SELECT
      table_name,
      column_name,
      data_type,
      udt_name,
      is_nullable,
      column_default,
      is_identity,
      ordinal_position
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);
  const columns = groupBy(
    columnResult.rows.filter((column) =>
      modelTableNames.includes(column.table_name),
    ),
    'table_name',
  );
  const availableTables = new Set(Object.keys(columns));
  const modelRowCounts = {};
  const modelRows = {};

  for (const tableName of modelTableNames) {
    if (!availableTables.has(tableName)) continue;
    const countResult = await client.query(
      `SELECT COUNT(*)::text AS count FROM ${quoteIdentifier(tableName)}`,
    );
    modelRowCounts[tableName] = Number(countResult.rows[0].count);
    modelRows[tableName] =
      modelRowCounts[tableName] > 0
        ? (
            await client.query(
              `SELECT ${buildComparisonProjection(columns[tableName])} FROM ${quoteIdentifier(tableName)}`,
            )
          ).rows
        : [];
  }

  const migrationCountResult = await client.query(
    `SELECT COUNT(*)::text AS count FROM ${quoteIdentifier(SQLITE_MIGRATION_TABLE)}`,
  );
  const uniqueIndexes = await readPostgresUniqueIndexes(client);
  const foreignKeys = await readPostgresForeignKeys(client);
  const foreignKeyIntegrity = await checkPostgresForeignKeys(
    client,
    foreignKeys,
  );
  const sequenceResult = await client.query(`
    SELECT table_name, column_name, column_default, is_identity
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        is_identity = 'YES'
        OR column_default LIKE 'nextval(%'
      )
    ORDER BY table_name, ordinal_position
  `);

  return {
    columns,
    modelRows,
    modelRowCounts,
    migrationRowCount: Number(migrationCountResult.rows[0].count),
    uniqueIndexes,
    foreignKeys,
    foreignKeyIntegrity,
    sequences: sequenceResult.rows,
    missingModelTables: modelTableNames.filter(
      (tableName) => !availableTables.has(tableName),
    ),
  };
}

function buildComparisonProjection(columns) {
  return columns
    .map((column) => {
      const identifier = quoteIdentifier(column.column_name);
      return column.data_type.includes('timestamp') ||
        column.data_type === 'date'
        ? `${identifier}::text AS ${identifier}`
        : identifier;
    })
    .join(', ');
}

async function readPostgresUniqueIndexes(client) {
  const result = await client.query(`
    SELECT
      table_class.relname AS table_name,
      index_class.relname AS index_name,
      index_definition.indisprimary AS is_primary,
      array_agg(attribute.attname ORDER BY index_column.ordinality) AS columns
    FROM pg_index AS index_definition
    JOIN pg_class AS table_class
      ON table_class.oid = index_definition.indrelid
    JOIN pg_namespace AS namespace
      ON namespace.oid = table_class.relnamespace
    JOIN pg_class AS index_class
      ON index_class.oid = index_definition.indexrelid
    CROSS JOIN LATERAL unnest(index_definition.indkey)
      WITH ORDINALITY AS index_column(attribute_number, ordinality)
    JOIN pg_attribute AS attribute
      ON attribute.attrelid = table_class.oid
      AND attribute.attnum = index_column.attribute_number
    WHERE namespace.nspname = 'public'
      AND index_definition.indisunique
      AND index_definition.indexprs IS NULL
      AND index_definition.indpred IS NULL
    GROUP BY
      table_class.relname,
      index_class.relname,
      index_definition.indisprimary
    ORDER BY table_class.relname, index_class.relname
  `);

  return result.rows.map((row) => ({
    tableName: row.table_name,
    indexName: row.index_name,
    isPrimary: row.is_primary,
    columns: normalizePostgresTextArray(row.columns),
  }));
}

async function readPostgresForeignKeys(client) {
  const result = await client.query(`
    SELECT
      constraint_definition.conname AS name,
      child_table.relname AS child_table,
      parent_table.relname AS parent_table,
      array_agg(child_column.attname ORDER BY key_column.ordinality) AS child_columns,
      array_agg(parent_column.attname ORDER BY key_column.ordinality) AS parent_columns
    FROM pg_constraint AS constraint_definition
    JOIN pg_class AS child_table
      ON child_table.oid = constraint_definition.conrelid
    JOIN pg_namespace AS namespace
      ON namespace.oid = child_table.relnamespace
    JOIN pg_class AS parent_table
      ON parent_table.oid = constraint_definition.confrelid
    CROSS JOIN LATERAL unnest(
      constraint_definition.conkey,
      constraint_definition.confkey
    ) WITH ORDINALITY AS key_column(
      child_attribute_number,
      parent_attribute_number,
      ordinality
    )
    JOIN pg_attribute AS child_column
      ON child_column.attrelid = child_table.oid
      AND child_column.attnum = key_column.child_attribute_number
    JOIN pg_attribute AS parent_column
      ON parent_column.attrelid = parent_table.oid
      AND parent_column.attnum = key_column.parent_attribute_number
    WHERE namespace.nspname = 'public'
      AND constraint_definition.contype = 'f'
    GROUP BY
      constraint_definition.conname,
      child_table.relname,
      parent_table.relname
    ORDER BY child_table.relname, constraint_definition.conname
  `);

  return result.rows.map((row) => ({
    name: row.name,
    childTable: row.child_table,
    parentTable: row.parent_table,
    childColumns: normalizePostgresTextArray(row.child_columns),
    parentColumns: normalizePostgresTextArray(row.parent_columns),
  }));
}

function normalizePostgresTextArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  const content = value.replace(/^\{|\}$/g, '');
  if (!content) return [];
  return content
    .split(',')
    .map((entry) => entry.replace(/^"|"$/g, '').replaceAll('\\"', '"'));
}

async function checkPostgresForeignKeys(client, foreignKeys) {
  const checks = [];
  for (const foreignKey of foreignKeys) {
    const join = foreignKey.childColumns
      .map(
        (childColumn, index) =>
          `child.${quoteIdentifier(childColumn)} = parent.${quoteIdentifier(foreignKey.parentColumns[index])}`,
      )
      .join(' AND ');
    const populatedChildKey = foreignKey.childColumns
      .map((column) => `child.${quoteIdentifier(column)} IS NOT NULL`)
      .join(' AND ');
    const missingParent = `parent.${quoteIdentifier(foreignKey.parentColumns[0])} IS NULL`;
    const result = await client.query(`
      SELECT COUNT(*)::text AS count
      FROM ${quoteIdentifier(foreignKey.childTable)} AS child
      LEFT JOIN ${quoteIdentifier(foreignKey.parentTable)} AS parent
        ON ${join}
      WHERE ${populatedChildKey}
        AND ${missingParent}
    `);
    checks.push({
      constraint: foreignKey.name,
      childTable: foreignKey.childTable,
      parentTable: foreignKey.parentTable,
      orphanRows: Number(result.rows[0].count),
    });
  }

  return {
    totalOrphans: checks.reduce((sum, check) => sum + check.orphanRows, 0),
    checks,
  };
}

function buildImportPlan(source, destination, models) {
  const tablePlans = {};
  let totalAlreadyPresent = 0;
  let totalToInsert = 0;
  let totalConflicts = 0;

  for (const { tableName } of models) {
    if (
      source.missingModelTables.includes(tableName) ||
      destination.missingModelTables.includes(tableName)
    ) {
      continue;
    }

    const destinationColumns = destination.columns[tableName];
    const sourceColumns = source.columns[tableName];
    const columnNames = destinationColumns.map(
      (column) => column.column_name,
    );
    const sourceColumnSet = new Set(sourceColumns);
    const destinationColumnSet = new Set(columnNames);
    const columnMismatch = {
      sourceOnly: sourceColumns.filter(
        (column) => !destinationColumnSet.has(column),
      ),
      destinationOnly: columnNames.filter(
        (column) => !sourceColumnSet.has(column),
      ),
    };
    const indexes = destination.uniqueIndexes.filter(
      (index) => index.tableName === tableName,
    );
    const primaryIndex = indexes.find((index) => index.isPrimary);
    if (!primaryIndex) {
      throw new Error(`Destination table ${tableName} has no primary key.`);
    }

    const destinationRows = destination.modelRows[tableName] ?? [];
    const destinationByIndex = new Map(
      indexes.map((index) => [
        index.indexName,
        new Map(
          destinationRows.flatMap((row) => {
            const key = constraintKey(row, index.columns, destinationColumns);
            return key === null ? [] : [[key, row]];
          }),
        ),
      ]),
    );
    const alreadyPresentRows = [];
    const rowsToInsert = [];
    const conflicts = [];

    for (const sourceRow of source.modelRows[tableName]) {
      const transformedRow = Object.fromEntries(
        destinationColumns.map((column) => [
          column.column_name,
          transformValue(sourceRow[column.column_name], column),
        ]),
      );
      const primaryKey = constraintKey(
        transformedRow,
        primaryIndex.columns,
        destinationColumns,
      );
      const destinationPrimaryRow =
        primaryKey === null
          ? undefined
          : destinationByIndex
              .get(primaryIndex.indexName)
              ?.get(primaryKey);

      if (destinationPrimaryRow) {
        const differingColumns = findDifferingColumns(
          transformedRow,
          destinationPrimaryRow,
          destinationColumns,
        );
        if (differingColumns.length === 0) {
          alreadyPresentRows.push(sourceRow);
        } else {
          conflicts.push({
            type: 'primary-key-data-mismatch',
            index: primaryIndex.indexName,
            columns: differingColumns,
          });
        }
        continue;
      }

      const conflictingIndex = indexes
        .filter((index) => !index.isPrimary)
        .find((index) => {
          const key = constraintKey(
            transformedRow,
            index.columns,
            destinationColumns,
          );
          return (
            key !== null &&
            destinationByIndex.get(index.indexName)?.has(key)
          );
        });

      if (conflictingIndex) {
        conflicts.push({
          type: 'unique-key-conflict',
          index: conflictingIndex.indexName,
        });
      } else {
        rowsToInsert.push(transformedRow);
      }
    }

    tablePlans[tableName] = {
      sourceRows: source.modelRows[tableName].length,
      destinationRows: destinationRows.length,
      alreadyPresent: alreadyPresentRows.length,
      toInsert: rowsToInsert.length,
      conflicts: conflicts.length,
      conflictSummary: summarizeConflicts(conflicts),
      columnMismatch,
      columnNames,
      rowsToInsert,
    };
    totalAlreadyPresent += alreadyPresentRows.length;
    totalToInsert += rowsToInsert.length;
    totalConflicts += conflicts.length;
  }

  return {
    tablePlans,
    totalAlreadyPresent,
    totalToInsert,
    totalConflicts,
  };
}

function transformValue(value, column) {
  if (value === null || value === undefined) return null;

  if (column.data_type === 'boolean') {
    return value === true || value === 1 || value === '1';
  }

  if (
    column.data_type.includes('timestamp') ||
    column.data_type === 'date'
  ) {
    const normalizedTimestamp = normalizeTimestamp(value);
    if (normalizedTimestamp === null) {
      throw new Error(
        `Invalid date value encountered for ${column.table_name}.${column.column_name}.`,
      );
    }
    return normalizedTimestamp;
  }

  if (
    column.data_type === 'smallint' ||
    column.data_type === 'integer' ||
    column.data_type === 'bigint'
  ) {
    return Number(value);
  }

  return value;
}

function constraintKey(row, columns, columnMetadata) {
  const values = columns.map((columnName) => {
    const column = columnMetadata.find(
      (entry) => entry.column_name === columnName,
    );
    return normalizeComparable(row[columnName], column);
  });

  if (values.some((value) => value === null)) return null;
  return JSON.stringify(values);
}

function findDifferingColumns(sourceRow, destinationRow, columns) {
  return columns.flatMap((column) => {
    const sourceValue = normalizeComparable(
      sourceRow[column.column_name],
      column,
    );
    const destinationValue = normalizeComparable(
      destinationRow[column.column_name],
      column,
    );
    return sourceValue === destinationValue ? [] : [column.column_name];
  });
}

function normalizeComparable(value, column) {
  if (value === null || value === undefined) return null;
  if (column?.data_type === 'boolean') return Boolean(value);
  if (
    column?.data_type.includes('timestamp') ||
    column?.data_type === 'date'
  ) {
    return normalizeTimestamp(value);
  }
  if (
    column?.data_type === 'smallint' ||
    column?.data_type === 'integer' ||
    column?.data_type === 'bigint'
  ) {
    return Number(value);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function normalizeTimestamp(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  let timestamp = String(value).trim();
  if (
    /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(
      timestamp,
    )
  ) {
    // Prisma maps DateTime to PostgreSQL TIMESTAMP(3) without a timezone.
    // Neon returns that value without a suffix, so interpret the stored wall
    // time as UTC to compare it with the original SQLite ISO timestamp.
    timestamp = `${timestamp.replace(' ', 'T')}Z`;
  }

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function summarizeConflicts(conflicts) {
  const counts = new Map();
  for (const conflict of conflicts) {
    const columns = [...(conflict.columns ?? [])].sort().join(',');
    const key = `${conflict.type}:${conflict.index}:${columns}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([key, count]) => {
    const [type, index, columns] = key.split(':');
    return {
      type,
      index,
      differingColumns: columns ? columns.split(',') : [],
      count,
    };
  });
}

function buildDryRunReport({
  sourcePath,
  source,
  backup,
  destination,
  destinationSnapshot,
  models,
  plan,
}) {
  const tablePlanReport = Object.fromEntries(
    Object.entries(plan.tablePlans).map(([tableName, tablePlan]) => [
      tableName,
      {
        sourceRows: tablePlan.sourceRows,
        destinationRows: tablePlan.destinationRows,
        alreadyPresent: tablePlan.alreadyPresent,
        wouldInsert: tablePlan.toInsert,
        conflicts: tablePlan.conflicts,
        conflictSummary: tablePlan.conflictSummary,
        columnMismatch: tablePlan.columnMismatch,
      },
    ]),
  );
  const sourceTotal = sumCounts(source.modelRowCounts);
  const destinationTotal = sumCounts(destinationSnapshot.modelRowCounts);

  return {
    mode: 'dry-run',
    writePerformed: false,
    sourceDatabase: sourceDescriptor(sourcePath),
    backup,
    destination,
    schema: {
      prismaModels: models.length,
      modelTables: models,
      missingSourceModelTables: source.missingModelTables,
      missingDestinationModelTables:
        destinationSnapshot.missingModelTables,
      nonModelSqliteTables: source.nonModelTables,
      sqliteMigrationRowsInspectedButNeverImported:
        source.allTableRowCounts[SQLITE_MIGRATION_TABLE] ?? 0,
      neonMigrationRowsPreserved:
        destinationSnapshot.migrationRowCount,
    },
    sourceRowCounts: source.allTableRowCounts,
    destinationRowCounts: destinationSnapshot.modelRowCounts,
    totals: {
      sourceModelRows: sourceTotal,
      destinationModelRows: destinationTotal,
      rowsAlreadyPresent: plan.totalAlreadyPresent,
      rowsThatWouldBeInserted: plan.totalToInsert,
      conflicts: plan.totalConflicts,
    },
    neonCurrentlyEmpty:
      Object.values(destinationSnapshot.modelRowCounts).every(
        (count) => count === 0,
      ),
    insertionOrder: source.insertionOrder,
    tablePlan: tablePlanReport,
    importantRecords: buildImportantRecordReport(
      source.modelRowCounts,
      destinationSnapshot.modelRowCounts,
    ),
    integrity: {
      sqliteIntegrity: source.integrity,
      sqliteForeignKeyViolations: source.foreignKeyViolations.length,
      neonForeignKeyOrphans:
        destinationSnapshot.foreignKeyIntegrity.totalOrphans,
      neonForeignKeyChecks:
        destinationSnapshot.foreignKeyIntegrity.checks,
    },
    sequences: {
      detected: destinationSnapshot.sequences,
      resetRequired: destinationSnapshot.sequences.length > 0,
    },
    safeToApply:
      source.integrity === 'ok' &&
      source.foreignKeyViolations.length === 0 &&
      source.missingModelTables.length === 0 &&
      destinationSnapshot.missingModelTables.length === 0 &&
      plan.totalConflicts === 0 &&
      Object.values(plan.tablePlans).every(
        (tablePlan) =>
          tablePlan.columnMismatch.sourceOnly.length === 0 &&
          tablePlan.columnMismatch.destinationOnly.length === 0,
      ),
  };
}

function assertPlanIsWritable(source, destination, plan) {
  if (source.integrity !== 'ok') {
    throw new Error(
      `SQLite integrity check returned ${source.integrity}. No rows were written.`,
    );
  }
  if (source.foreignKeyViolations.length > 0) {
    throw new Error(
      `SQLite has ${source.foreignKeyViolations.length} foreign-key violations. No rows were written.`,
    );
  }
  if (source.missingModelTables.length > 0) {
    throw new Error(
      `SQLite is missing model tables: ${source.missingModelTables.join(', ')}. No rows were written.`,
    );
  }
  if (destination.missingModelTables.length > 0) {
    throw new Error(
      `Neon is missing model tables: ${destination.missingModelTables.join(', ')}. No rows were written.`,
    );
  }
  if (plan.totalConflicts > 0) {
    throw new Error(
      `Found ${plan.totalConflicts} conflicting Neon rows. The importer never overwrites destination data, so no rows were written.`,
    );
  }

  const mismatchedTables = Object.entries(plan.tablePlans)
    .filter(
      ([, tablePlan]) =>
        tablePlan.columnMismatch.sourceOnly.length > 0 ||
        tablePlan.columnMismatch.destinationOnly.length > 0,
    )
    .map(([tableName]) => tableName);
  if (mismatchedTables.length > 0) {
    throw new Error(
      `Source/destination columns differ for: ${mismatchedTables.join(', ')}. No rows were written.`,
    );
  }
}

async function importRows(client, source, destination, plan) {
  const tables = [];
  let rowsCopied = 0;
  let rowsSkipped = 0;

  for (const tableName of source.insertionOrder) {
    const tablePlan = plan.tablePlans[tableName];
    if (!tablePlan) continue;

    let tableCopied = 0;
    const rows = tablePlan.rowsToInsert;
    const columns = tablePlan.columnNames;
    const batchSize = Math.max(
      1,
      Math.floor(MAX_INSERT_PARAMETERS / Math.max(columns.length, 1)),
    );

    for (let offset = 0; offset < rows.length; offset += batchSize) {
      const batch = rows.slice(offset, offset + batchSize);
      const parameters = [];
      const valueGroups = batch.map((row) => {
        const placeholders = columns.map((columnName) => {
          parameters.push(row[columnName]);
          return `$${parameters.length}`;
        });
        return `(${placeholders.join(', ')})`;
      });
      const result = await client.query(
        `
          INSERT INTO ${quoteIdentifier(tableName)}
            (${columns.map(quoteIdentifier).join(', ')})
          VALUES ${valueGroups.join(', ')}
          ON CONFLICT DO NOTHING
        `,
        parameters,
      );
      tableCopied += result.rowCount ?? 0;
    }

    rowsCopied += tableCopied;
    rowsSkipped += tablePlan.sourceRows - tableCopied;
    tables.push({
      table: tableName,
      sourceRows: tablePlan.sourceRows,
      copied: tableCopied,
      skipped: tablePlan.sourceRows - tableCopied,
      failures: 0,
    });
  }

  const sequences = await resetSequences(client, destination.sequences);
  return { tables, rowsCopied, rowsSkipped, sequences };
}

async function resetSequences(client, sequences) {
  const results = [];
  for (const sequence of sequences) {
    const sequenceNameResult = await client.query(
      'SELECT pg_get_serial_sequence($1, $2) AS sequence_name',
      [`public.${sequence.table_name}`, sequence.column_name],
    );
    const sequenceName = sequenceNameResult.rows[0]?.sequence_name;
    if (!sequenceName) continue;

    const maxResult = await client.query(
      `SELECT MAX(${quoteIdentifier(sequence.column_name)}) AS maximum FROM ${quoteIdentifier(sequence.table_name)}`,
    );
    const maximum = maxResult.rows[0]?.maximum;
    if (maximum === null || maximum === undefined) {
      results.push({
        table: sequence.table_name,
        column: sequence.column_name,
        sequence: sequenceName,
        reset: false,
        reason: 'table-empty',
      });
      continue;
    }

    await client.query(
      'SELECT setval($1::regclass, $2::bigint, true)',
      [sequenceName, maximum],
    );
    results.push({
      table: sequence.table_name,
      column: sequence.column_name,
      sequence: sequenceName,
      reset: true,
    });
  }
  return results;
}

function buildImportantRecordReport(sourceCounts, destinationCounts) {
  return Object.fromEntries(
    Object.entries(IMPORTANT_TABLE_GROUPS).map(([group, tables]) => [
      group,
      {
        tables: Object.fromEntries(
          tables.map((tableName) => [
            tableName,
            {
              source: sourceCounts[tableName] ?? 0,
              destination: destinationCounts[tableName] ?? 0,
            },
          ]),
        ),
        sourceTotal: tables.reduce(
          (sum, tableName) => sum + (sourceCounts[tableName] ?? 0),
          0,
        ),
        destinationTotal: tables.reduce(
          (sum, tableName) => sum + (destinationCounts[tableName] ?? 0),
          0,
        ),
      },
    ]),
  );
}

function compareCounts(sourceCounts, destinationCounts) {
  return Object.fromEntries(
    Object.entries(sourceCounts).map(([tableName, source]) => [
      tableName,
      {
        source,
        destination: destinationCounts[tableName] ?? 0,
        difference: (destinationCounts[tableName] ?? 0) - source,
      },
    ]),
  );
}

function sumCounts(counts) {
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

function groupBy(rows, key) {
  const groups = {};
  for (const row of rows) {
    const groupKey = row[key];
    groups[groupKey] ??= [];
    groups[groupKey].push(row);
  }
  return groups;
}

function quoteIdentifier(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

async function safeRollback(client) {
  try {
    await client.query('ROLLBACK');
  } catch {
    // Preserve the original failure.
  }
}

function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(
      /postgres(?:ql)?:\/\/[^@\s]+@/gi,
      'postgresql://[REDACTED]@',
    )
    .replace(/password=[^&\s]+/gi, 'password=[REDACTED]');
}

main().catch((error) => {
  console.error(`Import inspection failed: ${sanitizeError(error)}`);
  process.exitCode = 1;
});
