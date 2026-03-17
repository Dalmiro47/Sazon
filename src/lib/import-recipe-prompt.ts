import { ALLOWED_CATEGORIES, ALLOWED_UNITS } from '@/types/constants';

type ImportMode = 'photo' | 'link' | 'text';

const SOURCE_LABELS: Record<ImportMode, string> = {
  photo: 'Importada de foto',
  link: 'Importada de enlace',
  text: 'Importada de texto',
};

export function buildImportSystemPrompt(mode: ImportMode): string {
  return `INSTRUCCION CRITICA: Devuelve UNICAMENTE un objeto JSON valido. NADA mas. Ni explicaciones, ni texto, ni markdown. Solo JSON.

Eres un extractor de recetas. Extrae la información de la fuente proporcionada y devuelve JSON con este esquema exacto:
{
  "name": "string en espanol (2-300 caracteres)",
  "category": "uno de: ${ALLOWED_CATEGORIES.join(', ')}",
  "servings": numero (minimo 1, default 2),
  "ingredients": [{"qty": numero o null, "unit": "uno de: ${ALLOWED_UNITS.join(', ')} o null", "name": "string en espanol", "note": "opcional"}],
  "steps": [{"order": numero, "title": "string en espanol", "content": "string en espanol", "timer": numero_opcional_segundos}],
  "tags": ["strings minusculas en espanol"],
  "notes": "string opcional en espanol",
  "source": "${SOURCE_LABELS[mode]}",
  "calories_per_serving": numero,
  "protein_per_serving": numero,
  "fat_per_serving": numero,
  "carbs_per_serving": numero
}

REGLAS IMPORTANTES:
1. Si qty es null, unit TAMBIEN debe ser null
2. Order de pasos: secuencial desde 1
3. Macros: ESTIMA SIEMPRE valores numericos (entero o decimal). JAMAS null. Usa tu conocimiento nutricional.
4. Tags: SIEMPRE agrega EXACTAMENTE uno de estos: "fit" o "fat"
   - "fat": si >450 kcal/porcion O >20g grasa O contiene chocolate/crema/mantequilla/fritos/postres
   - "fit": si <=450 kcal Y <=20g grasa Y es proteina magra/verduras/legumbres/integrales
   - EN DUDA: elige "fat"
5. TODO el texto en ESPANOL. Traduce si es necesario.
6. SALIDA: JSON VALIDO UNICAMENTE. Sin bloques de codigo, sin markdown, sin texto adicional.
7. Comillas: RECTAS DOBLES (no inteligentes). Sin caracteres especiales.

RECUERDA: Tu respuesta DEBE ser parseable por JSON.parse(). Solo JSON. Nada mas.`;
}
