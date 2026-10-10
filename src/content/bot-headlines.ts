import type { ClaimType, LocationId } from './types.js';

export type BotPersonality = 'tabloid' | 'gazette' | 'wildcard';

export interface BotHeadlineContext {
  readonly personality: BotPersonality;
  readonly location: LocationId;
  readonly claimType: ClaimType;
  readonly rivalPaperName?: string;
  readonly rivalHeadline?: string;
}

export const BOT_HEADLINES = {
  tabloid: {
    danger: [
      'TOTAL PANIC: DISASTER STRIKES THE HEART OF TOWN!',
      'RUN FOR YOUR LIVES! CATASTROPHE LOOMS LARGE!',
      'DEADLY PERIL UNLEASHED: NO ONE IS SAFE TODAY!',
    ],
    health_scare: [
      'TOXIC OUTBREAK! CITIZENS SICKENED IN DROVES!',
      'POISON IN OUR MIDST: DO NOT CONSUME UNDER ANY COST!',
      'BIO-DISASTER SHOCKER: MEDICAL TEAM SOUNDS ALARM!',
    ],
    scandal: [
      'CORRUPTION CAUGHT ON TAPE: THE SHAMEFUL TRUTH!',
      'DIRTY SECRETS EXPOSED: COUNCIL IN COMPLETE DISGRACE!',
      'CAUGHT RED-HANDED! OFFICIALS SCRAMBLE TO COVER TRACKS!',
    ],
    great_deal: [
      'INSANE GIVEAWAY! THOUSANDS CASH IN FOR FREE!',
      'GREATEST BARGAIN IN HISTORY: DO NOT MISS OUT!',
      'PRICES SLASHED TO ZERO! RIOTOUS SHOPPERS RUSH IN!',
    ],
    weird_sighting: [
      'ALIEN PHENOMENON?! BIZARRE CREATURE SPOTTED IN BROAD DAYLIGHT!',
      'IMPOSSIBLE SIGHTING LEAVES SCIENTISTS BAFFLED AND TERRIFIED!',
      'SUPERNATURAL SHOCK! TOWN SQUARE ENGULFED IN MYSTERY!',
    ],
    all_clear: [
      'CRISIS AVERTED! TOWN SAVED AT THE VERY LAST SECOND!',
      'MIRACLE CALM: PEACE RESTORED AFTER HARROWING SCARE!',
    ],
    expose: [
      'EXPOSED! FRAUDULENT PAPER CAUGHT PRINTING BLATANT LIES!',
      'SHAMEFUL RIVALS UNMASKED: STOP READING THEIR PROPAGANDA!',
    ],
  },
  gazette: {
    danger: [
      'Safety Hazards Identified; Caution Advised Near Site',
      'Structural and Security Concerns Reported by Officials',
      'Civil Defense Bulletin: Avoid Area Until Further Notice',
    ],
    health_scare: [
      'Public Health Notice: Inspection Reveals Sanitation Issues',
      'Hygiene Advisory Issued Following Questionable Shipments',
      'Medical Officers Urge Restraint Pending Lab Results',
    ],
    scandal: [
      'Inquiry Opened Into Questionable Administrative Decisions',
      'Financial Discrepancies Raise Governance Questions',
      'Official Conduct Questioned Following Policy Irregularities',
    ],
    great_deal: [
      'Commercial Promotions Offer Unprecedented Consumer Savings',
      'Municipal Surplus Distribution Announced for All Residents',
      'Favorable Market Conditions Yield Substantial Price Cuts',
    ],
    weird_sighting: [
      'Unusual Meteorological Phenomenon Observed by Residents',
      'Astronomical Anomalies Documented Over Town Skyline',
      'Curious Botanical Incident Attracts Local Scholars',
    ],
    all_clear: [
      'Conditions Declared Normal and Orderly Across Municipal Grounds',
      'Routine Daily Activities Proceed Without Interruption',
    ],
    expose: [
      'Investigation Concludes Rival Headline Contained Falsehoods',
      'Editorial Retraction Demanded of Unsubstantiated Claims',
    ],
  },
  wildcard: {
    danger: [
      'SOMETHING EXPLODED (PROBABLY) AND CATS ARE MEOWING ANGRILY!',
      'LOOK OUT BELOW! THE SKY MIGHT NOT BE FALLING BUT STILL!',
      'WARNING: EVERYTHING IS HAPPENING ALL AT ONCE!',
    ],
    health_scare: [
      'DO NOT LICK THE WALLS TODAY: MY UNCLE WARNED ME!',
      'STRANGE HERBAL JUICE GIVES RESIDENTS WILD HICCUPS!',
      'MY STOMACH FEELS WEIRD AND SO WILL YOURS!',
    ],
    scandal: [
      'WHO TOOK THE MAYOR SOCKS?! THE PLOT THICKENS DEEP!',
      'MAYHEM AT TOWN MEETING: SOMEONE FORGOT THE COFFEE!',
      'SECRETS! WHISPERS! SUSPICIOUS HATS EVERYWHERE!',
    ],
    great_deal: [
      'FREE DOUGHNUTS OR FREE TROUBLE?! FIND OUT INSIDE!',
      'GIVING AWAY GOLD LIKE IT GROWS ON CABBAGE TREES!',
      'THE CHEAPEST STUFF YOU HAVE EVER SEEN IN YOUR WHOLE LIFE!',
    ],
    weird_sighting: [
      'A GLOWING BADGER SANG TO ME AT MIDNIGHT: AN EXCLUSIVE!',
      'TIME TRAVELERS OR JUST VERY WEIRD COUSINS?! YOU DECIDE!',
      'SPOOKY GREEN LIGHTS DEMAND MORE CHEESE FROM TOWNSFOLK!',
    ],
    all_clear: [
      'ABSOLUTELY NOTHING HAPPENED AND IT IS TERRIFYING!',
      'PEACE AND QUIET: IS THIS A TRICK BY THE SQUIRRELS?!',
    ],
    expose: [
      'BUSTED! THAT OTHER PAPER MADE IT ALL UP OUT OF THIN AIR!',
      'CAUGHT YA! OUR RIVALS COULD NOT TELL THE TRUTH TO SAVE A DONKEY!',
    ],
  },
} as const;

export function getFallbackBotHeadline(
  personality: BotPersonality,
  claimType: ClaimType,
  seedIndex: number = 0,
): string {
  const options = BOT_HEADLINES[personality][claimType];
  const idx = Math.abs(seedIndex) % options.length;
  return options[idx]!;
}
