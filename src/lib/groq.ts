import OpenAI from 'openai';
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';

export function createGroqClient(): OpenAI {
  if (!process.env.GROK_API_KEY) {
    throw new Error('La clave de API no está configurada');
  }
  return new OpenAI({
    apiKey: process.env.GROK_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });
}

// Text + vision. reasoning_effort 'none' disables Qwen thinking; stripThinking() guards anyway.
export const GROQ_MODEL = 'qwen/qwen3.8-27b';
// Text-only fallback when GROQ_MODEL is gone (404 / model_not_found / model_decommissioned).
export const GROQ_FALLBACK_MODEL = 'openai/gpt-oss-120b';

export function stripThinking(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/^[\s\S]*?<\/think>/, '')
    .trim();
}

function isModelGone(err: unknown): boolean {
  return (
    err instanceof OpenAI.APIError &&
    (err.status === 404 || err.code === 'model_not_found' || err.code === 'model_decommissioned')
  );
}

type ChatParams = Omit<ChatCompletionCreateParamsNonStreaming, 'model' | 'reasoning_effort'>;

// Single entry point for every Groq call: picks the model, falls back on a removed model
// (text only, gpt-oss cannot read images) and returns content without <think> blocks.
export async function groqChat(
  groq: OpenAI,
  params: ChatParams,
  { vision = false }: { vision?: boolean } = {}
): Promise<string | null> {
  let response;
  try {
    response = await groq.chat.completions.create({
      ...params,
      model: GROQ_MODEL,
      reasoning_effort: 'none',
    });
  } catch (err) {
    if (vision || !isModelGone(err)) throw err;
    console.warn(`[groq] ${GROQ_MODEL} unavailable, falling back to ${GROQ_FALLBACK_MODEL}`);
    response = await groq.chat.completions.create({
      ...params,
      model: GROQ_FALLBACK_MODEL,
      reasoning_effort: 'low',
    });
  }
  const content = response.choices[0]?.message?.content;
  return content ? stripThinking(content) : null;
}

// Maps AI failures to friendly Spanish messages; our own Spanish errors pass through.
export function aiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof OpenAI.APIError) {
    return 'El servicio de IA no está disponible ahora. Probá de nuevo en unos minutos.';
  }
  if (err instanceof SyntaxError) {
    return 'La IA devolvió una respuesta inválida. Probá de nuevo.';
  }
  return err instanceof Error ? err.message : fallback;
}
