export type LocationId =
  | 'bakery'
  | 'bank'
  | 'fountain_square'
  | 'town_hall'
  | 'clinic';

export type ClaimType =
  | 'danger'
  | 'health_scare'
  | 'scandal'
  | 'great_deal'
  | 'weird_sighting'
  | 'all_clear'
  | 'expose';

export interface EventTemplate {
  readonly id: string;
  readonly location: LocationId;
  readonly realClaim: Exclude<ClaimType, 'all_clear' | 'expose'>;
  readonly pReal: number; // 0.35 to 0.60
  readonly tipVariants: readonly string[]; // at least 2 variants
  readonly evidenceReal: string;
  readonly evidenceInnocent: string;
  readonly explanationReal: string;
  readonly explanationInnocent: string;
}
