/**
 * One-time, ID-only Value Tier backfill.
 *
 * This is not a product importer. It reads only Product ID and Value Tier from
 * the fixed CSV and updates only Product.valueTier.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

import { PrismaNeon } from '@prisma/adapter-neon';
import { loadEnvConfig } from '@next/env';

import { PRODUCT_VALUE_TIERS, type ProductValueTier } from '../app/lib/affiliate-types';
import { PrismaClient, type Prisma } from '../generated/prisma/client';

const CSV_PATH =
  'C:\\Users\\doms7\\OneDrive\\Documents\\GTA 6 CHECKER\\gta6-pc-checker\\public\\affiliate links\\07-23-26AL_with_tiers.csv';

loadEnvConfig(process.cwd());

const applyChanges = process.argv.includes('--apply');
const databaseUrl = requireNeonDatabaseUrl();
const adapter = new PrismaNeon({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

interface CsvRow {
  rowNumber: number;
  productId: string;
  csvTitle: string;
  rawValueTier: string;
}

interface ValidCsvRow extends CsvRow {
  valueTier: ProductValueTier;
}

async function main() {
  if (!existsSync(CSV_PATH)) {
    throw new Error(`Required CSV was not found at the exact requested path: ${CSV_PATH}`);
  }

  const parsed = parseTierCsv(readFileSync(CSV_PATH, 'utf8'));
  const products = await prisma.product.findMany({
    select: { id: true, title: true, valueTier: true },
    orderBy: { id: 'asc' },
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  const missingProductIdRows = parsed.rows.filter((row) => !row.productId);
  const rowsWithProductIds = parsed.rows.filter((row) => Boolean(row.productId));
  const exactIdRows = rowsWithProductIds.filter((row) => productById.has(row.productId));
  const unmatchedProductIdRows = rowsWithProductIds.filter(
    (row) => !productById.has(row.productId),
  );
  const blankTierRows = exactIdRows.filter((row) => !row.rawValueTier);
  const invalidTierRows = exactIdRows.filter(
    (row) => row.rawValueTier && !isValueTier(row.rawValueTier),
  );
  const validRows: ValidCsvRow[] = exactIdRows.flatMap((row) =>
    isValueTier(row.rawValueTier)
      ? [{ ...row, valueTier: row.rawValueTier }]
      : [],
  );

  const duplicateRowsSkipped: CsvRow[] = [];
  const conflictingDuplicateIds: Array<{
    productId: string;
    rows: ValidCsvRow[];
  }> = [];
  const acceptedById = new Map<string, ValidCsvRow>();

  for (const [productId, rows] of groupByProductId(validRows)) {
    const tiers = new Set(rows.map((row) => row.valueTier));
    if (tiers.size > 1) {
      conflictingDuplicateIds.push({ productId, rows });
      continue;
    }
    acceptedById.set(productId, rows[0]);
    duplicateRowsSkipped.push(...rows.slice(1));
  }

  const acceptedRows = Array.from(acceptedById.values());
  const productsAlreadyCorrect = acceptedRows.filter(
    (row) => productById.get(row.productId)?.valueTier === row.valueTier,
  );
  const productsToUpdate = acceptedRows.filter(
    (row) => productById.get(row.productId)?.valueTier !== row.valueTier,
  );

  if (applyChanges && exactIdRows.length === 0) {
    throw new Error('The dry run found zero exact Product ID matches. No changes were applied.');
  }

  let productsUpdated = 0;
  let protectedFieldsUnchanged = true;
  if (applyChanges && productsToUpdate.length > 0) {
    await prisma.$transaction(async (transaction) => {
      const protectedStateBefore = await protectedStateDigest(transaction);
      for (const row of productsToUpdate) {
        await transaction.product.update({
          where: { id: row.productId },
          data: { valueTier: row.valueTier },
        });
        productsUpdated += 1;
      }
      const protectedStateAfter = await protectedStateDigest(transaction);
      protectedFieldsUnchanged = protectedStateBefore === protectedStateAfter;
      if (!protectedFieldsUnchanged) {
        throw new Error('A protected product, assignment, or article field changed. Rolled back.');
      }
    });
  }

  const updatedProducts = await prisma.product.findMany({
    where: { id: { in: acceptedRows.map((row) => row.productId) } },
    select: {
      id: true,
      title: true,
      valueTier: true,
      affiliateUrl: true,
      imageUrl: true,
      retailer: true,
      componentType: true,
      shortDescription: true,
      enabled: true,
    },
    orderBy: { id: 'asc' },
  });
  const updatedProductById = new Map(updatedProducts.map((product) => [product.id, product]));
  const allAcceptedTiersVerified = acceptedRows.every(
    (row) => updatedProductById.get(row.productId)?.valueTier === row.valueTier,
  );
  if (applyChanges && !allAcceptedTiersVerified) {
    throw new Error('One or more accepted products did not receive the expected Value Tier.');
  }

  const skippedRowNumbers = new Set([
    ...missingProductIdRows.map((row) => row.rowNumber),
    ...unmatchedProductIdRows.map((row) => row.rowNumber),
    ...blankTierRows.map((row) => row.rowNumber),
    ...invalidTierRows.map((row) => row.rowNumber),
    ...duplicateRowsSkipped.map((row) => row.rowNumber),
    ...conflictingDuplicateIds.flatMap((entry) => entry.rows.map((row) => row.rowNumber)),
  ]);
  const examples = productsToUpdate.slice(0, 10).map((row) => ({
    productId: row.productId,
    productTitle: productById.get(row.productId)?.title ?? '',
    currentTier: productById.get(row.productId)?.valueTier ?? '',
    newTier: row.valueTier,
  }));

  process.stdout.write(`${JSON.stringify({
    mode: applyChanges ? 'apply' : 'dry-run',
    csvFile: CSV_PATH,
    databaseFile: describeDatabase(databaseUrl),
    detectedHeaders: parsed.detectedHeaders,
    summary: {
      totalCsvRows: parsed.rows.length,
      productIdsFound: rowsWithProductIds.length,
      exactProductIdMatches: exactIdRows.length,
      uniqueExactProductIdMatches: new Set(exactIdRows.map((row) => row.productId)).size,
      missingProductIds: missingProductIdRows.length,
      unmatchedProductIds: unmatchedProductIdRows.length,
      blankValueTiers: blankTierRows.length,
      invalidValueTierValues: invalidTierRows.length,
      duplicateRowsSkipped: duplicateRowsSkipped.length,
      conflictingDuplicateIds: conflictingDuplicateIds.length,
      productsAlreadyCorrect: productsAlreadyCorrect.length,
      productsWouldBeUpdated: productsToUpdate.length,
      productsUpdated,
      rowsSkipped: skippedRowNumbers.size,
    },
    examples,
    missingProductIdRows,
    unmatchedProductIdRows,
    blankTierRows,
    invalidTierRows,
    duplicateRowsSkipped,
    conflictingDuplicateIds,
    protectedFieldsUnchanged,
    allAcceptedTiersVerified,
    verifiedProducts: updatedProducts,
  }, null, 2)}\n`);
}

function parseTierCsv(source: string) {
  const records = parseCsv(source.replace(/^\uFEFF/, ''));
  const headers = records[0]?.map((header) => header.trim()) ?? [];
  const productIdIndex = findHeader(headers, 'productid');
  const productTitleIndex = findHeader(headers, 'producttitle');
  const valueTierIndex = findHeader(headers, 'valuetier');

  if (productIdIndex < 0 || valueTierIndex < 0) {
    throw new Error(
      `CSV must contain Product ID and Value Tier columns. Found: ${headers.join(', ')}`,
    );
  }

  const dataRecords = records.slice(1).filter((record) =>
    record.some((value) => value.trim().length > 0),
  );
  const rows = dataRecords.map((record, index): CsvRow => ({
    rowNumber: index + 2,
    productId: record[productIdIndex]?.trim() ?? '',
    csvTitle: productTitleIndex >= 0 ? record[productTitleIndex]?.trim() ?? '' : '',
    rawValueTier: record[valueTierIndex]?.trim() ?? '',
  }));

  return {
    detectedHeaders: {
      productId: headers[productIdIndex],
      productTitle: productTitleIndex >= 0 ? headers[productTitleIndex] : null,
      valueTier: headers[valueTierIndex],
    },
    rows,
  };
}

function parseCsv(source: string) {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      record.push(field);
      field = '';
    } else if ((character === '\r' || character === '\n') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      record.push(field);
      if (record.some((value) => value.length > 0)) records.push(record);
      record = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error('CSV contains an unterminated quoted field.');
  record.push(field);
  if (record.some((value) => value.length > 0)) records.push(record);
  return records;
}

function findHeader(headers: string[], expected: string) {
  return headers.findIndex(
    (header) => header.toLowerCase().replace(/[^a-z0-9]+/g, '') === expected,
  );
}

function isValueTier(value: string): value is ProductValueTier {
  return PRODUCT_VALUE_TIERS.includes(value as ProductValueTier);
}

function groupByProductId(rows: ValidCsvRow[]) {
  const grouped = new Map<string, ValidCsvRow[]>();
  for (const row of rows) {
    const group = grouped.get(row.productId) ?? [];
    group.push(row);
    grouped.set(row.productId, group);
  }
  return grouped;
}

type ProtectedClient = Prisma.TransactionClient;

async function protectedStateDigest(client: ProtectedClient) {
  const [products, assignments, creatorAssignments, affiliateProducts, articles] =
    await Promise.all([
      client.product.findMany({
        select: {
          id: true,
          title: true,
          canonicalName: true,
          componentType: true,
          shortDescription: true,
          imageUrl: true,
          retailer: true,
          affiliateUrl: true,
          defaultPriceText: true,
          platform: true,
          enabled: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { id: 'asc' },
      }),
      client.recommendationAssignment.findMany({ orderBy: { id: 'asc' } }),
      client.creatorProductAssignment.findMany({ orderBy: { id: 'asc' } }),
      client.affiliateProduct.findMany({ orderBy: { id: 'asc' } }),
      client.article.findMany({ orderBy: { id: 'asc' } }),
    ]);

  return createHash('sha256')
    .update(JSON.stringify({
      products,
      assignments,
      creatorAssignments,
      affiliateProducts,
      articles,
    }))
    .digest('hex');
}

function describeDatabase(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return 'Configured PostgreSQL database';
  }
}

function requireNeonDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || !/^postgres(?:ql)?:\/\//i.test(url)) {
    throw new Error('DATABASE_URL must contain a Neon PostgreSQL connection string.');
  }
  return url;
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
