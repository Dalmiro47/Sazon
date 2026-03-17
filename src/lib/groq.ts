import OpenAI from 'openai';

export function createGroqClient(): OpenAI {
  if (!process.env.GROK_API_KEY) {
    throw new Error('La clave de API no está configurada');
  }
  return new OpenAI({
    apiKey: process.env.GROK_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });
}

export const GROQ_MODEL = 'llama-3.3-70b-versatile';
export const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
