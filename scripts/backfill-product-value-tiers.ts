/**
 * One-time, audited Value Tier backfill.
 *
 * This is intentionally a CLI migration utility, not an admin CSV import feature.
 * It reads only the project owner's fixed ALINKS.CSV and changes only Product.valueTier.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

import { PrismaNeon } from '@prisma/adapter-neon';
import { loadEnvConfig } from '@next/env';

import { PrismaClient } from '../generated/prisma/client';
import { parseProductValueTierCsv } from '../app/lib/product-value-tier-csv';
import {
  buildValueTierMapping,
  type ValueTierMappingReport,
} from '../app/lib/product-value-tier-matching';

const CSV_PATH =
  'C:\\Users\\doms7\\OneDrive\\Documents\\GTA 6 CHECKER\\gta6-pc-checker\\public\\affiliate links\\ALINKS.CSV';

loadEnvConfig(process.cwd());

const applyChanges = process.argv.includes('--apply');
const databaseUrl = requireNeonDatabaseUrl();
const adapter = new PrismaNeon({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  if (!existsSync(CSV_PATH)) {
    throw new Error(`Required CSV was not found at the exact requested path: ${CSV_PATH}`);
  }

  const parsedCsv = parseProductValueTierCsv(readFileSync(CSV_PATH, 'utf8'));
  const rows = parsedCsv.rows;
  const products = await prisma.product.findMany({
    select: { id: true, title: true, componentType: true, valueTier: true },
    orderBy: [{ componentType: 'asc' }, { title: 'asc' }],
  });
  const mapping = buildValueTierMapping(rows, products);
  const accepted = [...mapping.exactMatches, ...mapping.highConfidenceMatches];
  const currentTierByProduct = new Map(
    products.map((product) => [product.id, product.valueTier]),
  );
  const alreadyCorrect = accepted.filter(
    (match) => currentTierByProduct.get(match.product.id) === match.row.valueTier,
  );
  const conflictingExistingTiers = accepted.filter((match) => {
    const currentTier = currentTierByProduct.get(match.product.id);
    return currentTier !== null && currentTier !== match.row.valueTier;
  });
  const updateCandidates = accepted.filter(
    (match) => currentTierByProduct.get(match.product.id) === null,
  );

  if (applyChanges && accepted.length === 0) {
    throw new Error('The dry-run mapping found zero matches. No changes were applied.');
  }

  const protectedStateBefore =
    applyChanges && updateCandidates.length > 0 ? await protectedStateDigest() : null;

  let productsUpdated = 0;
  if (applyChanges && updateCandidates.length > 0) {
    await prisma.$transaction(async (transaction) => {
      for (const match of updateCandidates) {
        const result = await transaction.product.updateMany({
          where: {
            id: match.product.id,
            valueTier: null,
          },
          data: { valueTier: match.row.valueTier },
        });
        productsUpdated += result.count;
      }
    });
  }

  const protectedStateAfter =
    applyChanges && updateCandidates.length > 0 ? await protectedStateDigest() : null;
  if (protectedStateBefore !== protectedStateAfter) {
    throw new Error('Protected product or assignment data changed unexpectedly.');
  }
  const storedTiers = await prisma.product.findMany({
    where: { valueTier: { not: null } },
    select: { id: true, title: true, valueTier: true },
    orderBy: [{ valueTier: 'asc' }, { title: 'asc' }],
  });
  const storedTierByProduct = new Map(
    storedTiers.map((product) => [product.id, product.valueTier]),
  );
  const matchedProductsHaveExpectedTier = accepted.every(
    (match) => storedTierByProduct.get(match.product.id) === match.row.valueTier,
  );
  const updatedProductsHaveExpectedTier = updateCandidates.every(
    (match) => storedTierByProduct.get(match.product.id) === match.row.valueTier,
  );
  if (applyChanges && !updatedProductsHaveExpectedTier) {
    throw new Error('One or more updated products did not receive the expected Value Tier.');
  }

  const output = {
    mode: applyChanges ? 'apply' : 'dry-run',
    csvFile: CSV_PATH,
    databaseFile: describeDatabase(databaseUrl),
    detectedHeaders: parsedCsv.detectedHeaders,
    existingProducts: products.length,
    summary: {
      csvRowsRead: parsedCsv.rowsRead,
      rowsWithValidValueTier: rows.length,
      invalidCsvRows: parsedCsv.invalidRows.length,
      productsMatched: accepted.length,
      productsWouldBeUpdated: updateCandidates.length,
      productsAlreadyCorrect: alreadyCorrect.length,
      conflictingExistingTiers: conflictingExistingTiers.length,
      productsUpdated,
      exactMatches: mapping.exactMatches.length,
      highConfidenceMatches: mapping.highConfidenceMatches.length,
      ambiguousMatches: mapping.ambiguousMatches.length,
      unmatchedCsvRows: mapping.unmatchedCsvRows.length,
      existingProductsWithoutCsvMatches: mapping.existingProductsWithoutCsvMatches.length,
      productsWithValueTier: storedTiers.length,
    },
    sampleMatches: accepted.slice(0, 8).map((match) => ({
      csvTitle: match.row.productTitle,
      databaseTitle: match.product.title,
      valueTier: match.row.valueTier,
      status:
        currentTierByProduct.get(match.product.id) === match.row.valueTier
          ? 'already-correct'
          : currentTierByProduct.get(match.product.id) === null
            ? 'would-update'
            : 'existing-tier-conflict',
    })),
    invalidCsvRows: parsedCsv.invalidRows,
    conflictingExistingTiers: conflictingExistingTiers.map((match) => ({
      csvTitle: match.row.productTitle,
      databaseTitle: match.product.title,
      csvValueTier: match.row.valueTier,
      existingValueTier: currentTierByProduct.get(match.product.id),
    })),
    ...serializeMapping(mapping),
    protectedFieldsUnchanged:
      protectedStateBefore === null || protectedStateBefore === protectedStateAfter,
    matchedProductsHaveExpectedTier,
    updatedProductsHaveExpectedTier,
    storedTiers,
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

function serializeMapping(mapping: ValueTierMappingReport) {
  const serializeMatch = (match: ValueTierMappingReport['exactMatches'][number]) => ({
    csvRow: match.row.rowNumber,
    csvTitle: match.row.productTitle,
    category: match.row.category,
    valueTier: match.row.valueTier,
    productId: match.product.id,
    productTitle: match.product.title,
    matchKind: match.matchKind,
  });

  return {
    exactMatches: mapping.exactMatches.map(serializeMatch),
    highConfidenceMatches: mapping.highConfidenceMatches.map(serializeMatch),
    ambiguousMatches: mapping.ambiguousMatches.map((match) => ({
      csvRow: match.row.rowNumber,
      csvTitle: match.row.productTitle,
      category: match.row.category,
      valueTier: match.row.valueTier,
      reason: match.reason,
      candidates: match.candidates,
    })),
    unmatchedCsvRows: mapping.unmatchedCsvRows,
    existingProductsWithoutCsvMatches: mapping.existingProductsWithoutCsvMatches,
  };
}

async function protectedStateDigest() {
  const [products, assignments, creatorAssignments] = await Promise.all([
    prisma.product.findMany({
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
    prisma.recommendationAssignment.findMany({ orderBy: { id: 'asc' } }),
    prisma.creatorProductAssignment.findMany({ orderBy: { id: 'asc' } }),
  ]);

  return createHash('sha256')
    .update(JSON.stringify({ products, assignments, creatorAssignments }))
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
