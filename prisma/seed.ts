import { loadEnvConfig } from '@next/env';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../generated/prisma/client';
import { CORE_RECOMMENDATION_SCENARIOS } from '../app/data/recommendation-scenarios';
import { PREBUILT_RECOMMENDATION_GROUPS } from '../app/data/prebuilt-groups';
import {
  DEFAULT_RECOMMENDATION_SECTIONS,
  getDefaultSectionId,
} from '../app/data/recommendation-sections';
import { DEFAULT_AD_PLACEMENTS } from '../app/data/ad-placements';
import { REQUIRED_PAGES } from '../app/data/required-pages';
import { CREATOR_SCENARIO_DEFAULTS } from '../app/data/creator-recommendations';

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is not configured. Add the pooled Neon PostgreSQL connection string before seeding.',
  );
}

if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
  throw new Error('DATABASE_URL must be a PostgreSQL connection string.');
}

const adapter = new PrismaNeon({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const defaultContentCategories = [
  'GTA VI News',
  'System Requirements',
  'GPU Guides',
  'CPU Guides',
  'Gaming Laptops',
  'Prebuilt Gaming PCs',
  'Upgrade Guides',
  'Comparisons',
  'Deals',
  'Tutorials',
] as const;

const defaultMediaFolders = [
  'Articles',
  'Products',
  'GPUs',
  'CPUs',
  'RAM',
  'Storage',
  'Laptops',
  'Desktops',
  'Homepage',
  'Logos',
  'Miscellaneous',
] as const;

const defaultSiteContent = [
  ['homepage_title', 'Homepage title', 'Can My PC Run GTA VI?', 'text', 'Homepage'],
  ['homepage_description', 'Homepage description', 'Check if your gaming rig meets the current requirements for Grand Theft Auto VI. Get instant compatibility results and personalized upgrade recommendations.', 'textarea', 'Homepage'],
  ['upload_button_text', 'Upload button text', 'Upload Screenshot', 'text', 'Checker'],
  ['manual_entry_button_text', 'Manual entry button text', 'Enter Specs Manually', 'text', 'Checker'],
  ['scanner_coming_soon_text', 'Scanner coming-soon text', 'Automatic PC scanning is coming soon.', 'text', 'Checker'],
  ['affiliate_disclosure', 'Affiliate disclosure', 'Disclosure: We may earn a commission when you purchase through links on this page, at no additional cost to you.', 'textarea', 'Monetization'],
  ['email_signup_heading', 'Email signup heading', 'Get GTA VI PC updates', 'text', 'Email'],
  ['email_signup_description', 'Email signup description', 'Get requirement updates and occasional gaming hardware offers.', 'textarea', 'Email'],
  ['footer_text', 'Footer text', 'CanMyPCRunGTA6 helps PC players understand estimated GTA VI hardware requirements.', 'textarea', 'Footer'],
  ['estimated_requirements_disclaimer', 'Estimated requirements disclaimer', 'Rockstar Games has not published official GTA VI PC requirements. These values are estimates and may change.', 'textarea', 'Checker'],
  ['navigation_articles_label', 'Articles navigation label', 'Articles', 'text', 'Navigation'],
  ['navigation_checker_label', 'Checker navigation label', 'PC Checker', 'text', 'Navigation'],
  ['contact_email', 'Contact email', '', 'email', 'Contact'],
  ['social_links', 'Social links', '{}', 'json', 'Contact'],
] as const;

async function main() {
  for (const scenario of CORE_RECOMMENDATION_SCENARIOS) {
    await prisma.recommendationScenario.upsert({
      where: { code: scenario.code },
      update: {
        isCore: true,
        groupType: 'SCENARIO',
      },
      create: {
        code: scenario.code,
        displayName: scenario.displayName,
        resultHeading: scenario.heading,
        resultDescription: scenario.description,
        displayOrder: scenario.displayOrder,
        enabled: true,
        isCore: true,
        groupType: 'SCENARIO',
      },
    });
  }

  for (const group of PREBUILT_RECOMMENDATION_GROUPS) {
    await prisma.recommendationScenario.upsert({
      where: { code: group.code },
      update: {
        isCore: true,
        groupType: 'PREBUILT',
      },
      create: {
        code: group.code,
        displayName: group.displayName,
        resultHeading: group.heading,
        resultDescription: group.description,
        displayOrder: group.displayOrder,
        enabled: true,
        isCore: true,
        groupType: 'PREBUILT',
      },
    });
  }

  const scenarios = await prisma.recommendationScenario.findMany({
    select: { id: true, code: true },
  });
  const scenarioIds = new Map(scenarios.map((scenario) => [scenario.code, scenario.id]));

  await seedCreatorRecommendations(scenarioIds);

  let defaultSectionCount = 0;

  for (const [scenarioCode, sections] of Object.entries(
    DEFAULT_RECOMMENDATION_SECTIONS,
  )) {
    const scenarioId = scenarioIds.get(scenarioCode);

    if (!scenarioId) continue;

    for (const [index, section] of sections.entries()) {
      await prisma.recommendationSection.upsert({
        where: { id: getDefaultSectionId(scenarioCode, section.key) },
        update: { isCore: true },
        create: {
          id: getDefaultSectionId(scenarioCode, section.key),
          scenarioId,
          title: section.title,
          description: section.description,
          enabled: true,
          displayOrder: (index + 1) * 10,
          maxProducts: section.maxProducts,
          collapsedByDefault: section.collapsedByDefault,
          layout: section.layout,
          purpose: section.purpose,
          isCore: true,
        },
      });
      defaultSectionCount += 1;
    }
  }

  // Product records are deliberately never seeded here. The admin catalog is
  // authoritative, so rerunning this explicit structural seed cannot restore a
  // product that an administrator deleted.
  await seedContentManagement();
  await seedAdManagement();

  console.log(
    `Seeded ${CORE_RECOMMENDATION_SCENARIOS.length} result scenarios, ${defaultSectionCount} editable sections, and ${PREBUILT_RECOMMENDATION_GROUPS.length} preserved legacy prebuilt groups. Affiliate products were left unchanged.`,
  );
}

async function seedCreatorRecommendations(scenarioIds: Map<string, string>) {
  const existingCount = await prisma.creatorRecommendation.count();
  if (existingCount > 0) return;

  for (const [scenarioCode, copy] of Object.entries(CREATOR_SCENARIO_DEFAULTS)) {
    const scenarioId = scenarioIds.get(scenarioCode);
    if (!scenarioId) continue;

    await prisma.creatorRecommendation.create({
      data: {
        scenarioId,
        enabled: false,
        headline: copy.headline,
        subheadline: copy.subheadline,
        description: copy.description,
        warningText: copy.warningText,
        primaryCtaLabel: copy.primaryCtaLabel,
        primaryCtaUrl: copy.primaryCtaUrl,
        secondaryCtaLabel: copy.secondaryCtaLabel,
        secondaryCtaUrl: copy.secondaryCtaUrl,
      },
    });
  }
}

async function seedAdManagement() {
  await prisma.adGlobalSettings.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      masterEnabled: false,
      defaultProvider: 'disabled',
      adsenseClient: '',
      debugPlaceholders: false,
      defaultLabel: 'Advertisement',
      defaultResponsive: true,
    },
  });

  for (const placement of DEFAULT_AD_PLACEMENTS) {
    await prisma.adPlacement.upsert({
      where: { code: placement.code },
      update: {},
      create: {
        id: `ad-${placement.code}`,
        code: placement.code,
        displayName: placement.displayName,
        description: placement.description,
        enabled: false,
        provider: 'disabled',
        useGlobalClient: true,
        adClientOverride: '',
        adSlot: '',
        format: placement.defaultFormat,
        responsive: true,
        deviceTarget: placement.defaultDeviceTarget,
        label: '',
        displayOrder: placement.displayOrder,
        customHtml: '',
        customHtmlTrusted: false,
      },
    });
  }
}

async function seedContentManagement() {
  for (const [index, name] of defaultMediaFolders.entries()) {
    const slug = slugify(name);
    await prisma.mediaFolder.upsert({
      where: { slug },
      update: {},
      create: { name, slug, displayOrder: (index + 1) * 10 },
    });
  }

  for (const [index, name] of defaultContentCategories.entries()) {
    const slug = slugify(name);
    await prisma.contentCategory.upsert({
      where: { slug },
      update: {},
      create: { name, slug, displayOrder: (index + 1) * 10 },
    });
  }

  for (const [key, label, value, contentType, group] of defaultSiteContent) {
    await prisma.siteContent.upsert({
      where: { key },
      update: {},
      create: { key, label, value, contentType, group },
    });
  }

  await seedRequiredPages();

  if (await prisma.article.count()) return;

  const samples = [
    ['GTA VI Estimated PC Requirements', 'system-requirements', 'A practical overview of the estimated PC hardware needed for GTA VI.', '# GTA VI Estimated PC Requirements\n\nThese requirements are estimates until Rockstar publishes official PC specifications.\n\n:::checker\nCheck your PC now\n:::', 'standard'],
    ['Best GPUs for GTA VI', 'gpu-guides', 'A starting point for choosing a graphics card for GTA VI.', '# Best GPUs for GTA VI\n\nCompare current GPUs against our estimated minimum and recommended tiers.\n\n:::callout\nAlways confirm power-supply and case compatibility before upgrading.\n:::', 'hardware-guide'],
    ['How to Find Your PC Specs', 'tutorials', 'Find your CPU, GPU, RAM, Windows version, and storage details.', '# How to Find Your PC Specs\n\n1. Press **Windows + R**.\n2. Type `msinfo32`.\n3. Press Enter.\n\n:::checker\nUpload your screenshot\n:::', 'tutorial'],
    ['Best Budget Gaming PCs for GTA VI', 'prebuilt-gaming-pcs', 'What to look for in an affordable GTA VI-ready gaming desktop.', '# Best Budget Gaming PCs for GTA VI\n\nStart with the GPU, then verify the CPU, memory, and storage.\n\n:::email-signup\n:::', 'deals'],
  ] as const;

  for (const [index, [title, categorySlug, excerpt, body, contentType]] of samples.entries()) {
    const category = await prisma.contentCategory.findUnique({ where: { slug: categorySlug } });
    await prisma.article.create({
      data: {
        title,
        slug: slugify(title),
        excerpt,
        body,
        status: 'draft',
        contentType,
        seoTitle: title,
        metaDescription: excerpt,
        categories: category
          ? { create: { categoryId: category.id, isPrimary: true } }
          : undefined,
        createdAt: new Date(Date.now() + index),
      },
    });
  }
}

async function seedRequiredPages() {
  for (const definition of REQUIRED_PAGES) {
    const keyed = await prisma.contentPage.findUnique({
      where: { requiredPageKey: definition.key },
      select: { id: true },
    });
    if (keyed) continue;

    const equivalent = await prisma.contentPage.findFirst({
      where: {
        OR: [
          { slug: { in: definition.aliases } },
          { title: definition.title },
        ],
      },
      include: { faqEntries: { select: { id: true } } },
    });

    if (equivalent) {
      await prisma.contentPage.update({
        where: { id: equivalent.id },
        data: {
          requiredPageKey: definition.key,
          ...(definition.faqEntries?.length && !equivalent.faqEntries.length
            ? {
                faqEntries: {
                  create: definition.faqEntries.map((entry) => ({ ...entry, enabled: true })),
                },
              }
            : {}),
        },
      });
      continue;
    }

    await prisma.contentPage.create({
      data: {
        title: definition.title,
        slug: definition.key,
        excerpt: definition.excerpt,
        body: definition.body,
        status: 'published',
        enabled: true,
        requiredPageKey: definition.key,
        pageTemplate: definition.pageTemplate,
        publishedAt: new Date(),
        seoTitle: definition.seoTitle,
        metaDescription: definition.metaDescription,
        schemaType: definition.schemaType,
        showInFooter: true,
        footerLabel: definition.footerLabel,
        footerGroup: definition.footerGroup,
        footerOrder: definition.footerOrder,
        faqEntries: definition.faqEntries?.length
          ? { create: definition.faqEntries.map((entry) => ({ ...entry, enabled: true })) }
          : undefined,
      },
    });
  }
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
