import { hotelConfig } from '../../config/hotels/hotel-bernal.js';
import { logger } from '../services/logger.js';

/**
 * Detect language from guest message (simple heuristic)
 * Returns 'es' or 'en'
 */
export function detectLanguageFromMessage(message: string): 'es' | 'en' {
  if (!message) return hotelConfig.persona.language.default as 'es' | 'en';

  const lower = message.toLowerCase();

  // English indicators
  const enKeywords = [
    'hello',
    'hi ',
    'help',
    'room',
    'book',
    'available',
    'thank',
    'please',
    'thanks',
    'yes',
    'no',
    'i ',
    "i'",
  ];
  const enCount = enKeywords.filter((kw) => lower.includes(kw)).length;

  // Spanish indicators
  const esKeywords = [
    'hola',
    'ayuda',
    'habitación',
    'reserva',
    'disponib',
    'gracias',
    'por favor',
    'si',
    'no',
    'yo',
    'quisiera',
    'quiero',
    'tengo',
    '¿',
    '¡',
  ];
  const esCount = esKeywords.filter((kw) => lower.includes(kw)).length;

  return esCount > enCount ? 'es' : 'en';
}

/**
 * Get default language from hotel config
 */
export function getDefaultLanguage(): 'es' | 'en' {
  return (hotelConfig.persona.language.default as 'es' | 'en') || 'es';
}

/**
 * Build system prompt from hotel config
 * Includes: persona, instructions, booking info, current capabilities
 */
export function getSystemPrompt(language: 'es' | 'en'): string {
  const { persona, instructions, booking, hours } = hotelConfig;

  if (language === 'en') {
    return `${persona.personality}

## Current Hotel Information
- Hotel: ${hotelConfig.name}
- Concierge: ${persona.name}
- Currency: ${booking.currency}
- Front Desk Hours: ${hours.frontDesk.open}-${hours.frontDesk.close}
- Room Service Hours: ${hours.roomService.open}-${hours.roomService.close}

## What You Can Help With
${instructions.canDo.map((item) => `- ${item}`).join('\n')}

## What You Cannot Do (Escalate to Human)
${instructions.cannotDo.map((item) => `- ${item}`).join('\n')}

## Booking Information
- Payment Options: Full payment OR ${booking.depositPercent}% deposit
- Payment Link Valid For: ${booking.paymentLinkExpiryMinutes} minutes
- Currency: ${booking.currency}${booking.showUsdReference ? ' (show USD reference for international guests)' : ''}

Remember: Your primary goal is to convert guests into confirmed, paid bookings. Be warm,
professional, and always bilingual. Switch to English gracefully if the guest uses English.
Never break character. You are ${persona.name}, the hotel concierge.`;
  }

  return `${persona.personality}

## Información del Hotel
- Hotel: ${hotelConfig.name}
- Conserje: ${persona.name}
- Moneda: ${booking.currency}
- Horarios Recepción: ${hours.frontDesk.open}-${hours.frontDesk.close}
- Horarios Room Service: ${hours.roomService.open}-${hours.roomService.close}

## En Qué Puedes Ayudar
${instructions.canDo.map((item) => `- ${item}`).join('\n')}

## Qué NO Puedes Hacer (Escalar a Humano)
${instructions.cannotDo.map((item) => `- ${item}`).join('\n')}

## Información de Reservas
- Opciones de Pago: Pago completo O ${booking.depositPercent}% de anticipo
- Validez del Link: ${booking.paymentLinkExpiryMinutes} minutos
- Moneda: ${booking.currency}${booking.showUsdReference ? ' (mostrar referencia en USD para huéspedes internacionales)' : ''}

Recuerda: Tu objetivo principal es convertir huéspedes en reservas confirmadas y pagadas.
Sé cálida, profesional y siempre bilingüe. Cambia a inglés sin problema si el huésped lo pide.
Nunca rompas tu personaje. Eres ${persona.name}, la conserje del hotel.`;
}

