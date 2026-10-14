import type { Location } from '../shared/ids.ts';

export const QUIET_DAYS: Record<Location, { evidence: string; explanation: string }> = {
  bakery: {
    evidence: 'Flour bins inspected and ovens running on regular schedule.',
    explanation: 'A normal quiet morning of baking bread at the Bakery.',
  },
  bank: {
    evidence: 'Ledgers balanced and vault doors securely fastened.',
    explanation: 'Standard transactions and orderly deposits at the Bank.',
  },
  fountain_square: {
    evidence: 'Clear water flowing gently in the central marble basin.',
    explanation: 'Pigeons drinking peacefully on Fountain Square.',
  },
  town_hall: {
    evidence: 'Clerk desks orderly and municipal registers up to date.',
    explanation: 'Routine civic administration underway at Town Hall.',
  },
  clinic: {
    evidence: 'Medicine cabinets locked and waiting room calm.',
    explanation: 'Doctor Finch tending routine check-ups at the Clinic.',
  },
};
