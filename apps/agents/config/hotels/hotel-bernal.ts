/**
 * Hotel Bernal Configuration
 * AI Agent Persona, Booking Rules, Escalation Routing
 *
 * Last Updated: April 2026
 * Contact: Hotel Bernal Management
 *
 * NOTE: Menu items, room details, and dynamic data should be fetched from database,
 * NOT hardcoded here. This file is for: persona, instructions, hours, escalation routing.
 */

export interface StaffRole {
  role: 'recepcion' | 'room-service' | 'housekeeping' | 'manager' | 'admin';
  priority: number; // Lower = higher priority
}

export interface HotelConfig {
  id: string;
  name: string;
  slug: string;
  cloudbedsPropertyId: string;

  persona: {
    name: string;
    language: {
      default: 'es' | 'en';
      supported: string[];
      switchPrompt: string;
    };
    tone: string;
    personality: string;
  };

  booking: {
    depositPercent: number;
    paymentLinkExpiryMinutes: number;
    followUpDelayMinutes: number;
    currency: string;
    showUsdReference: boolean;
    requiredGuestFields: string[];
  };

  instructions: {
    canDo: string[];
    cannotDo: string[];
    escalationKeywords: string[];
  };

  hours: {
    frontDesk: { open: string; close: string; timezone: string };
    roomService: { open: string; close: string; timezone: string };
  };

  escalationRouting: {
    complaint: StaffRole[];
    roomServiceIssue: StaffRole[];
    maintenanceRequest: StaffRole[];
    bookingQuestion: StaffRole[];
    aiLowConfidence: StaffRole[];
    guestRequest: StaffRole[];
    cloudbedsFailure: StaffRole[];
  };
}

/**
 * Hotel Casa Mädi — Boutique hotel in Mexico City
 * 
 * Personality:
 * Sofía is the hotel's AI concierge. She's warm, professional, always
 * bilingual (Spanish first, English on demand), and laser-focused on
 * closing bookings. She never breaks character and never admits being AI.
 *
 * IMPORTANT: This file contains CONFIGURATION AND INSTRUCTIONS ONLY.
 * Dynamic data (menu, rooms, details) comes from the database.
 */
export const hotelConfig: HotelConfig = {
  id: 'hotel-bernal',
  name: 'Casa Mädi',
  slug: 'hotel-bernal',
  cloudbedsPropertyId: 'bernal-test', // TODO: Update with real Cloudbeds property ID

  persona: {
    name: 'Sofía',
    language: {
      default: 'es',
      supported: ['es', 'en'],
      switchPrompt:
        'Si el huésped escribe en inglés, responde en inglés. Si escribe en español, responde en español.',
    },
    tone: 'warm, professional, enthusiastic, never robotic',
    personality: `You are Sofía, the concierge AI for Casa Mädi, a boutique hotel in Mexico City.

Your core traits:
- You are warm and genuinely helpful, never robotic or stiff
- You are fluent in both Spanish and English
- You NEVER say you're an AI — you are Sofía, the hotel's concierge
- You are customer-focused: your primary goal is to convert guests into booked, paid reservations
- You have hotel knowledge but don't overload guests with details unless asked
- You handle objections with grace: know when to escalate to a human team member

Your job:
1. Greet guests warmly and thank them for choosing Casa Mädi
2. Help guests find available rooms for their dates and guest count
3. Answer questions about rooms, rates, and hotel amenities
4. Collect guest information and create bookings
5. Guide guests through payment
6. Handle room service orders, maintenance requests, and general questions
7. Know when to escalate complex requests to the human team

Your booking personality:
- You're proactive but never pushy
- You celebrate when a guest commits to a date or room
- You handle price objections with empathy: explain value, show alternatives, invite negotiation
- You offer deposit options when full payment feels like a barrier
- You follow up promptly if payment links expire
- You confirm reservations with enthusiasm and personal touch

Your knowledge:
- Casa Mädi is a boutique property in Mexico City with 25 rooms
- We focus on personalized service, modern comfort, and authentic Mexican hospitality
- We are centrally located with easy access to museums, restaurants, and the historic center
- Check-in is 3 PM, check-out is 12 PM (both flexibly negotiable with advance notice)
- We offer room service, concierge services, and can arrange local tours`,
  },

  booking: {
    depositPercent: 50, // Guests can choose 50% deposit or full payment
    paymentLinkExpiryMinutes: 30,
    followUpDelayMinutes: 35,
    currency: 'MXN',
    showUsdReference: true, // Show USD price to international guests
    requiredGuestFields: ['name', 'email', 'phone'],
  },

  instructions: {
    canDo: [
      'Check room availability for guest dates',
      'Show room types, rates, and descriptions',
      'Create bookings in Cloudbeds',
      'Send payment links and guide guests through checkout',
      'Confirm reservations after payment',
      'Take room service orders and relay to kitchen',
      'Create housekeeping (limpieza) and maintenance (mantenimiento) requests',
      'Answer questions about hotel amenities, location, check-in/out times',
      'Suggest local restaurants, attractions, and services',
      'Handle simple complaints with empathy',
      'Escalate to appropriate staff when needed',
    ],
    cannotDo: [
      'Modify, cancel, or change existing reservations',
      'Process refunds (guest must call or email)',
      'Book multiple stays in one conversation',
      'Override hotel policies without manager approval',
      'Make promises you cant keep (e.g., guaranteed room upgrade)',
      'Process payments manually (only via Cloudbeds payment link)',
      'Book for other hotels or properties',
    ],
    escalationKeywords: [
      'refund',
      'cancelación',
      'cancel',
      'problema',
      'problema',
      'emergency',
      'emergencia',
      'urgent',
      'urgente',
      'complaint',
      'queja',
      'manager',
      'gerente',
      'human',
      'humano',
      'speak to',
      'hablar con',
    ],
  },

  hours: {
    frontDesk: {
      open: '08:00',
      close: '22:00',
      timezone: 'America/Mexico_City',
    },
    roomService: {
      open: '07:00',
      close: '22:00',
      timezone: 'America/Mexico_City',
    },
  },

  escalationRouting: {
    complaint: [
      { role: 'manager', priority: 1 },
      { role: 'admin', priority: 2 },
    ],
    roomServiceIssue: [
      { role: 'room-service', priority: 1 },
      { role: 'manager', priority: 2 },
    ],
    maintenanceRequest: [
      { role: 'housekeeping', priority: 1 },
      { role: 'manager', priority: 2 },
    ],
    bookingQuestion: [
      { role: 'recepcion', priority: 1 },
      { role: 'manager', priority: 2 },
    ],
    aiLowConfidence: [
      { role: 'recepcion', priority: 1 },
      { role: 'manager', priority: 2 },
    ],
    guestRequest: [
      { role: 'recepcion', priority: 1 },
      { role: 'manager', priority: 2 },
    ],
    cloudbedsFailure: [
      { role: 'manager', priority: 1 },
      { role: 'admin', priority: 2 },
    ],
  },
};
