import { GoogleGenAI, Type } from "@google/genai";
import { MealPlan, ShoppingItem, CalendarEvent, Recipe } from "../types";

const apiKey = process.env.API_KEY || '';
// Use a fresh instance for calls to ensure key validity if it changes, 
// though typically env vars are static.
const getAI = () => new GoogleGenAI({ apiKey });

// Helper to get today's date string
const getTodayString = () => new Date().toISOString().split('T')[0];

export const suggestMealPlan = async (preferences: string): Promise<MealPlan[]> => {
  if (!apiKey) return [];
  const ai = getAI();
  
  const prompt = `Erstelle einen Essensplan für die nächsten 3 Tage für eine Familie. 
  Präferenzen: ${preferences || 'Gesund und schnell, kinderfreundlich'}.
  Gib das Ergebnis als JSON zurück.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.STRING, description: "Wochentag (z.B. Montag)" },
              mealName: { type: Type.STRING, description: "Name des Gerichts" },
              ingredients: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Liste der Hauptzutaten"
              },
              recipeHint: { type: Type.STRING, description: "Kurzer Zubereitungshinweis (max 15 Wörter)" }
            },
            required: ["day", "mealName", "ingredients", "recipeHint"]
          }
        }
      }
    });

    return response.text ? JSON.parse(response.text) : [];
  } catch (error) {
    console.error("Meal plan error:", error);
    return [];
  }
};

export const parseNaturalLanguageEvent = async (input: string): Promise<Partial<CalendarEvent> | null> => {
  if (!apiKey) return null;
  const ai = getAI();
  
  const prompt = `Analysiere diesen Text und extrahiere Termindetails: "${input}". 
  Heute ist ${getTodayString()}. 
  Wenn keine Zeit angegeben ist, nimm 12:00 an.
  Wenn kein Datum angegeben ist, nimm das nächstmögliche Datum an.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            date: { type: Type.STRING, description: "YYYY-MM-DD Format" },
            time: { type: Type.STRING, description: "HH:MM Format" },
            location: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["title", "date", "time"]
        }
      }
    });

    return response.text ? JSON.parse(response.text) : null;
  } catch (error) {
    console.error("Event parse error:", error);
    return null;
  }
};

export const analyzeRecipeImage = async (base64Image: string): Promise<Recipe | null> => {
    if (!apiKey) return null;
    const ai = getAI();

    try {
        // Prepare image part (remove data:image/xxx;base64, prefix if present for logic, but SDK often needs specific handling)
        // The SDK expects pure base64 in 'data'.
        const base64Data = base64Image.split(',')[1];
        const mimeType = base64Image.split(';')[0].split(':')[1];

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    },
                    {
                        text: "Analysiere dieses Rezeptbild/Gericht. Extrahiere den Namen des Gerichts, eine kurze Beschreibung und eine Liste der benötigten Zutaten. Antworte in JSON."
                    }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        ingredients: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["name", "ingredients"]
                }
            }
        });

        if (response.text) {
            const data = JSON.parse(response.text);
            return {
                id: Date.now().toString(),
                name: data.name,
                ingredients: data.ingredients,
                description: data.description,
                image: base64Image
            };
        }
        return null;
    } catch (error) {
        console.error("Recipe scan error:", error);
        return null;
    }
};

export const suggestActivities = async (
  query: string, 
  lat: number, 
  lng: number
): Promise<{ text: string; places: any[] }> => {
  if (!apiKey) return { text: "API Key fehlt.", places: [] };
  const ai = getAI();

  try {
    // Implement Maps Grounding as per instructions
    const finalResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Empfiehl Orte für Familien: ${query}`,
        config: {
            tools: [{googleMaps: {}}],
            toolConfig: {
                // @ts-ignore - The SDK types might be strict, but this matches the instruction pattern
                retrievalConfig: {
                    latLng: {
                        latitude: lat,
                        longitude: lng
                    }
                }
            }
        }
    });

    const chunks = finalResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    // Extract places from chunks
    const places = chunks
      .filter((c: any) => c.web?.uri || c.maps?.uri)
      .map((c: any) => {
         if (c.maps) return { ...c.maps, title: c.maps.title || "Ort ansehen" };
         if (c.web) return { ...c.web, title: c.web.title || "Webseite" };
         return null;
      })
      .filter(Boolean);

    return {
      text: finalResponse.text || "Keine Ergebnisse gefunden.",
      places: places
    };

  } catch (error) {
    console.error("Activity search error:", error);
    return { text: "Entschuldigung, ich konnte keine Aktivitäten laden.", places: [] };
  }
};

export const generateAvatar = async (): Promise<string | null> => {
  if (!apiKey) return null;
  const ai = getAI();
  
  const themes = ['Pixar style 3D character', 'Watercolor painting', 'Cute pixel art', 'Friendly cartoon animal', 'Abstract colorful face'];
  const randomTheme = themes[Math.floor(Math.random() * themes.length)];
  
  const prompt = `Generate a profile picture avatar. Style: ${randomTheme}. 
  The subject should be centered, joyful, and suitable for a family app. 
  White or simple gradient background.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      // responseMimeType is not supported for nano banana
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Avatar generation error:", error);
    return null;
  }
};

export const findCoordinates = async (locationName: string): Promise<{lat: number, lng: number, name: string} | null> => {
    if (!apiKey) return null;
    const ai = getAI();

    try {
        // Maps Grounding does not support responseSchema or responseMimeType.
        // We ask for JSON in the prompt and parse the text manually.
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Bestimme die Geokoordinaten für: "${locationName}".
            Gib NUR ein JSON Objekt zurück im Format: {"lat": number, "lng": number, "name": "Offizieller Name"}. Keine Markdown Formatierung.`,
            config: {
                tools: [{ googleMaps: {} }],
            }
        });
        
        const text = response.text || "{}";
        // Cleanup potential markdown code blocks
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Geocoding error", e);
        return null;
    }
};