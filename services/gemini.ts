import { GoogleGenAI, Type } from "@google/genai";
import { MealPlan, ShoppingItem, CalendarEvent, Recipe, PlaceRecommendation } from "../types";

const apiKey = process.env.API_KEY || '';
// Use a fresh instance for calls to ensure key validity if it changes, 
// though typically env vars are static.
const getAI = () => new GoogleGenAI({ apiKey });

// Helper to get today's date string
const getTodayString = () => new Date().toISOString().split('T')[0];

export const suggestMealPlan = async (preferences: string): Promise<MealPlan[]> => {
  if (!apiKey) return [];
  const ai = getAI();
  
  const prompt = `Erstelle einen Essensplan für die nächsten 7 Tage (vollständige Woche). 
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
              mealName: { type: Type.STRING, description: "Name des Gerichts (Abendessen)" },
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

    if (response.text) {
        const raw = JSON.parse(response.text);
        // Ensure every item has an ID for Supabase upsert
        return raw.map((item: any) => ({
            ...item,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            breakfast: '', // Initialize empty for manual entry
            lunch: ''      // Initialize empty for manual entry
        }));
    }
    return [];
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
): Promise<{ text: string; places: PlaceRecommendation[] }> => {
  if (!apiKey) return { text: "API Key fehlt.", places: [] };
  const ai = getAI();

  try {
    const prompt = `Empfiehl konkrete Orte für Familien basierend auf: "${query}".
    Standort: Latitude ${lat}, Longitude ${lng}.
    Antworte im JSON Format mit einer Liste von Orten.`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: "Kurze Zusammenfassung auf Deutsch" },
                    places: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                description: { type: Type.STRING, description: "Warum es gut für Familien ist" },
                                rating: { type: Type.STRING, description: "z.B. 4.5" },
                                address: { type: Type.STRING, description: "Adresse oder Entfernung" },
                            },
                            required: ["title", "description"]
                        }
                    }
                },
                required: ["summary", "places"]
            }
        }
    });

    if (response.text) {
        const data = JSON.parse(response.text);
        return {
            text: data.summary || "Hier sind einige Vorschläge:",
            places: data.places || []
        };
    }
    
    return { text: "Keine Ergebnisse gefunden.", places: [] };

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
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Bestimme die Geokoordinaten (Latitude/Longitude) für den Ort: "${locationName}".
            Gib den offiziellen Namen des Ortes zurück.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        lat: { type: Type.NUMBER },
                        lng: { type: Type.NUMBER },
                        name: { type: Type.STRING }
                    },
                    required: ["lat", "lng", "name"]
                }
            }
        });
        
        return response.text ? JSON.parse(response.text) : null;
    } catch (e) {
        console.error("Geocoding error", e);
        return null;
    }
};