/**
 * Seed player pool.
 * Used so the app works before the data import pipelines are configured.
 * The app only reads from the DB in production; this is a local fallback.
 */

import type { Player } from "@/lib/game";

const NATIONS = [
  { name: "England", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁢" },
  { name: "Spain", emoji: "🇪🇸" },
  { name: "France", emoji: "🇫🇷" },
  { name: "Germany", emoji: "🇩🇪" },
  { name: "Italy", emoji: "🇮🇹" },
  { name: "Argentina", emoji: "🇦🇷" },
  { name: "Brazil", emoji: "🇧🇷" },
  { name: "Portugal", emoji: "🇵🇹" },
  { name: "Netherlands", emoji: "🇳🇱" },
  { name: "Belgium", emoji: "🇧🇪" },
] as const;

function player(id: string, attrs: {
  name: string; position: "GK" | "DEF" | "MID" | "FWD"; rating: number;
  nation: string; club?: string; icon?: boolean;
}): Player {
  const nation = NATIONS.find((n) => n.name === attrs.nation);
  return {
    id,
    name: attrs.name,
    position: attrs.position,
    rating: attrs.rating,
    nation: attrs.nation,
    nationEmoji: nation?.emoji ?? "🏳️",
    club: attrs.club,
    isIcon: attrs.icon,
  };
}

/** Current-ish players (approximate, for seeding only). */
const CURRENT: Player[] = [
  // GK
  player("cur-gk-1", { name: "Alisson", position: "GK", rating: 88, nation: "Brazil", club: "Liverpool" }),
  player("cur-gk-2", { name: "Raya", position: "GK", rating: 84, nation: "Spain", club: "Arsenal" }),
  player("cur-gk-3", { name: "Onana", position: "GK", rating: 82, nation: "Cameroon", club: "Man Utd" }),
  player("cur-gk-4", { name: "Pickford", position: "GK", rating: 82, nation: "England", club: "Everton" }),
  player("cur-gk-5", { name: "Maignan", position: "GK", rating: 85, nation: "France", club: "Milan" }),
  player("cur-gk-6", { name: "Sommer", position: "GK", rating: 84, nation: "Switzerland", club: "Inter" }),
  player("cur-gk-7", { name: "Lloris", position: "GK", rating: 80, nation: "France", club: "Spurs" }),
  player("cur-gk-8", { name: "Ramsdale", position: "GK", rating: 78, nation: "England", club: "Arsenal" }),
  // DEF
  player("cur-d-1", { name: "Van Dijk", position: "DEF", rating: 91, nation: "Netherlands", club: "Liverpool" }),
  player("cur-d-2", { name: "Ruben Dias", position: "DEF", rating: 88, nation: "Portugal", club: "Man City" }),
  player("cur-d-3", { name: "Saliba", position: "DEF", rating: 87, nation: "France", club: "Arsenal" }),
  player("cur-d-4", { name: "Rudiger", position: "DEF", rating: 86, nation: "Germany", club: "Real Madrid" }),
  player("cur-d-5", { name: "Martinez", position: "DEF", rating: 85, nation: "Argentina", club: "Aston Villa" }),
  player("cur-d-6", { name: "Gvardiol", position: "DEF", rating: 85, nation: "Croatia", club: "Man City" }),
  player("cur-d-7", { name: "Hakimi", position: "DEF", rating: 86, nation: "Morocco", club: "PSG" }),
  player("cur-d-8", { name: "Robertson", position: "DEF", rating: 86, nation: "Scotland", club: "Liverpool" }),
  player("cur-d-9", { name: "James", position: "DEF", rating: 84, nation: "England", club: "Chelsea" }),
  player("cur-d-10", { name: "Kimpembe", position: "DEF", rating: 82, nation: "France", club: "PSG" }),
  player("cur-d-11", { name: "Stones", position: "DEF", rating: 83, nation: "England", club: "Man City" }),
  player("cur-d-12", { name: "Konate", position: "DEF", rating: 83, nation: "France", club: "Liverpool" }),
  player("cur-d-13", { name: "Pau Torres", position: "DEF", rating: 82, nation: "Spain", club: "Aston Villa" }),
  player("cur-d-14", { name: "Porro", position: "DEF", rating: 82, nation: "Spain", club: "Spurs" }),
  player("cur-d-15", { name: "Malen", position: "DEF", rating: 80, nation: "Netherlands", club: "Dortmund" }),
  player("cur-d-16", { name: "Tavares", position: "DEF", rating: 81, nation: "Portugal", club: "Benfica" }),
  player("cur-d-17", { name: "Kounde", position: "DEF", rating: 85, nation: "France", club: "Barcelona" }),
  player("cur-d-18", { name: "Ake", position: "DEF", rating: 82, nation: "Netherlands", club: "Man City" }),
  // MID
  player("cur-m-1", { name: "Rodri", position: "MID", rating: 92, nation: "Spain", club: "Man City" }),
  player("cur-m-2", { name: "Bellingham", position: "MID", rating: 90, nation: "England", club: "Real Madrid" }),
  player("cur-m-3", { name: "De Bruyne", position: "MID", rating: 89, nation: "Belgium", club: "Man City" }),
  player("cur-m-4", { name: "Federico Valverde", position: "MID", rating: 88, nation: "Uruguay", club: "Real Madrid" }),
  player("cur-m-5", { name: "Rice", position: "MID", rating: 87, nation: "England", club: "Arsenal" }),
  player("cur-m-6", { name: "Bruno Fernandes", position: "MID", rating: 87, nation: "Portugal", club: "Man Utd" }),
  player("cur-m-7", { name: "Odegaard", position: "MID", rating: 86, nation: "Norway", club: "Arsenal" }),
  player("cur-m-8", { name: "Musiala", position: "MID", rating: 86, nation: "Germany", club: "Bayern" }),
  player("cur-m-9", { name: "Pedri", position: "MID", rating: 85, nation: "Spain", club: "Barcelona" }),
  player("cur-m-10", { name: "Foden", position: "MID", rating: 85, nation: "England", club: "Man City" }),
  player("cur-m-11", { name: "Zielinski", position: "MID", rating: 82, nation: "Poland", club: "Inter" }),
  player("cur-m-12", { name: "Douglas Luiz", position: "MID", rating: 82, nation: "Brazil", club: "Juventus" }),
  player("cur-m-13", { name: "Ngonge", position: "MID", rating: 81, nation: "DR Congo", club: "Napoli" }),
  player("cur-m-14", { name: "McTominay", position: "MID", rating: 80, nation: "Scotland", club: "Napoli" }),
  player("cur-m-15", { name: "Gallagher", position: "MID", rating: 80, nation: "England", club: "Atletico" }),
  player("cur-m-16", { name: "Ugarte", position: "MID", rating: 83, nation: "Uruguay", club: "PSG" }),
  player("cur-m-17", { name: "Szoboszlai", position: "MID", rating: 83, nation: "Hungary", club: "Liverpool" }),
  player("cur-m-18", { name: "Mac Allister", position: "MID", rating: 84, nation: "Argentina", club: "Liverpool" }),
  // FWD
  player("cur-f-1", { name: "Haaland", position: "FWD", rating: 93, nation: "Norway", club: "Man City" }),
  player("cur-f-2", { name: "Mbappe", position: "FWD", rating: 92, nation: "France", club: "Real Madrid" }),
  player("cur-f-3", { name: "Vinicius Jr", position: "FWD", rating: 91, nation: "Brazil", club: "Real Madrid" }),
  player("cur-f-4", { name: "Salah", position: "FWD", rating: 90, nation: "Egypt", club: "Liverpool" }),
  player("cur-f-5", { name: "Kane", position: "FWD", rating: 89, nation: "England", club: "Bayern" }),
  player("cur-f-6", { name: "Griezmann", position: "FWD", rating: 87, nation: "France", club: "Atletico" }),
  player("cur-f-7", { name: "Saka", position: "FWD", rating: 87, nation: "England", club: "Arsenal" }),
  player("cur-f-8", { name: "Foden-w", position: "FWD", rating: 85, nation: "England", club: "Man City" }),
  player("cur-f-9", { name: "Rashford", position: "FWD", rating: 82, nation: "England", club: "Man Utd" }),
  player("cur-f-10", { name: "Isak", position: "FWD", rating: 86, nation: "Sweden", club: "Newcastle" }),
  player("cur-f-11", { name: "Leao", position: "FWD", rating: 85, nation: "Portugal", club: "Milan" }),
  player("cur-f-12", { name: "Diaz", position: "FWD", rating: 84, nation: "Colombia", club: "Liverpool" }),
  player("cur-f-13", { name: "Gakpo", position: "FWD", rating: 83, nation: "Netherlands", club: "Liverpool" }),
  player("cur-f-14", { name: "Osimhen", position: "FWD", rating: 86, nation: "Nigeria", club: "Galatasaray" }),
  player("cur-f-15", { name: "Zirkzee", position: "FWD", rating: 81, nation: "Netherlands", club: "Man Utd" }),
  player("cur-f-16", { name: "Alvarez", position: "FWD", rating: 84, nation: "Argentina", club: "Atletico" }),
];

/** All-time icons (seeded; admins curate via Wikidata import later). */
const ICONS: Player[] = [
  player("ico-gk-1", { name: "Lev Yashin", position: "GK", rating: 95, nation: "Soviet Union", icon: true }),
  player("ico-gk-2", { name: "Gianluigi Buffon", position: "GK", rating: 93, nation: "Italy", icon: true }),
  player("ico-d-1", { name: "Franz Beckenbauer", position: "DEF", rating: 96, nation: "Germany", icon: true }),
  player("ico-d-2", { name: "Paolo Maldini", position: "DEF", rating: 95, nation: "Italy", icon: true }),
  player("ico-d-3", { name: "Franco Baresi", position: "DEF", rating: 93, nation: "Italy", icon: true }),
  player("ico-d-4", { name: "Cafu", position: "DEF", rating: 91, nation: "Brazil", icon: true }),
  player("ico-d-5", { name: "Roberto Carlos", position: "DEF", rating: 92, nation: "Brazil", icon: true }),
  player("ico-m-1", { name: "Pele", position: "FWD", rating: 99, nation: "Brazil", icon: true }),
  player("ico-m-2", { name: "Diego Maradona", position: "MID", rating: 98, nation: "Argentina", icon: true }),
  player("ico-m-3", { name: "Johan Cruyff", position: "MID", rating: 97, nation: "Netherlands", icon: true }),
  player("ico-m-4", { name: "Zinedine Zidane", position: "MID", rating: 96, nation: "France", icon: true }),
  player("ico-m-5", { name: "Pavel Nedved", position: "MID", rating: 90, nation: "Czech Republic", icon: true }),
  player("ico-m-6", { name: "Ronaldinho", position: "MID", rating: 95, nation: "Brazil", icon: true }),
  player("ico-m-7", { name: "Xavi", position: "MID", rating: 94, nation: "Spain", icon: true }),
  player("ico-m-8", { name: "Iniesta", position: "MID", rating: 94, nation: "Spain", icon: true }),
  player("ico-f-1", { name: "Lionel Messi", position: "FWD", rating: 99, nation: "Argentina", icon: true }),
  player("ico-f-2", { name: "Cristiano Ronaldo", position: "FWD", rating: 99, nation: "Portugal", icon: true }),
  player("ico-f-3", { name: "Ronaldo Nazario", position: "FWD", rating: 97, nation: "Brazil", icon: true }),
  player("ico-f-4", { name: "Thierry Henry", position: "FWD", rating: 94, nation: "France", icon: true }),
  player("ico-f-5", { name: "Didier Drogba", position: "FWD", rating: 91, nation: "Ivory Coast", icon: true }),
  player("ico-f-6", { name: "George Best", position: "FWD", rating: 93, nation: "Northern Ireland", icon: true }),
  player("ico-f-7", { name: "Alfredo Di Stefano", position: "FWD", rating: 96, nation: "Argentina", icon: true }),
  player("ico-f-8", { name: "Ferenc Puskas", position: "FWD", rating: 95, nation: "Hungary", icon: true }),
];

export const SEED_PLAYERS: Player[] = [...CURRENT, ...ICONS];

export const SEED_PLAYER_MAP = new Map(SEED_PLAYERS.map((p) => [p.id, p]));

export function seedPlayersByPosition(position: "GK" | "DEF" | "MID" | "FWD"): Player[] {
  return SEED_PLAYERS.filter((p) => p.position === position);
}
