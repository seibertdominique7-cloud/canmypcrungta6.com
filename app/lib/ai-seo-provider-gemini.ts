import 'server-only';

import { ApiError, GoogleGenAI } from '@google/genai';

import type { AiSeoProvider } from './ai-seo-provider';
import { AiSeoProviderError } from './ai-seo-provider';
import {
  aiSeoSystemInstructions,
  buildAiSeoGenerationPrompt,
  configuredAiSeoTimeout,
  GENERATED_ARTICLE_JSON_SCHEMA,
} from './ai-seo-provider-common';
import {
  AiSeoValidationError,
  parseGeneratedArticleResponse,
} from './ai-seo-validation';

export function createGeminiSeoProvider(model: string): AiSeoProvider {
const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new AiSeoProviderError(
      'Gemini is selected, but GEMINI_API_KEY is missing from the server environment.',
      503,
    );
  }

  let client: GoogleGenAI;
  try {
    client = new GoogleGenAI({ apiKey });
  } catch {
    throw new AiSeoProviderError(
      'Gemini provider initialization failed. Check the server configuration and restart the application.',
      503,
    );
  }

  return {
    name: 'gemini',
    model,
    async generate(input) {
      const timeoutMs = configuredAiSeoTimeout();
      const fallbackModel = configuredGeminiFallbackModel(model);
      let outputText = '';
      let selectedModel = model;

      try {
        let response;

        try {
          response = await generateWithRetries(client, model, input, timeoutMs);
        } catch (error) {
          const status = geminiErrorStatus(error);
          if (!fallbackModel || !isCapacityError(status)) {
            throw error;
          }

          console.warn('[AI SEO Publisher] Gemini primary model unavailable; using fallback', {
            status,
            primaryModel: model,
            fallbackModel,
            reason: safeGeminiProviderReason(error),
          });
          selectedModel = fallbackModel;
          response = await generateWithRetries(
            client,
            fallbackModel,
            input,
            timeoutMs,
          );
        }

        outputText = response.text ?? '';
        if (selectedModel !== model) {
          console.info('[AI SEO Publisher] Gemini fallback generation succeeded', {
            primaryModel: model,
            fallbackModel: selectedModel,
          });
        }
      } catch (error) {
        if (isTimeoutError(error)) {
          throw new AiSeoProviderError(
            `Gemini timed out after ${Math.round(timeoutMs / 1000)} seconds.`,
            504,
          );
        }

        const status = geminiErrorStatus(error);
        const message = safeGeminiErrorMessage(status);
        console.error('[AI SEO Publisher] Gemini request failed', {
          status,
          model,
          message,
          reason: safeGeminiProviderReason(error),
        });
        throw new AiSeoProviderError(
          message,
          status >= 400 && status < 500 ? status : 502,
        );
      }

      if (!outputText.trim()) {
        console.error('[AI SEO Publisher] Gemini returned no text output', { model });
        throw new AiSeoProviderError(
          'Gemini returned no structured article content.',
          502,
        );
      }

      try {
        return parseGeneratedArticleResponse(outputText, input);
      } catch (error) {
        if (error instanceof AiSeoValidationError) {
          console.warn('[AI SEO Publisher] Repairing Gemini response after validation', {
            model: selectedModel,
            reason: error.message,
          });

          const repairedResponse = await generateWithRetries(
            client,
            selectedModel,
            input,
            timeoutMs,
            error.message,
          );
          const repairedText = repairedResponse.text ?? '';
          if (!repairedText.trim()) {
            throw new AiSeoProviderError(
              'Gemini returned no structured article content during validation repair.',
              502,
            );
          }

          try {
            return parseGeneratedArticleResponse(repairedText, input);
          } catch (repairError) {
            console.error('[AI SEO Publisher] Gemini repair validation failed', {
              model: selectedModel,
              message:
                repairError instanceof Error
                  ? repairError.message
                  : 'Unknown response validation error',
            });
            throw repairError;
          }
        }

        console.error('[AI SEO Publisher] Gemini response validation failed', {
          model,
          message:
            error instanceof Error
              ? error.message
              : 'Unknown response validation error',
        });
        throw error;
      }
    },
  };
}

async function generateWithRetries(
  client: GoogleGenAI,
  model: string,
  input: Parameters<AiSeoProvider['generate']>[0],
  timeoutMs: number,
  validationCorrection?: string,
) {
  const maximumAttempts = 3;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      return await generateWithModel(
        client,
        model,
        input,
        timeoutMs,
        validationCorrection,
      );
    } catch (error) {
      const status = geminiErrorStatus(error);
      if (!isRetryableError(status) || attempt === maximumAttempts) {
        throw error;
      }

      const retryDelayMs = 750 * 2 ** (attempt - 1);
      console.warn('[AI SEO Publisher] Retrying transient Gemini failure', {
        status,
        model,
        attempt,
        nextAttempt: attempt + 1,
        retryDelayMs,
        reason: safeGeminiProviderReason(error),
      });
      await delay(retryDelayMs);
    }
  }

  throw new Error('Gemini retry loop ended unexpectedly.');
}

function generateWithModel(
  client: GoogleGenAI,
  model: string,
  input: Parameters<AiSeoProvider['generate']>[0],
  timeoutMs: number,
  validationCorrection?: string,
) {
  return client.models.generateContent({
    model,
    contents: buildAiSeoGenerationPrompt(input, validationCorrection),
    config: {
      abortSignal: AbortSignal.timeout(timeoutMs),
      systemInstruction: aiSeoSystemInstructions(),
      responseMimeType: 'application/json',
      responseJsonSchema: GENERATED_ARTICLE_JSON_SCHEMA,
      maxOutputTokens: Math.min(16_000, input.targetWordCount * 5),
      temperature: 0.35,
    },
  });
}

function configuredGeminiFallbackModel(primaryModel: string) {
  const fallbackModel = process.env.AI_SEO_FALLBACK_MODEL?.trim();
  return fallbackModel && fallbackModel !== primaryModel ? fallbackModel : null;
}

function geminiErrorStatus(error: unknown) {
  return error instanceof ApiError ? error.status : 502;
}

function isCapacityError(status: number) {
  return status === 500 || status === 502 || status === 503 || status === 504;
}

function isRetryableError(status: number) {
  return status === 408 || status === 429 || isCapacityError(status);
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function safeGeminiProviderReason(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown provider error';

  return message
    .replace(/(?:AIza|AQ\.)[A-Za-z0-9._-]+/g, '[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

function isTimeoutError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
  );
}

function safeGeminiErrorMessage(status: number) {
  if (status === 400) {
    return 'Gemini rejected the generation request. Check the selected model and try again.';
  }
  if (status === 401 || status === 403) {
    return 'Gemini rejected the API credentials or this project does not have model access.';
  }
  if (status === 404) {
    return 'The configured Gemini model is unavailable. Check AI_SEO_MODEL and restart the application.';
  }
  if (status === 429) {
    return 'Gemini rate limit reached. Wait briefly, then try again.';
  }
  if (status >= 500) {
    return 'Gemini is temporarily unavailable. Try again shortly.';
  }
  return 'Gemini could not complete the generation request.';
}
