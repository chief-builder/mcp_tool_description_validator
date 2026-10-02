/**
 * LLM default configuration tests
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LLM_MODELS,
  DEFAULT_LLM_TIMEOUT_MS,
  resolveLLMConfig,
} from '../../../src/llm/defaults.js';

describe('resolveLLMConfig', () => {
  it('should default to a disabled Anthropic configuration', () => {
    expect(resolveLLMConfig()).toEqual({
      enabled: false,
      provider: 'anthropic',
      model: DEFAULT_LLM_MODELS.anthropic,
      timeout: DEFAULT_LLM_TIMEOUT_MS,
    });
  });

  it.each(Object.entries(DEFAULT_LLM_MODELS))(
    'should pick the %s default model when only the provider is set',
    (provider, model) => {
      expect(resolveLLMConfig({ provider }).model).toBe(model);
    }
  );

  it('should keep explicit values', () => {
    expect(
      resolveLLMConfig({
        enabled: true,
        provider: 'openai',
        model: 'custom',
        timeout: 10,
        baseUrl: 'https://llm.example.com',
      })
    ).toEqual({
      enabled: true,
      provider: 'openai',
      model: 'custom',
      timeout: 10,
      baseUrl: 'https://llm.example.com',
    });
  });

  it('should leave the model empty for an unknown provider', () => {
    expect(resolveLLMConfig({ provider: 'other' }).model).toBe('');
  });
});
