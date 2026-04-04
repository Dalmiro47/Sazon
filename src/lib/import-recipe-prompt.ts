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
3. Macros POR PORCION: calcula paso a paso, no estimes el plato completo de golpe.
   a) Para cada ingrediente con qty conocida, estima sus macros usando valores USDA de referencia:
      Pechuga de pollo cruda 100g = 165 kcal | 31g prot | 3.6g grasa | 0g carbs
      Carne molida 80% magra 100g = 215 kcal | 26g prot | 12g grasa | 0g carbs
      Arroz cocido 100g = 130 kcal | 2.5g prot | 0.3g grasa | 28g carbs
      Papa cocida 100g = 87 kcal | 2g prot | 0.1g grasa | 20g carbs
      Aceite (cualquier tipo) 1 cda (14g) = 120 kcal | 0g prot | 14g grasa | 0g carbs
      Huevo entero 1 pieza (50g) = 72 kcal | 6g prot | 5g grasa | 0.4g carbs
      Harina de trigo 100g = 364 kcal | 10g prot | 1g grasa | 76g carbs
      Leche entera 100ml = 61 kcal | 3.2g prot | 3.3g grasa | 4.8g carbs
      Mantequilla 100g = 717 kcal | 0.9g prot | 81g grasa | 0.1g carbs
      Queso fresco 100g = 264 kcal | 18g prot | 21g grasa | 1g carbs
   b) Suma los macros de todos los ingredientes (total receta)
   c) DIVIDE entre el valor de "servings" para obtener el valor POR PORCION
   d) JAMAS null. Si no tienes datos exactos, estima sin exagerar — prefiere quedar corto a sobreestimar.
4. Tags: SIEMPRE agrega EXACTAMENTE uno de estos: "fit" o "fat"
   - "fat": si >450 kcal/porcion O >20g grasa O contiene chocolate/crema/mantequilla/fritos/postres
   - "fit": si <=450 kcal Y <=20g grasa Y es proteina magra/verduras/legumbres/integrales
   - EN DUDA: elige "fat"
5. TODO el texto en ESPANOL. Traduce si es necesario.
6. SALIDA: JSON VALIDO UNICAMENTE. Sin bloques de codigo, sin markdown, sin texto adicional.
7. Comillas: RECTAS DOBLES (no inteligentes). Sin caracteres especiales.

RECUERDA: Tu respuesta DEBE ser parseable por JSON.parse(). Solo JSON. Nada mas.`;
}
