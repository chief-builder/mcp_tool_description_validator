/**
 * Defaults for optional LLM-assisted analysis.
 *
 * Kept free of provider imports so configuration code can use them
 * without loading the AI SDK.
 */

import type { LLMConfig } from '../types/index.js';

/** Provider used when none is configured. */
export const DEFAULT_LLM_PROVIDER = 'anthropic';

/** Request timeout for LLM analysis, in milliseconds. */
export const DEFAULT_LLM_TIMEOUT_MS = 30_000;

/** Default model per provider, used when no model is configured. */
export const DEFAULT_LLM_MODELS: Readonly<Record<string, string>> = {
  anthropic: 'claude-haiku-4-5',
  openai: 'gpt-4o-mini',
  ollama: 'llama3.2',
};

/**
 * Complete a partial LLM configuration with defaults. The model defaults
 * to the chosen provider's model, so switching provider never sends one
 * provider's model name to another.
 */
export function resolveLLMConfig(partial: Partial<LLMConfig> = {}): LLMConfig {
  const provider = partial.provider || DEFAULT_LLM_PROVIDER;
  return {
    ...partial,
    enabled: partial.enabled ?? false,
    provider,
    model: partial.model || DEFAULT_LLM_MODELS[provider] || '',
    timeout: partial.timeout ?? DEFAULT_LLM_TIMEOUT_MS,
  };
}
