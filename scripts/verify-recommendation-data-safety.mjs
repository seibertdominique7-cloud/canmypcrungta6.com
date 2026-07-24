import crypto from 'node:crypto';
import Database from 'better-sqlite3';

const [backupPath, currentPath = 'dev.db'] = process.argv.slice(2);

if (!backupPath) {
  throw new Error('Pass the pre-migration database backup path.');
}

const backup = new Database(backupPath, { readonly: true });
const current = new Database(currentPath, { readonly: true });
const protectedTables = [
  'Product',
  'RecommendationAssignment',
  'CreatorProductAssignment',
  'AffiliateProduct',
  'GamePurchaseLink',
];
const result = {};

for (const table of protectedTables) {
  const before = stableTable(backup, table);
  const after = stableTable(current, table);
  result[table] = {
    before: JSON.parse(before).length,
    after: JSON.parse(after).length,
    unchanged: hash(before) === hash(after),
  };
}

const products = current.prepare('SELECT * FROM Product').all();
result.recommendationRules = count(current, 'RecommendationRule');
result.creatorRecommendationRules = count(current, 'CreatorRecommendationRule');
result.ruleOverrides = count(current, 'RecommendationRuleOverride');
result.placeholderProducts = products.filter(
  (product) =>
    /example\.com/i.test(product.affiliateUrl) ||
    /seed placeholder|replace the url/i.test(product.shortDescription),
).length;

console.log(JSON.stringify(result, null, 2));

function stableTable(database, table) {
  return JSON.stringify(database.prepare(`SELECT * FROM "${table}" ORDER BY id`).all());
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function count(database, table) {
  return database.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get().count;
}
