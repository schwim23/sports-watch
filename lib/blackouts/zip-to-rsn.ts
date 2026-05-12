import blackouts from "@/data/blackouts.json";

type Rsn = {
  id: string;
  name: string;
  teams: string[];
  zip3: string[];
};

const RSNS: Rsn[] = (blackouts as { rsns: Rsn[] }).rsns;

const ZIP3_INDEX: Map<string, Rsn[]> = (() => {
  const m = new Map<string, Rsn[]>();
  for (const r of RSNS) {
    for (const z of r.zip3) {
      const existing = m.get(z);
      if (existing) existing.push(r);
      else m.set(z, [r]);
    }
  }
  return m;
})();

export function rsnsForZip(zip: string): Rsn[] {
  const z3 = zip.trim().slice(0, 3);
  if (!/^\d{3}$/.test(z3)) return [];
  return ZIP3_INDEX.get(z3) ?? [];
}

export function teamsInHomeMarket(zip: string): Set<string> {
  const teams = new Set<string>();
  for (const rsn of rsnsForZip(zip)) {
    for (const t of rsn.teams) teams.add(t);
  }
  return teams;
}

export function isTeamInUserMarket(teamAbbreviation: string, zip: string | null | undefined): boolean {
  if (!zip) return false;
  return teamsInHomeMarket(zip).has(teamAbbreviation);
}

export function rsnByTeam(teamAbbreviation: string): Rsn | undefined {
  return RSNS.find((r) => r.teams.includes(teamAbbreviation));
}

export function allRsns(): Rsn[] {
  return RSNS;
}
