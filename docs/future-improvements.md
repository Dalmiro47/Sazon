# Mejoras Futuras — Sazón

## Cálculo preciso de macros con USDA FoodData Central API

**Estado:** Pendiente
**Prioridad:** Media
**Contexto:** Actualmente los macros se estiman via LLM con Chain-of-Thought (mejora aplicada en `fix/calorias`). Los LLMs tienen ~36% de error promedio en estimación calórica incluso con buenas instrucciones. Para precisión real, se necesita una base de datos nutricional verificada.

### Propuesta

Reemplazar la estimación LLM de macros con lookup en USDA FoodData Central + LLM para normalización.

**Flujo:**
1. LLM extrae receta (igual que hoy)
2. Para cada ingrediente, llamar a USDA FDC API → obtener macros por 100g
3. Calcular: `macros_ingrediente = macros_per_100g × (qty_en_gramos / 100)`
4. Sumar todos los ingredientes → dividir entre `servings`
5. LLM sigue haciendo el resto (nombre, pasos, categoría, fit/fat tag)

### USDA FoodData Central API

- **Costo:** Gratis, sin límites de uso relevantes para esta escala
- **Registro:** API key gratuita en https://fdc.nal.usda.gov/api-guide.html
- **Precisión:** Lab-verified (mismo source que Cronometer)
- **Endpoint principal:** `GET /v1/foods/search?query={ingredient}&api_key={key}`

**Env var a agregar:** `USDA_FDC_API_KEY`

### Dificultades a resolver

- **Normalización de unidades:** Convertir unidades del app (`taza`, `cda`, `cdta`, `pieza`) a gramos antes del lookup. Necesita una tabla de conversión por ingrediente o llamada LLM auxiliar.
- **Matching de ingredientes:** "pechuga de pollo" → buscar en FDC → elegir el item más relevante (raw, sin procesar). El LLM puede hacer el matching dado los primeros N resultados del search.
- **Ingredientes sin datos:** Platos muy específicos o regionales pueden no estar. Fallback a estimación LLM para esos items.
- **Ingredientes "al gusto" (qty null):** Ignorar en el cálculo o asignar cantidad mínima estándar.

### Referencia de investigación

- LLMs tienen ~36% MAPE en calorías y >60% en proteínas sin datos estructurados
- CoT + few-shot (implementado) mejora ~15-20% pero no elimina el error sistemático
- Fuente: NutriBench benchmark (arXiv 2407.12843), PMC 2025 validación Cronometer vs MyFitnessPal
