/**
 * Hotel Bernal Configuration
 * AI Agent Persona, Booking Rules, Menu, Escalation Routing
 *
 * Last Updated: April 2026
 * Contact: Hotel Bernal Management
 */

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'desayuno' | 'comida' | 'cena' | '24h';
  available: boolean;
  imageUrl?: string;
}

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

  menu: MenuItem[];

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
 * Hotel Bernal — Boutiqu hotel in Mexico City
 * 
 * Personality:
 * Sofía is the hotel's AI concierge. She's warm, professional, always
 * bilingual (Spanish first, English on demand), and laser-focused on
 * closing bookings. She never breaks character and never admits being AI.
 */
export const hotelConfig: HotelConfig = {
  id: 'hotel-bernal',
  name: 'Hotel Bernal',
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
    personality: `You are Sofía, the concierge AI for Hotel Bernal, a boutique hotel in Mexico City.

Your core traits:
- You are warm and genuinely helpful, never robotic or stiff
- You speak Spanish naturally as your first language (for Spanish guests)
- You switch to English flawlessly (for English guests) but prefer Spanish when in doubt
- You are customer-focused: your primary goal is to convert guests into booked, paid reservations
- You have hotel knowledge but don't overload guests with details unless asked
- You handle objections with grace: know when to escalate to a human team member
- You NEVER say you're an AI — you are Sofía, the hotel's concierge

Your job:
1. Greet guests warmly and thank them for choosing Hotel Bernal
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
- Hotel Bernal is a boutique property in Mexico City with 25 rooms
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

  menu: [
    // Breakfast (7-11 AM)
    {
      id: 'pan-dulce-basket',
      name: 'Canasta de Pan Dulce',
      description: 'Fresh sweet breads, jams, and butter',
      price: 120,
      category: 'desayuno',
      available: true,
    },
    {
      id: 'omelet-especial',
      name: 'Omelette Bernal (3 eggs, chorizo, quesillo, cilantro)',
      description: 'Chef-prepared omelet with local chorizo and fresh cheese',
      price: 220,
      category: 'desayuno',
      available: true,
    },
    {
      id: 'chilaquiles-verdes',
      name: 'Chilaquiles Verdes',
      description: 'Crispy tortilla chips with green salsa, sour cream, fresh cheese',
      price: 180,
      category: 'desayuno',
      available: true,
    },
    {
      id: 'huevos-rancheros',
      name: 'Huevos Rancheros',
      description: 'Fried eggs on corn tortillas with pico de gallo and beans',
      price: 200,
      category: 'desayuno',
      available: true,
    },
    {
      id: 'cafe-pastry',
      name: 'Café + Pastry',
      description: 'Espresso, Americano, or cappuccino with croissant or churro',
      price: 85,
      category: 'desayuno',
      available: true,
    },

    // Lunch & Dinner (12-22)
    {
      id: 'tacos-al-pastor',
      name: 'Tacos al Pastor (3 tacos)',
      description: 'Marinated pork, pineapple, cilantro, onion on corn tortillas',
      price: 150,
      category: 'comida',
      available: true,
    },
    {
      id: 'carne-asada',
      name: 'Carne Asada con Guacamole',
      description:
        'Grilled beef with fresh guacamole, grilled onions, lime, tortillas',
      price: 380,
      category: 'comida',
      available: true,
    },
    {
      id: 'chile-relleno',
      name: 'Chile Relleno de Quesillo',
      description: 'Poblano pepper stuffed with melted cheese, served with rice',
      price: 240,
      category: 'comida',
      available: true,
    },
    {
      id: 'sopa-tortilla',
      name: 'Sopa de Tortilla',
      description:
        'Classic Mexico City tortilla soup with crispy strips, avocado, lime',
      price: 120,
      category: 'comida',
      available: true,
    },
    {
      id: 'quesadillas',
      name: 'Quesadillas (3 quesadillas)',
      description:
        'Corn tortillas stuffed with Oaxaca cheese and your choice of filling',
      price: 180,
      category: 'comida',
      available: true,
    },
    {
      id: 'nopales-salad',
      name: 'Nopal y Queso Fresco (salad)',
      description: 'Fresh cactus, tomato, onion, cilantro, lime vinaigrette',
      price: 140,
      category: 'comida',
      available: true,
    },

    // Dinner (18-22)
    {
      id: 'filete-encebollado',
      name: 'Filete Encebollado',
      description: 'Pan-seared beef tenderloin with caramelized onions',
      price: 480,
      category: 'cena',
      available: true,
    },
    {
      id: 'salmon-cilantro',
      name: 'Salmón al Cilantro',
      description: 'Fresh salmon fillet with cilantro butter, served with vegetables',
      price: 420,
      category: 'cena',
      available: true,
    },
    {
      id: 'mole-negro',
      name: 'Pollo en Mole Negro',
      description:
        'Chicken simmered in traditional Oaxacan mole, served with rice',
      price: 380,
      category: 'cena',
      available: true,
    },

    // Beverages (24h)
    {
      id: 'agua-fresca',
      name: 'Agua Fresca (Horchata, Jamaica, o Tamarindo)',
      description: 'Traditional Mexican refreshing drink',
      price: 45,
      category: '24h',
      available: true,
    },
    {
      id: 'margarita-classic',
      name: 'Margarita Clásica',
      description: 'Tequila, triple sec, fresh lime, salt rim',
      price: 150,
      category: '24h',
      available: true,
    },
    {
      id: 'cerveza',
      name: 'Cerveza (Corona, Modelo, o Tecate)',
      description: 'Selection of local Mexican beers',
      price: 60,
      category: '24h',
      available: true,
    },
    {
      id: 'chocolate-caliente',
      name: 'Chocolate Caliente',
      description: 'Traditional Mexican hot chocolate, creamy and rich',
      price: 70,
      category: '24h',
      available: true,
    },

    // Desserts (24h)
    {
      id: 'flan',
      name: 'Flan (Crème Caramel)',
      description: 'Classic Mexican custard with caramel sauce',
      price: 95,
      category: '24h',
      available: true,
    },
    {
      id: 'churros',
      name: 'Churros con Chocolate',
      description: 'Fried pastry with hot chocolate for dipping',
      price: 75,
      category: '24h',
      available: true,
    },
  ],

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
