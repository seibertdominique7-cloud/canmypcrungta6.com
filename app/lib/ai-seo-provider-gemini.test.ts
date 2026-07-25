import { afterEach, describe, expect, it, vi } from 'vitest';

const geminiMocks = vi.hoisted(() => ({
  constructorOptions: [] as unknown[],
  generateContent: vi.fn(),
  parseGeneratedArticleResponse: vi.fn(() => ({ seoTitle: 'Generated draft' })),
}));

vi.mock('@google/genai', () => {
  class ApiError extends Error {
    status: number;

    constructor(options: { message: string; status: number }) {
      super(options.message);
      this.name = 'ApiError';
      this.status = options.status;
    }
  }

  return {
    ApiError,
    GoogleGenAI: class {
      models = {
        generateContent: geminiMocks.generateContent,
      };

      constructor(options: unknown) {
        geminiMocks.constructorOptions.push(options);
      }
    },
  };
});

vi.mock('./ai-seo-validation', () => ({
  AiSeoValidationError: class AiSeoValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'AiSeoValidationError';
    }
  },
  parseGeneratedArticleResponse: geminiMocks.parseGeneratedArticleResponse,
}));

import { ApiError } from '@google/genai';

import { createGeminiSeoProvider } from './ai-seo-provider-gemini';
import type { AiSeoProviderInput } from './ai-seo-types';
import { AiSeoValidationError } from './ai-seo-validation';

describe('Gemini AI SEO provider reliability', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.restoreAllMocks();
    geminiMocks.constructorOptions.length = 0;
    geminiMocks.generateContent.mockReset();
    geminiMocks.parseGeneratedArticleResponse.mockClear();
  });

  it('retries transient Gemini responses before failing the request', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-only-key');
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    geminiMocks.generateContent
      .mockRejectedValueOnce(
        new ApiError({ status: 503, message: 'Temporary provider capacity issue.' }),
      )
      .mockResolvedValueOnce({ text: '{}' });

    const provider = createGeminiSeoProvider('gemini-3.5-flash');
    const generation = provider.generate(input());
    await vi.runAllTimersAsync();
    await generation;

    expect(geminiMocks.generateContent).toHaveBeenCalledTimes(2);
  });

  it('uses the configured fallback after a primary-model capacity error', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-only-key');
    vi.stubEnv('AI_SEO_FALLBACK_MODEL', 'gemini-3.5-flash-lite');
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    geminiMocks.generateContent
      .mockRejectedValueOnce(
        new ApiError({ status: 503, message: 'The model is experiencing high demand.' }),
      )
      .mockRejectedValueOnce(
        new ApiError({ status: 503, message: 'The model is experiencing high demand.' }),
      )
      .mockRejectedValueOnce(
        new ApiError({ status: 503, message: 'The model is experiencing high demand.' }),
      )
      .mockResolvedValueOnce({ text: '{}' });

    const provider = createGeminiSeoProvider('gemini-3.5-flash');
    const generation = provider.generate(input());
    await vi.runAllTimersAsync();
    await generation;

    expect(geminiMocks.generateContent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ model: 'gemini-3.5-flash' }),
    );
    expect(geminiMocks.generateContent).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ model: 'gemini-3.5-flash-lite' }),
    );
  });

  it('does not mask non-capacity errors with a fallback request', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-only-key');
    vi.stubEnv('AI_SEO_FALLBACK_MODEL', 'gemini-3.5-flash-lite');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    geminiMocks.generateContent.mockRejectedValue(
      new ApiError({ status: 403, message: 'Permission denied.' }),
    );

    const provider = createGeminiSeoProvider('gemini-3.5-flash');

    await expect(provider.generate(input())).rejects.toMatchObject({
      status: 403,
      message: expect.stringContaining('credentials'),
    });
    expect(geminiMocks.generateContent).toHaveBeenCalledTimes(1);
  });

  it('regenerates once with validator feedback before giving up on a draft', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-only-key');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    geminiMocks.generateContent
      .mockResolvedValueOnce({ text: '{"first":"attempt"}' })
      .mockResolvedValueOnce({ text: '{"second":"attempt"}' });
    geminiMocks.parseGeneratedArticleResponse
      .mockImplementationOnce(() => {
        throw new AiSeoValidationError('Comparison rows must match their headers.');
      })
      .mockReturnValueOnce({ seoTitle: 'Repaired draft' });

    const provider = createGeminiSeoProvider('gemini-3.6-flash');
    const generated = await provider.generate(input());

    expect(generated).toMatchObject({ seoTitle: 'Repaired draft' });
    expect(geminiMocks.generateContent).toHaveBeenCalledTimes(2);
    expect(geminiMocks.generateContent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        contents: expect.stringContaining('Comparison rows must match their headers.'),
      }),
    );
  });

});

function input(): AiSeoProviderInput {
  return {
    topic: 'GTA VI PC requirements',
    primaryKeyword: 'GTA VI PC requirements',
    secondaryKeywords: [],
    articleType: 'Informational Guide',
    targetWordCount: 1500,
    productCategories: [],
    specificProductIds: [],
    relatedArticleIds: [],
    saveAsDraft: true,
    products: [],
    existingArticles: [],
    requirements: {
      label: 'Estimated PC Requirements',
      disclaimer: 'These requirements are estimates.',
    },
  };
}
