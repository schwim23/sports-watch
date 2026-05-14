// MLB publishes per-team SVG cap logos at a stable static CDN. We default to
// these so the app works without any extra seeding; a `Team.logoUrl` override
// from the DB always wins. Stick with the "cap-on-light" variant which has a
// transparent background and renders well on cream/white surfaces.
export function mlbCapLogoUrl(externalId: string): string {
  return `https://www.mlbstatic.com/team-logos/team-cap-on-light/${externalId}.svg`;
}

export function teamLogoUrl(team: { externalId: string; logoUrl?: string | null }): string {
  return team.logoUrl ?? mlbCapLogoUrl(team.externalId);
}
