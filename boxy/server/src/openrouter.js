const {
  OPENROUTER_API_KEY,
  LLM_MODEL = 'anthropic/claude-sonnet-4',
} = process.env;

export async function chatCompletion({ messages, temperature = 0.4, response_format }) {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not set in server/.env');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Boxy',
    },
    body: JSON.stringify({
      model: LLM_MODEL, messages, temperature,
      ...(response_format ? { response_format } : {}),
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

export { LLM_MODEL };
