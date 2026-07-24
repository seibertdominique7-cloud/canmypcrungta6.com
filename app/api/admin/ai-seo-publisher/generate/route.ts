import { requireAdminApi } from '../../../../lib/admin-auth';
import { readJson } from '../../../../lib/admin-api';
import { runAiSeoIdempotent } from '../../../../lib/ai-seo-idempotency';
import {
  AiSeoProviderError,
  getAiSeoProviderStatus,
} from '../../../../lib/ai-seo-provider';
import {
  AiSeoServiceError,
  generateAndSaveSeoDraft,
} from '../../../../lib/ai-seo-service';
import {
  AiSeoValidationError,
  validateAiSeoGenerationInput,
} from '../../../../lib/ai-seo-validation';
import {
  consumeRateLimit,
  getRequestClientKey,
} from '../../../../lib/rate-limit';

export async function POST(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  const providerStatus = getAiSeoProviderStatus();
  if (!providerStatus.configured) {
    return Response.json({ error: providerStatus.message }, { status: 503 });
  }

  const rateLimit = consumeRateLimit(
    `ai-seo:${getRequestClientKey(request)}`,
    { limit: 30, windowMs: 10 * 60 * 1000 },
  );
  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: `Generation limit reached. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const idempotencyKey = request.headers.get('idempotency-key')?.trim() ?? '';
  if (!/^[a-zA-Z0-9:_-]{8,160}$/.test(idempotencyKey)) {
    return Response.json(
      { error: 'A valid idempotency key is required for generation.' },
      { status: 400 },
    );
  }

  try {
    const input = validateAiSeoGenerationInput(await readJson(request));
    const draft = await runAiSeoIdempotent(
      `${getRequestClientKey(request)}:${idempotencyKey}`,
      () => generateAndSaveSeoDraft(input),
    );
    return Response.json(
      {
        message: input.articleId
          ? 'Draft regenerated and saved.'
          : 'Draft generated and saved.',
        draft,
      },
      { status: input.articleId ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof AiSeoValidationError) {
      return Response.json(
        { error: error.message, fieldErrors: error.fieldErrors },
        { status: 400 },
      );
    }
    if (error instanceof AiSeoProviderError || error instanceof AiSeoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('[AI SEO Publisher] Generation failed', {
      message: error instanceof Error ? error.message : 'Unknown server error',
    });
    return Response.json(
      { error: 'The article could not be generated. No incomplete draft was saved.' },
      { status: 500 },
    );
  }
}
