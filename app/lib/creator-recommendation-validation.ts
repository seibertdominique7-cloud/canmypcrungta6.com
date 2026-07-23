import type { CreatorRecommendationInput } from './creator-recommendation-types';

export interface CreatorRecommendationValidationResult {
  data: CreatorRecommendationInput | null;
  fieldErrors: Record<string, string>;
}

export function validateCreatorRecommendationInput(
  value: unknown,
): CreatorRecommendationValidationResult {
  const input = asRecord(value);
  const fieldErrors: Record<string, string> = {};
  const scenarioId = text(input.scenarioId, 'Scenario', 100, fieldErrors, true);
  const headline = text(input.headline, 'Headline', 160, fieldErrors, true);
  const subheadline = text(input.subheadline, 'Subheadline', 180, fieldErrors, true);
  const description = text(input.description, 'Description', 900, fieldErrors, true);
  const warningText = text(input.warningText, 'Warning', 400, fieldErrors, false);
  const primaryCtaLabel = text(
    input.primaryCtaLabel,
    'Primary CTA label',
    80,
    fieldErrors,
    true,
  );
  const primaryCtaUrl = text(
    input.primaryCtaUrl,
    'Primary CTA URL',
    500,
    fieldErrors,
    true,
  );
  const secondaryCtaLabel = text(
    input.secondaryCtaLabel,
    'Secondary CTA label',
    80,
    fieldErrors,
    false,
  );
  const secondaryCtaUrl = text(
    input.secondaryCtaUrl,
    'Secondary CTA URL',
    500,
    fieldErrors,
    false,
  );

  if (primaryCtaUrl && !isSafeCreatorDestination(primaryCtaUrl)) {
    fieldErrors.primaryCtaUrl = 'Use an internal path, page anchor, or public HTTPS URL.';
  }
  if (Boolean(secondaryCtaLabel) !== Boolean(secondaryCtaUrl)) {
    fieldErrors.secondaryCtaUrl = 'Provide both a secondary CTA label and URL, or leave both blank.';
  } else if (secondaryCtaUrl && !isSafeCreatorDestination(secondaryCtaUrl)) {
    fieldErrors.secondaryCtaUrl = 'Use an internal path, page anchor, or public HTTPS URL.';
  }

  const groups = readGroups(input.groups, fieldErrors);
  const guides = readGuides(input.guides, fieldErrors);

  return {
    data:
      Object.keys(fieldErrors).length === 0
        ? {
            scenarioId,
            enabled: input.enabled === true,
            headline,
            subheadline,
            description,
            warningText,
            primaryCtaLabel,
            primaryCtaUrl,
            secondaryCtaLabel,
            secondaryCtaUrl,
            groups,
            guides,
          }
        : null,
    fieldErrors,
  };
}

export function isSafeCreatorDestination(value: string) {
  if (value.startsWith('#')) return /^#[A-Za-z][\w:.-]*$/.test(value);
  if (value.startsWith('/')) return !value.startsWith('//') && !/[\u0000-\u001f]/.test(value);

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

function readGroups(value: unknown, fieldErrors: Record<string, string>) {
  if (!Array.isArray(value)) return [];
  if (value.length > 20) fieldErrors.groups = 'Use no more than 20 creator product groups.';

  return value.slice(0, 20).map((rawGroup, index) => {
    const group = asRecord(rawGroup);
    const prefix = `groups.${index}`;
    const productIds = stringArray(group.productIds, 40);

    if (productIds.length !== new Set(productIds).size) {
      fieldErrors[`${prefix}.productIds`] = 'A product can only appear once in a group.';
    }

    return {
      title: text(group.title, 'Group title', 120, fieldErrors, true, `${prefix}.title`),
      description: text(
        group.description,
        'Group description',
        400,
        fieldErrors,
        false,
        `${prefix}.description`,
      ),
      enabled: group.enabled !== false,
      productIds,
    };
  });
}

function readGuides(value: unknown, fieldErrors: Record<string, string>) {
  if (!Array.isArray(value)) return [];
  if (value.length > 20) fieldErrors.guides = 'Use no more than 20 creator guide links.';

  return value.slice(0, 20).map((rawGuide, index) => {
    const guide = asRecord(rawGuide);
    const prefix = `guides.${index}`;
    const url = text(guide.url, 'Guide URL', 500, fieldErrors, true, `${prefix}.url`);

    if (url && !isSafeCreatorDestination(url)) {
      fieldErrors[`${prefix}.url`] = 'Use an internal path or public HTTPS URL.';
    }

    return {
      label: text(guide.label, 'Guide label', 100, fieldErrors, true, `${prefix}.label`),
      url,
      enabled: guide.enabled !== false,
    };
  });
}

function text(
  value: unknown,
  label: string,
  maximum: number,
  fieldErrors: Record<string, string>,
  required: boolean,
  key = lowerCamel(label),
) {
  const output = typeof value === 'string' ? value.trim() : '';

  if (required && !output) fieldErrors[key] = `${label} is required.`;
  if (output.length > maximum) fieldErrors[key] = `${label} must be ${maximum} characters or fewer.`;

  return output;
}

function stringArray(value: unknown, maximum: number) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, maximum);
}

function lowerCamel(value: string) {
  return value
    .replace(/[^A-Za-z0-9]+(.)/g, (_, character: string) => character.toUpperCase())
    .replace(/^./, (character) => character.toLowerCase());
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}
