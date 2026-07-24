import 'server-only';

import type { AiSeoProvider } from './ai-seo-provider';
import { AiSeoProviderError } from './ai-seo-provider';
import {
  aiSeoSystemInstructions,
  buildAiSeoGenerationPrompt,
  configuredAiSeoTimeout,
  GENERATED_ARTICLE_JSON_SCHEMA,
} from './ai-seo-provider-common';
import { parseGeneratedArticleResponse } from './ai-seo-validation';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

export function createOpenAiSeoProvider(model: string): AiSeoProvider {
  return {
    name: 'openai',
    model,
    async generate(input) {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      if (!apiKey) {
        throw new AiSeoProviderError(
          'OpenAI is selected, but OPENAI_API_KEY is missing from the server environment.',
          503,
        );
      }

      const timeoutMs = configuredAiSeoTimeout();
      let response: Response;
      try {
        response = await fetch(OPENAI_RESPONSES_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            instructions: aiSeoSystemInstructions(),
            input: buildAiSeoGenerationPrompt(input),
            max_output_tokens: Math.min(16_000, input.targetWordCount * 5),
            text: {
              format: {
                type: 'json_schema',
                name: 'gta6_seo_article',
                strict: true,
                schema: GENERATED_ARTICLE_JSON_SCHEMA,
              },
            },
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === 'TimeoutError' || error.name === 'AbortError')
        ) {
          throw new AiSeoProviderError(
            `OpenAI timed out after ${Math.round(timeoutMs / 1000)} seconds.`,
            504,
          );
        }
        throw new AiSeoProviderError('OpenAI could not be reached.');
      }

      const requestId = response.headers.get('x-request-id') ?? 'unavailable';
      const payload = await readResponseBody(response);

      if (!response.ok) {
        console.error('[AI SEO Publisher] OpenAI request failed', {
          status: response.status,
          requestId,
          message: safeProviderMessage(payload),
        });
        throw new AiSeoProviderError(
          `OpenAI rejected the generation request (${response.status}). ${safeProviderMessage(payload)}`,
          response.status >= 400 && response.status < 500 ? 400 : 502,
        );
      }

      const outputText = extractOutputText(payload);
      if (!outputText) {
        console.error('[AI SEO Publisher] OpenAI returned no text output', {
          status: response.status,
          requestId,
        });
        throw new AiSeoProviderError(
          'OpenAI returned no structured article content.',
        );
      }

      try {
        return parseGeneratedArticleResponse(outputText, input);
      } catch (error) {
        console.error('[AI SEO Publisher] OpenAI response validation failed', {
          requestId,
          message:
            error instanceof Error
              ? error.message
              : 'Unknown validation error',
        });
        throw error;
      }
    },
  };
}

async function readResponseBody(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!body) return null;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body.slice(0, 500);
  }
}

function extractOutputText(value: unknown) {
  if (typeof value === 'object' && value !== null) {
    const payload = value as Record<string, unknown>;
    if (typeof payload.output_text === 'string') return payload.output_text;
    if (Array.isArray(payload.output)) {
      for (const item of payload.output) {
        if (typeof item !== 'object' || item === null) continue;
        const content = (item as Record<string, unknown>).content;
        if (!Array.isArray(content)) continue;
        for (const part of content) {
          if (
            typeof part === 'object' &&
            part !== null &&
            typeof (part as Record<string, unknown>).text === 'string'
          ) {
            return (part as Record<string, unknown>).text as string;
          }
        }
      }
    }
  }
  return '';
}

function safeProviderMessage(value: unknown) {
  if (typeof value === 'object' && value !== null) {
    const error = (value as Record<string, unknown>).error;
    if (typeof error === 'object' && error !== null) {
      const message = (error as Record<string, unknown>).message;
      if (typeof message === 'string') return message.slice(0, 400);
    }
  }
  return 'See the server log and provider dashboard for details.';
}
