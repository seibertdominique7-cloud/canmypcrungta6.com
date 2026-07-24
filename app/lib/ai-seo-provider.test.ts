import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getAiSeoProviderStatus,
  getConfiguredAiSeoProvider,
} from './ai-seo-provider';

describe('AI SEO provider configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('distinguishes a missing provider', () => {
    vi.stubEnv('AI_SEO_PROVIDER', '');
    vi.stubEnv('AI_SEO_MODEL', '');
    vi.stubEnv('GEMINI_API_KEY', '');

    expect(getAiSeoProviderStatus()).toMatchObject({
      configured: false,
      issue: 'provider_missing',
    });
  });

  it('distinguishes a missing model', () => {
    vi.stubEnv('AI_SEO_PROVIDER', 'gemini');
    vi.stubEnv('AI_SEO_MODEL', '');
    vi.stubEnv('GEMINI_API_KEY', 'test-only-key');

    expect(getAiSeoProviderStatus()).toMatchObject({
      configured: false,
      provider: 'gemini',
      issue: 'model_missing',
    });
  });

  it('distinguishes a missing Gemini API key', () => {
    vi.stubEnv('AI_SEO_PROVIDER', 'gemini');
    vi.stubEnv('AI_SEO_MODEL', 'gemini-3.5-flash');
    vi.stubEnv('GEMINI_API_KEY', '');

    expect(getAiSeoProviderStatus()).toMatchObject({
      configured: false,
      provider: 'gemini',
      issue: 'api_key_missing',
    });
  });

  it('distinguishes an unsupported provider', () => {
    vi.stubEnv('AI_SEO_PROVIDER', 'unsupported');
    vi.stubEnv('AI_SEO_MODEL', 'model');
    vi.stubEnv('GEMINI_API_KEY', 'test-only-key');

    expect(getAiSeoProviderStatus()).toMatchObject({
      configured: false,
      issue: 'unsupported_provider',
    });
  });

  it('initializes Gemini through the shared provider abstraction', () => {
    vi.stubEnv('AI_SEO_PROVIDER', 'gemini');
    vi.stubEnv('AI_SEO_MODEL', 'gemini-3.5-flash');
    vi.stubEnv('GEMINI_API_KEY', 'test-only-key');

    expect(getAiSeoProviderStatus()).toMatchObject({
      configured: true,
      provider: 'gemini',
      model: 'gemini-3.5-flash',
    });
    expect(getConfiguredAiSeoProvider()).toMatchObject({
      name: 'gemini',
      model: 'gemini-3.5-flash',
    });
  });
});
