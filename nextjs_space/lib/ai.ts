type AiRole = 'system' | 'user' | 'assistant';

export type AiMessage = {
  role: AiRole;
  content: string;
};

type AiResponseFormat = {
  type: 'json_object' | 'text';
};

type CreateChatCompletionOptions = {
  model: string;
  messages: AiMessage[];
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: AiResponseFormat;
};

type AiProvider = 'openrouter' | 'abacus';

function getAiProvider(): AiProvider {
  if (process.env.OPENROUTER_API_KEY) {
    return 'openrouter';
  }

  if (process.env.ABACUSAI_API_KEY) {
    return 'abacus';
  }

  throw new Error('Missing OPENROUTER_API_KEY or ABACUSAI_API_KEY');
}

function getAiEndpoint(provider: AiProvider): string {
  if (provider === 'openrouter') {
    return 'https://openrouter.ai/api/v1/chat/completions';
  }

  return 'https://routellm.abacus.ai/v1/chat/completions';
}

function getAiHeaders(provider: AiProvider): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${provider === 'openrouter' ? process.env.OPENROUTER_API_KEY : process.env.ABACUSAI_API_KEY}`,
  };

  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    headers['X-Title'] = 'COLT Apostas';
  }

  return headers;
}

export function getAiModels() {
  return {
    recommendation: process.env.OPENROUTER_RECOMMENDATION_MODEL || 'openai/gpt-4.1-mini',
    chat: process.env.OPENROUTER_CHAT_MODEL || 'openai/gpt-4.1-mini',
  };
}

export async function createChatCompletion({
  model,
  messages,
  stream = false,
  maxTokens = 1500,
  temperature = 0.7,
  responseFormat,
}: CreateChatCompletionOptions): Promise<Response> {
  const provider = getAiProvider();
  const response = await fetch(getAiEndpoint(provider), {
    method: 'POST',
    headers: getAiHeaders(provider),
    body: JSON.stringify({
      model,
      messages,
      stream,
      max_tokens: maxTokens,
      temperature,
      ...(responseFormat ? { response_format: responseFormat } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`AI API error (${provider}): ${response.status} ${errorText}`);
  }

  return response;
}
