import { communityLabel, CORE, type Community } from './data';

const quadrantNames: Record<string, string> = {
  ne: 'northeast',
  nw: 'northwest',
  se: 'southeast',
  sw: 'southwest',
};

const normalize = (value?: string | null) =>
  (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

export function searchCommunities(
  communities: readonly Community[],
  query: string,
): Community[] {
  const term = normalize(query);
  const direction = term
    .replace(/\b(calgary|quadrant)\b/g, '')
    .replace(/[\s-]/g, '');
  const quadrant = Object.keys(quadrantNames).find(
    (code) => direction === code || direction === quadrantNames[code],
  );
  const matches = communities.flatMap((community) => {
    const names = [communityLabel(community), community.name, community.label]
      .map(normalize)
      .filter(Boolean);
    const code = normalize(community.comm_code);
    const sector = normalize(community.sector);
    const exactQuadrant = quadrant && code === `q_${quadrant}`;
    const exactName = names.includes(term) || code === term;
    const nameMatch = names.some((name) => name.includes(term));
    const sectorMatch = quadrant
      ? sector.replace(/[\s-]/g, '') === quadrantNames[quadrant]
      : sector.includes(term);
    if (
      quadrant
        ? exactQuadrant || sectorMatch
        : !term || nameMatch || code.includes(term) || sectorMatch
    )
      return [
        {
          community,
          rank: quadrant
            ? exactQuadrant
              ? 0
              : 1
            : !term || exactName
              ? 0
              : nameMatch
                ? 1
                : 2,
        },
      ];
    return [];
  });
  return matches
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        Number(CORE.includes(b.community.comm_code)) -
          Number(CORE.includes(a.community.comm_code)) ||
        communityLabel(a.community).localeCompare(communityLabel(b.community)),
    )
    .slice(0, term ? 9 : 4)
    .map(({ community }) => community);
}
