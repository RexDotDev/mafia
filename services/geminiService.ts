import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const getNarration = async (context: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Ti si mračni i misteriozni narator igre Mafija. Na srpskom jeziku, napiši kratku, atmosferičnu rečenicu o sledećem događaju: ${context}. Budi dramatičan.`,
    });
    return response.text || "Noć je prošla u tišini...";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Grad se budi sa strepnjom...";
  }
};
