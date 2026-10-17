import type { Iso3, Region } from "./enrich";

/**
 * iso3 -> [iso2, region] for every country in the dataset.
 *
 * iso2 exists to derive the flag emoji (two regional indicator symbols).
 * Non-sovereign or disputed entries the dataset carries are included:
 *   XKX -> XK (Kosovo; a user-assigned code, so the flag emoji renders only on
 *              platforms that ship it), TWN -> TW, HKG -> HK, MAC -> MO,
 *   PSE -> PS.
 *
 * Regions use the seven buckets the UI filters by and follow the choices the
 * app already made for the countries it covered (Georgia in Europe, Egypt in
 * Africa, Turkey in Europe).
 */
export const ISO: Record<string, readonly [string, Region]> = {
  // Europe
  ALB: ["AL", "Europe"], AND: ["AD", "Europe"], AUT: ["AT", "Europe"], BEL: ["BE", "Europe"],
  BGR: ["BG", "Europe"], BIH: ["BA", "Europe"], BLR: ["BY", "Europe"], CHE: ["CH", "Europe"],
  CYP: ["CY", "Europe"], CZE: ["CZ", "Europe"], DEU: ["DE", "Europe"], DNK: ["DK", "Europe"],
  ESP: ["ES", "Europe"], EST: ["EE", "Europe"], FIN: ["FI", "Europe"], FRA: ["FR", "Europe"],
  GBR: ["GB", "Europe"], GEO: ["GE", "Europe"], GRC: ["GR", "Europe"], HRV: ["HR", "Europe"],
  HUN: ["HU", "Europe"], IRL: ["IE", "Europe"], ISL: ["IS", "Europe"], ITA: ["IT", "Europe"],
  LIE: ["LI", "Europe"], LTU: ["LT", "Europe"], LUX: ["LU", "Europe"], LVA: ["LV", "Europe"],
  MCO: ["MC", "Europe"], MDA: ["MD", "Europe"], MKD: ["MK", "Europe"], MLT: ["MT", "Europe"],
  MNE: ["ME", "Europe"], NLD: ["NL", "Europe"], NOR: ["NO", "Europe"], POL: ["PL", "Europe"],
  PRT: ["PT", "Europe"], ROU: ["RO", "Europe"], RUS: ["RU", "Europe"], SMR: ["SM", "Europe"],
  SRB: ["RS", "Europe"], SVK: ["SK", "Europe"], SVN: ["SI", "Europe"], SWE: ["SE", "Europe"],
  TUR: ["TR", "Europe"], UKR: ["UA", "Europe"], VAT: ["VA", "Europe"], XKX: ["XK", "Europe"],

  // Middle East
  ARE: ["AE", "Middle East"], BHR: ["BH", "Middle East"], IRN: ["IR", "Middle East"],
  IRQ: ["IQ", "Middle East"], ISR: ["IL", "Middle East"], JOR: ["JO", "Middle East"],
  KWT: ["KW", "Middle East"], LBN: ["LB", "Middle East"], OMN: ["OM", "Middle East"],
  PSE: ["PS", "Middle East"], QAT: ["QA", "Middle East"], SAU: ["SA", "Middle East"],
  SYR: ["SY", "Middle East"], YEM: ["YE", "Middle East"],

  // Asia
  AFG: ["AF", "Asia"], ARM: ["AM", "Asia"], AZE: ["AZ", "Asia"], BGD: ["BD", "Asia"],
  BRN: ["BN", "Asia"], BTN: ["BT", "Asia"], CHN: ["CN", "Asia"], HKG: ["HK", "Asia"],
  IDN: ["ID", "Asia"], IND: ["IN", "Asia"], JPN: ["JP", "Asia"], KAZ: ["KZ", "Asia"],
  KGZ: ["KG", "Asia"], KHM: ["KH", "Asia"], KOR: ["KR", "Asia"], LAO: ["LA", "Asia"],
  LKA: ["LK", "Asia"], MAC: ["MO", "Asia"], MDV: ["MV", "Asia"], MMR: ["MM", "Asia"],
  MNG: ["MN", "Asia"], MYS: ["MY", "Asia"], NPL: ["NP", "Asia"], PAK: ["PK", "Asia"],
  PHL: ["PH", "Asia"], PRK: ["KP", "Asia"], SGP: ["SG", "Asia"], THA: ["TH", "Asia"],
  TJK: ["TJ", "Asia"], TKM: ["TM", "Asia"], TLS: ["TL", "Asia"], TWN: ["TW", "Asia"],
  UZB: ["UZ", "Asia"], VNM: ["VN", "Asia"],

  // Africa
  AGO: ["AO", "Africa"], BDI: ["BI", "Africa"], BEN: ["BJ", "Africa"], BFA: ["BF", "Africa"],
  BWA: ["BW", "Africa"], CAF: ["CF", "Africa"], CIV: ["CI", "Africa"], CMR: ["CM", "Africa"],
  COD: ["CD", "Africa"], COG: ["CG", "Africa"], COM: ["KM", "Africa"], CPV: ["CV", "Africa"],
  DJI: ["DJ", "Africa"], DZA: ["DZ", "Africa"], EGY: ["EG", "Africa"], ERI: ["ER", "Africa"],
  ETH: ["ET", "Africa"], GAB: ["GA", "Africa"], GHA: ["GH", "Africa"], GIN: ["GN", "Africa"],
  GMB: ["GM", "Africa"], GNB: ["GW", "Africa"], GNQ: ["GQ", "Africa"], KEN: ["KE", "Africa"],
  LBR: ["LR", "Africa"], LBY: ["LY", "Africa"], LSO: ["LS", "Africa"], MAR: ["MA", "Africa"],
  MDG: ["MG", "Africa"], MLI: ["ML", "Africa"], MOZ: ["MZ", "Africa"], MRT: ["MR", "Africa"],
  MUS: ["MU", "Africa"], MWI: ["MW", "Africa"], NAM: ["NA", "Africa"], NER: ["NE", "Africa"],
  NGA: ["NG", "Africa"], RWA: ["RW", "Africa"], SDN: ["SD", "Africa"], SEN: ["SN", "Africa"],
  SLE: ["SL", "Africa"], SOM: ["SO", "Africa"], SSD: ["SS", "Africa"], STP: ["ST", "Africa"],
  SWZ: ["SZ", "Africa"], SYC: ["SC", "Africa"], TCD: ["TD", "Africa"], TGO: ["TG", "Africa"],
  TUN: ["TN", "Africa"], TZA: ["TZ", "Africa"], UGA: ["UG", "Africa"], ZAF: ["ZA", "Africa"],
  ZMB: ["ZM", "Africa"], ZWE: ["ZW", "Africa"],

  // North America (including Central America and the Caribbean)
  ATG: ["AG", "North America"], BHS: ["BS", "North America"], BLZ: ["BZ", "North America"],
  BRB: ["BB", "North America"], CAN: ["CA", "North America"], CRI: ["CR", "North America"],
  CUB: ["CU", "North America"], DMA: ["DM", "North America"], DOM: ["DO", "North America"],
  GRD: ["GD", "North America"], GTM: ["GT", "North America"], HND: ["HN", "North America"],
  HTI: ["HT", "North America"], JAM: ["JM", "North America"], KNA: ["KN", "North America"],
  LCA: ["LC", "North America"], MEX: ["MX", "North America"], NIC: ["NI", "North America"],
  PAN: ["PA", "North America"], SLV: ["SV", "North America"], TTO: ["TT", "North America"],
  USA: ["US", "North America"], VCT: ["VC", "North America"],

  // South America
  ARG: ["AR", "South America"], BOL: ["BO", "South America"], BRA: ["BR", "South America"],
  CHL: ["CL", "South America"], COL: ["CO", "South America"], ECU: ["EC", "South America"],
  GUY: ["GY", "South America"], PER: ["PE", "South America"], PRY: ["PY", "South America"],
  SUR: ["SR", "South America"], URY: ["UY", "South America"], VEN: ["VE", "South America"],

  // Oceania
  AUS: ["AU", "Oceania"], FJI: ["FJ", "Oceania"], FSM: ["FM", "Oceania"], KIR: ["KI", "Oceania"],
  MHL: ["MH", "Oceania"], NRU: ["NR", "Oceania"], NZL: ["NZ", "Oceania"], PLW: ["PW", "Oceania"],
  PNG: ["PG", "Oceania"], SLB: ["SB", "Oceania"], TON: ["TO", "Oceania"], TUV: ["TV", "Oceania"],
  VUT: ["VU", "Oceania"], WSM: ["WS", "Oceania"],
};

/** Two regional indicator symbols, e.g. "IN" -> 🇮🇳. */
export function flagEmoji(iso2: string): string {
  return String.fromCodePoint(...[...iso2].map((ch) => 0x1f1e6 + (ch.charCodeAt(0) - 65)));
}

export type { Iso3 };
