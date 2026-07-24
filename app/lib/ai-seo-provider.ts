import 'server-only';

import type {
  AiSeoProviderInput,
  AiSeoProviderStatus,
  GeneratedArticle,
} from './ai-seo-types';
import { createGeminiSeoProvider } from './ai-seo-provider-gemini';
import { createOpenAiSeoProvider } from './ai-seo-provider-openai';

export interface AiSeoProvider {
  readonly name: string;
  readonly model: string;
  generate(input: AiSeoProviderInput): Promise<GeneratedArticle>;
}

export class AiSeoProviderError extends Error {
  constructor(
    message: string,
    public readonly status = 502,
  ) {
    super(message);
    this.name = 'AiSeoProviderError';
  }
}

export function getAiSeoProviderStatus(): AiSeoProviderStatus {
  const provider = process.env.AI_SEO_PROVIDER?.trim().toLowerCase() ?? '';
  const model = process.env.AI_SEO_MODEL?.trim() ?? '';

  if (!provider) {
    return {
      configured: false,
      provider,
      model,
      issue: 'provider_missing',
      message:
        'AI_SEO_PROVIDER is missing from the server environment. Add it and restart the application.',
    };
  }

  if (provider !== 'openai' && provider !== 'gemini') {
    return {
      configured: false,
      provider,
      model,
      issue: 'unsupported_provider',
      message: `AI_SEO_PROVIDER "${provider}" is unsupported. Choose "gemini" or "openai".`,
    };
  }

  if (!model) {
    return {
      configured: false,
      provider,
      model,
      issue: 'model_missing',
      message:
        'AI_SEO_MODEL is missing from the server environment. Add it and restart the application.',
    };
  }

  const keyName = provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY';
  const apiKey =
    provider === 'gemini'
      ? process.env.GEMINI_API_KEY?.trim()
      : process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      configured: false,
      provider,
      model,
      issue: 'api_key_missing',
      message: `${providerLabel(provider)} is selected, but ${keyName} is missing from the server environment.`,
    };
  }

  try {
    createProvider(provider, model);
  } catch {
    return {
      configured: false,
      provider,
      model,
      issue: 'initialization_failed',
      message: `${providerLabel(provider)} provider initialization failed. Check the server configuration and restart the application.`,
    };
  }

  return {
    configured: true,
    provider,
    model,
    message: `Ready to generate drafts with ${providerLabel(provider)} (${model}).`,
  };
}

export function getConfiguredAiSeoProvider(): AiSeoProvider {
  const status = getAiSeoProviderStatus();
  if (!status.configured) throw new AiSeoProviderError(status.message, 503);

  try {
    return createProvider(status.provider, status.model);
  } catch (error) {
    if (error instanceof AiSeoProviderError) throw error;
    throw new AiSeoProviderError(
      `${providerLabel(status.provider)} provider initialization failed. Check the server configuration and restart the application.`,
      503,
    );
  }
}

export async function generateSeoArticle(
  input: AiSeoProviderInput,
): Promise<GeneratedArticle> {
  return getConfiguredAiSeoProvider().generate(input);
}

function createProvider(provider: string, model: string) {
  if (provider === 'gemini') return createGeminiSeoProvider(model);
  if (provider === 'openai') return createOpenAiSeoProvider(model);
  throw new AiSeoProviderError('The selected AI SEO provider is unavailable.', 503);
}

function providerLabel(provider: string) {
  return provider === 'gemini' ? 'Gemini' : provider === 'openai' ? 'OpenAI' : 'AI';
}
