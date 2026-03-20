'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createGroqClient, GROQ_MODEL } from '@/lib/groq';
import type { Recipe, RecipePayload, SessionMessage, SessionChatResult, SessionEndResult } from '@/types/recipe';
import type { ActionError } from '@/types/actions';

interface StartSessionResult {
  ok: true;
  sessionId: string;
}

function formatRecipeForPrompt(recipe: Recipe): string {
  const ingredients = recipe.ingredients
    .map((i) => {
      const qty = i.qty !== null ? `${i.qty}` : '';
      const unit = i.unit ?? '';
      const note = i.note ? ` (${i.note})` : '';
      return `- ${qty} ${unit} ${i.name}${note}`.trim();
    })
    .join('\n');

  const steps = recipe.steps
    .map((s) => `${s.order}. ${s.title}: ${s.content}`)
    .join('\n');

  return `Nombre: ${recipe.name}
Categoría: ${recipe.category}
Porciones: ${recipe.servings}

Ingredientes:
${ingredients}

Pasos:
${steps}

${recipe.notes ? `Notas: ${recipe.notes}` : ''}`;
}

export async function startSessionAction(
  recipeId: string
): Promise<StartSessionResult | ActionError> {
  // TODO: requireAuth()

  const supabase = createAdminClient();

  // Verify recipe exists
  const { data: recipe } = await supabase
    .from('recipes')
    .select('id')
    .eq('id', recipeId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!recipe) {
    return { ok: false, code: 'NOT_FOUND', message: 'Receta no encontrada' };
  }

  const { data: session, error } = await supabase
    .from('cooking_sessions')
    .insert({ recipe_id: recipeId, messages: [] })
    .select('id')
    .single();

  if (error) {
    return { ok: false, code: 'DB_ERROR', message: error.message };
  }

  return { ok: true, sessionId: session.id };
}

export async function chatInSessionAction(
  sessionId: string,
  userMessage: string
): Promise<SessionChatResult | ActionError> {
  // TODO: requireAuth()

  if (!userMessage.trim()) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'El mensaje no puede estar vacío' };
  }

  const supabase = createAdminClient();

  // Fetch session
  const { data: session } = await supabase
    .from('cooking_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session) {
    return { ok: false, code: 'NOT_FOUND', message: 'Sesión no encontrada' };
  }

  // Fetch recipe
  const { data: recipe } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', session.recipe_id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!recipe) {
    return { ok: false, code: 'NOT_FOUND', message: 'Receta no encontrada' };
  }

  const typedRecipe = recipe as Recipe;

  // Fetch previous session summaries for knowledge accumulation
  const { data: previousSessions } = await supabase
    .from('cooking_sessions')
    .select('summary, cooked_at')
    .eq('recipe_id', session.recipe_id)
    .neq('id', sessionId)
    .not('summary', 'is', null)
    .order('cooked_at', { ascending: false })
    .limit(5);

  const previousNotes = previousSessions?.length
    ? `\n\nNotas de sesiones anteriores:\n${previousSessions
        .map((s: { summary: string; cooked_at: string }) => `- ${s.summary}`)
        .join('\n')}`
    : '';

  const systemPrompt = `Eres un asistente de cocina divertido y entusiasta que ayuda a mejorar una receta casera a través de la experiencia real cocinando. Tu trabajo es responder preguntas, ayudar a diagnosticar problemas y capturar ideas mientras el usuario cocina.

La receta que se está cocinando hoy:
${formatRecipeForPrompt(typedRecipe)}${previousNotes}

**Instrucciones de tono:**
- Sé divertido, conversacional y motivador 🎉
- Usa emojis relevantes para hacer el chat más amigable (🍳 para cocina, ⚠️ para problemas, ✨ para ideas, 🔥 para éxito, etc.)
- Celebra los logros del usuario, aunque sean pequeños
- Haz preguntas que estimulen el aprendizaje culinario
- Si el usuario reporta un problema, ayuda a diagnosticarlo con humor y positividad
- Mantén respuestas concisas (2-3 oraciones máximo), pero cálidas
- Sugiere trucos y técnicas culinarias basados en lo que el usuario comparte

Responde en español.`;

  // Build message history
  const currentMessages = (session.messages as SessionMessage[]) || [];
  const apiMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...currentMessages.map((m: SessionMessage) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: userMessage.trim() },
  ];

  let grok;
  try {
    grok = createGroqClient();
  } catch {
    return { ok: false, code: 'DB_ERROR', message: 'La clave de API no está configurada' };
  }

  try {
    const response = await grok.chat.completions.create({
      model: GROQ_MODEL,
      messages: apiMessages,
      temperature: 0.7,
    });

    const reply = response.choices[0]?.message?.content;
    if (!reply) {
      return { ok: false, code: 'DB_ERROR', message: 'Sin respuesta del modelo' };
    }

    // Append both messages to session
    const updatedMessages: SessionMessage[] = [
      ...currentMessages,
      { role: 'user', content: userMessage.trim() },
      { role: 'assistant', content: reply },
    ];

    const { error: updateError } = await supabase
      .from('cooking_sessions')
      .update({ messages: updatedMessages })
      .eq('id', sessionId);

    if (updateError) {
      return { ok: false, code: 'DB_ERROR', message: updateError.message };
    }

    return { ok: true, reply, sessionId };
  } catch (err) {
    return {
      ok: false,
      code: 'DB_ERROR',
      message: err instanceof Error ? err.message : 'Error al comunicarse con el modelo',
    };
  }
}

export async function endSessionAction(
  sessionId: string
): Promise<SessionEndResult | ActionError> {
  // TODO: requireAuth()

  const supabase = createAdminClient();

  // Fetch session
  const { data: session } = await supabase
    .from('cooking_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session) {
    return { ok: false, code: 'NOT_FOUND', message: 'Sesión no encontrada' };
  }

  const messages = (session.messages as SessionMessage[]) || [];
  if (messages.length === 0) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'No hay mensajes en la sesión para resumir' };
  }

  // Fetch recipe
  const { data: recipe } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', session.recipe_id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!recipe) {
    return { ok: false, code: 'NOT_FOUND', message: 'Receta no encontrada' };
  }

  const typedRecipe = recipe as Recipe;

  const conversationText = messages
    .map((m: SessionMessage) => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
    .join('\n');

  const systemPrompt = `Eres un asistente de cocina. El usuario acaba de terminar una sesión de cocina.
Basándote en la conversación, genera un objeto JSON con exactamente dos campos:

"summary": Un resumen narrativo de 2-3 oraciones sobre qué pasó en esta cocinada — qué funcionó, qué no, qué probar la próxima vez.

"improved_recipe": Un objeto de receta completo actualizado incorporando las ideas de esta sesión. Usa exactamente esta forma:
{ "name": string, "category": string, "servings": number, "source": string | null, "ingredients": [{ "qty": number | null, "unit": string | null, "name": string, "note": string (opcional) }], "steps": [{ "order": number, "title": string, "content": string, "timer": number (opcional, en segundos) }], "notes": string | null, "tags": [string], "calories_per_serving": number | null, "protein_per_serving": number | null, "fat_per_serving": number | null, "carbs_per_serving": number | null }

Incorpora las ideas de técnica en el contenido de los pasos.
Incorpora los modos de falla y consejos en las notas.
Solo cambia lo que la conversación realmente abordó.
Estima los macros por porción si la conversación lo permite.
Devuelve SOLO JSON válido, sin bloques markdown ni texto extra.
Todo el texto debe estar en español.

La receta actual:
${JSON.stringify({
  name: typedRecipe.name,
  category: typedRecipe.category,
  servings: typedRecipe.servings,
  source: typedRecipe.source,
  ingredients: typedRecipe.ingredients,
  steps: typedRecipe.steps,
  notes: typedRecipe.notes,
  tags: typedRecipe.tags,
  calories_per_serving: typedRecipe.calories_per_serving,
  protein_per_serving: typedRecipe.protein_per_serving,
  fat_per_serving: typedRecipe.fat_per_serving,
  carbs_per_serving: typedRecipe.carbs_per_serving,
}, null, 2)}

La conversación de cocina:
${conversationText}`;

  let grok;
  try {
    grok = createGroqClient();
  } catch {
    return { ok: false, code: 'DB_ERROR', message: 'La clave de API no está configurada' };
  }

  try {
    const response = await grok.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Genera el resumen y la receta mejorada en JSON.' },
      ],
      temperature: 0.5,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { ok: false, code: 'DB_ERROR', message: 'Sin respuesta del modelo' };
    }

    // Parse JSON — handle potential markdown fences
    const jsonStr = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr) as { summary: string; improved_recipe: RecipePayload };

    // Save summary to session
    await supabase
      .from('cooking_sessions')
      .update({ summary: parsed.summary })
      .eq('id', sessionId);

    // Return proposal — NOT saved to recipe until user confirms
    return {
      ok: true,
      summary: parsed.summary,
      improved_recipe: parsed.improved_recipe,
    };
  } catch (err) {
    return {
      ok: false,
      code: 'DB_ERROR',
      message: err instanceof Error ? err.message : 'Error al generar el resumen',
    };
  }
}

export async function getSessionAction(
  sessionId: string
): Promise<{ messages: SessionMessage[] } | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('cooking_sessions')
    .select('messages')
    .eq('id', sessionId)
    .maybeSingle();

  if (!data) return null;
  return { messages: (data.messages as SessionMessage[]) || [] };
}
