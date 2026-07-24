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
import { parseGeneratedArticleResponse } from './ai-seo-validation';

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
      let outputText = '';

      try {
        const response = await client.models.generateContent({
          model,
          contents: buildAiSeoGenerationPrompt(input),
          config: {
            abortSignal: AbortSignal.timeout(timeoutMs),
            systemInstruction: aiSeoSystemInstructions(),
            responseMimeType: 'application/json',
            responseJsonSchema: GENERATED_ARTICLE_JSON_SCHEMA,
            maxOutputTokens: Math.min(16_000, input.targetWordCount * 5),
            temperature: 0.35,
          },
        });
        outputText = response.text ?? '';
      } catch (error) {
        if (isTimeoutError(error)) {
          throw new AiSeoProviderError(
            `Gemini timed out after ${Math.round(timeoutMs / 1000)} seconds.`,
            504,
          );
        }

        const status = error instanceof ApiError ? error.status : 502;
        const message = safeGeminiErrorMessage(status);
        console.error('[AI SEO Publisher] Gemini request failed', {
          status,
          model,
          message,
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
