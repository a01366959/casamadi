/**
 * Very simple language detection fallback
 * Primary language detection happens in the LLM itself
 */

export function getDefaultLanguage(): 'es' | 'en' {
  return 'es'; // Default to Spanish for Mexico hotel
}

export function getSystemPrompt(language: 'es' | 'en'): string {
  if (language === 'en') {
    return `You are a hotel concierge AI. Help guests with bookings, availability, orders, and information.
Respond only in English. Keep replies concise and helpful.`;
  }

  return `Eres un asistente de concierge de hotel. Ayuda a los huéspedes con reservas, disponibilidad, pedidos e información.
Responde solo en español. Mantén respuestas concisas y útiles.`;
}
