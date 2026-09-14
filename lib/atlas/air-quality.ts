/** small parser for the eccc aq_obs xml feed.
 * reads direct children and checks the utc timestamp.
 * missing city readings stay missing; station readings aren't substitutes.
 * rejects dtd and entity declarations; no external entity lookups.
 */
export type AqhiRisk = 'Low' | 'Moderate' | 'High' | 'Very high';
export interface AqhiValue {
  aqhi: number;
  displayAqhi: number;
  displayLabel: string;
  riskCategory: AqhiRisk;
}
export interface CalgaryAqhiObservation {
  city: AqhiValue & { name: string; locationId: 'IAKID' };
  observationPeriod: { at: string; label: string };
  stations: (AqhiValue & { id: string; name: string; observedAt: string })[];
  unavailableStations: { id: string; name: string; observedAt: string }[];
}
interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}
function fail(message: string): never {
  throw new Error(`AQHI XML: ${message}`);
}
const NAME = /^[A-Za-z_][A-Za-z0-9_.:-]*/;
function decodeXml(text: string): string {
  if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\da-fA-F]+;)/.test(text)) {
    fail('unsupported or malformed entity');
  }
  return text.replace(/&([^;]+);/g, (_, entity: string) => {
    const basic: Record<string, string> = {
      amp: '&',
      lt: '<',
      gt: '>',
      quot: '"',
      apos: "'",
    };
    if (Object.hasOwn(basic, entity)) return basic[entity];
    const code = entity.startsWith('#x')
      ? parseInt(entity.slice(2), 16)
      : parseInt(entity.slice(1), 10);
    if (
      !Number.isInteger(code) ||
      code < 1 ||
      code > 0x10ffff ||
      (code >= 0xd800 && code <= 0xdfff)
    )
      fail('invalid character entity');
    return String.fromCodePoint(code);
  });
}
function parseXml(xml: string): XmlNode {
  if (xml.length > 1_000_000) fail('document too large');
  const container: XmlNode = {
    name: '#document',
    attrs: {},
    children: [],
    text: '',
  };
  const stack = [container];
  let pos = 0;
  while (pos < xml.length) {
    const current = stack[stack.length - 1];
    if (xml[pos] !== '<') {
      const next = xml.indexOf('<', pos);
      const end = next < 0 ? xml.length : next;
      current.text += decodeXml(xml.slice(pos, end));
      pos = end;
      continue;
    }
    if (xml.startsWith('<!--', pos)) {
      const end = xml.indexOf('-->', pos + 4);
      if (end < 0) fail('unterminated comment');
      pos = end + 3;
      continue;
    }
    if (xml.startsWith('<?', pos)) {
      const end = xml.indexOf('?>', pos + 2);
      if (end < 0) fail('unterminated processing instruction');
      pos = end + 2;
      continue;
    }
    if (xml.startsWith('<![CDATA[', pos)) {
      const end = xml.indexOf(']]>', pos + 9);
      if (end < 0) fail('unterminated CDATA');
      current.text += xml.slice(pos + 9, end);
      pos = end + 3;
      continue;
    }
    if (xml.startsWith('<!', pos))
      fail('DTD/entity declarations are unsupported');
    let end = pos + 1;
    let quote = '';
    for (; end < xml.length; end++) {
      const char = xml[end];
      if (quote) {
        if (char === quote) quote = '';
      } else if (char === '"' || char === "'") quote = char;
      else if (char === '>') break;
    }
    if (end === xml.length) fail('unterminated tag');
    let tag = xml.slice(pos + 1, end).trim();
    pos = end + 1;
    if (tag.startsWith('/')) {
      const name = tag.slice(1).trim();
      if (stack.length === 1 || current.name !== name)
        fail('mismatched closing tag');
      stack.pop();
      continue;
    }
    const selfClosing = tag.endsWith('/');
    if (selfClosing) tag = tag.slice(0, -1).trimEnd();
    const name = tag.match(NAME)?.[0];
    if (!name) fail('invalid tag name');
    const node: XmlNode = {
      name,
      attrs: Object.create(null),
      children: [],
      text: '',
    };
    let rest = tag.slice(name.length);
    while (rest.length) {
      if (!/^\s/.test(rest)) fail('invalid attribute separation');
      rest = rest.trimStart();
      if (!rest) break;
      const attr = rest.match(
        /^([A-Za-z_][A-Za-z0-9_.:-]*)\s*=\s*(["'])([\s\S]*?)\2/,
      );
      if (!attr || Object.hasOwn(node.attrs, attr[1]))
        fail('invalid or duplicate attribute');
      node.attrs[attr[1]] = decodeXml(attr[3]);
      rest = rest.slice(attr[0].length);
    }
    current.children.push(node);
    if (!selfClosing) {
      if (stack.length > 30) fail('document too deeply nested');
      stack.push(node);
    }
  }
  if (
    stack.length !== 1 ||
    container.children.length !== 1 ||
    container.text.trim()
  )
    fail('incomplete document');
  return container.children[0];
}
function child(
  parent: XmlNode,
  name: string,
  required = true,
): XmlNode | undefined {
  const matches = parent.children.filter((node) => node.name === name);
  if (matches.length > 1 || (required && matches.length !== 1))
    fail(`missing or duplicate ${name}`);
  return matches[0];
}
function scalar(node: XmlNode | undefined): string {
  if (!node || node.children.length) fail('missing or non-scalar value');
  return node.text.trim();
}
export function normalizeAqhi(aqhi: number): AqhiValue {
  if (!Number.isFinite(aqhi) || aqhi < 0) fail('invalid AQHI value');
  // round the display value to match the official risk bands (1–3 / 4–6 / 7–10 / 10+)
  const displayAqhi = Math.max(1, Math.round(aqhi));
  return {
    aqhi,
    displayAqhi,
    displayLabel: displayAqhi > 10 ? '10+' : String(displayAqhi),
    riskCategory:
      displayAqhi <= 3
        ? 'Low'
        : displayAqhi <= 6
          ? 'Moderate'
          : displayAqhi <= 10
            ? 'High'
            : 'Very high',
  };
}
function readValue(node: XmlNode): AqhiValue {
  const value = scalar(node);
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value))
    fail('missing or malformed AQHI value');
  return normalizeAqhi(Number(value));
}
export function parseUtcStamp(stamp: string): string {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(
    stamp.trim(),
  );
  if (!match) fail('UTCStamp must be YYYYMMDDhhmmss');
  const [, year, month, day, hour, minute, second] = match;
  const at = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
  const parsed = new Date(at);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 19) !== at.slice(0, 19)
  )
    fail('invalid UTCStamp calendar value');
  return at;
}
export function formatCalgaryObservation(at: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Edmonton',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(at));
}
export function parseCalgaryAqhi(xml: string): CalgaryAqhiObservation {
  const root = parseXml(xml.replace(/^\uFEFF/, ''));
  if (
    root.name !== 'conditionAirQuality' ||
    root.attrs.productHeader !== 'AQ_OBS'
  )
    fail('not an observation document');
  const region = child(root, 'region')!;
  if (scalar(region) !== 'IAKID') fail('not a Calgary observation');
  const stamp = child(root, 'dateStamp')!;
  if (stamp.attrs.name !== 'aqObserved') fail('not an observation timestamp');
  const at = parseUtcStamp(scalar(child(stamp, 'UTCStamp')));
  const city = {
    ...readValue(child(root, 'airQualityHealthIndex')!),
    name: region.attrs.nameEn || 'Calgary',
    locationId: 'IAKID' as const,
  };
  const stations: CalgaryAqhiObservation['stations'] = [];
  const unavailableStations: CalgaryAqhiObservation['unavailableStations'] = [];
  const seen = new Set<string>();
  const stationGroup = child(root, 'associatedStations', false);
  for (const station of stationGroup?.children ?? []) {
    if (station.name !== 'station') continue;
    const id = station.attrs.napsid;
    const name = station.attrs.nameEn;
    if (!id || !name || seen.has(id))
      fail('invalid or duplicate station identifier');
    seen.add(id);
    const identity = { id, name, observedAt: at };
    const value = child(station, 'airQualityHealthIndex', false);
    if (!value || (!value.children.length && !value.text.trim())) {
      unavailableStations.push(identity);
      continue;
    }
    stations.push({ ...identity, ...readValue(value) });
  }
  return {
    city,
    observationPeriod: { at, label: formatCalgaryObservation(at) },
    stations,
    unavailableStations,
  };
}
