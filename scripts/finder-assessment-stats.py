"""Read the archived, hash-verified assessment cohort; emit only area aggregates."""
import argparse
import collections
import csv
import gzip
import hashlib
import io
import json
import math
from pathlib import Path
import re
import statistics

parser = argparse.ArgumentParser()
parser.add_argument('--source-root', required=True)
args = parser.parse_args()
root = Path(args.source_root)
city = json.loads((root / 'community-assessment-stats-citywide-metadata.json').read_text())
quadrants = json.loads((root / 'quadrant-assessment-metadata.json').read_text())
assert city['source']['sourceRowsUpdatedAt'] == quadrants['source']['sourceRowsUpdatedAt']
assert city['audit']['sourceChangedDuringDownload'] is False
assert quadrants['audit']['sourceChangedDuringDownload'] is False

def rows_from(receipt):
    for page in receipt['pages']:
        raw = gzip.decompress((root / page['archivePath']).read_bytes())
        assert hashlib.sha256(raw).hexdigest() == page['sha256OfUncompressedCsv'], page['archivePath']
        rows = list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))
        assert len(rows) == page['rowCount']
        yield from rows

accounts = {}
source_rows = {}
for row in rows_from(city):
    roll = row['roll_number']
    value = float(row['assessed_value'])
    assert math.isfinite(value) and value > 0
    assert row['roll_year'] == '2026' and row['property_type'] == 'LI' and row['sub_property_use'].startswith('R')
    assert row['source_row_id'] not in source_rows
    source_rows[row['source_row_id']] = roll
    account = accounts.setdefault(roll, {'code': row['comm_code'], 'value': value, 'years': set(), 'quadrants': set()})
    assert account['code'] == row['comm_code'] and account['value'] == value
    try:
        year = float(row['year_of_construction'])
        if year.is_integer() and 1801 <= year <= 2026:
            account['years'].add(int(year))
    except (ValueError, TypeError):
        pass
assert len(accounts) == city['audit']['includedAccountCount']
assert len(source_rows) == city['audit']['sourceRowCount']

seen = set()
for row in rows_from(quadrants):
    sid = row['source_row_id']
    assert sid not in seen and source_rows.get(sid) == row['roll_number']
    seen.add(sid)
    match = re.search(r'(?:^|\s)(NE|NW|SE|SW)$', ' '.join(row['address'].upper().split()))
    if match:
        accounts[row['roll_number']]['quadrants'].add(match.group(1))
assert len(seen) == len(source_rows)

def quantile(values, probability):
    index = (len(values) - 1) * probability
    low, high = math.floor(index), math.ceil(index)
    return round(values[low] + (values[high] - values[low]) * (index - low), 2)

groups = collections.defaultdict(list)
for account in accounts.values():
    groups[account['code']].append(account)
result = {}
for code, members in sorted(groups.items()):
    values = sorted(row['value'] for row in members)
    years = [next(iter(row['years'])) for row in members if len(row['years']) == 1]
    qs = collections.Counter(next(iter(row['quadrants'])) for row in members if len(row['quadrants']) == 1)
    result[code] = {
        'assessment': {'year': 2026, 'count': len(values), 'p25': quantile(values, .25), 'median': statistics.median(values), 'p75': quantile(values, .75), 'minimum': values[0], 'maximum': values[-1]},
        'construction': {'medianYear': statistics.median(years) if years else None, 'knownCount': len(years), 'accountCount': len(members)},
        'quadrantAccounts': dict(sorted(qs.items())),
    }
print(json.dumps({
    'communities': result,
    'metadata': {
        'sourceRows': len(source_rows),
        'accounts': len(accounts),
        'retrievedAt': city['completedAt'],
        'sourceRowsUpdatedAt': city['source']['sourceRowsUpdatedAt'],
        'quantile': 'Linear interpolation at (n - 1) p after sorting unique-account values; p=0.25 and 0.75. Median uses the central value or mean of the two central values.',
        'quadrants': 'Distinct assessment accounts grouped by their official address suffix; communities can contain accounts in several quadrants. Unrecognized or conflicting suffixes remain unassigned. No address rows are included in this derivative.',
        'receiptHashes': {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in ['community-assessment-stats-citywide-metadata.json', 'quadrant-assessment-metadata.json']},
        'archiveHashes': {page['archivePath']: page['sha256OfUncompressedCsv'] for receipt in [city, quadrants] for page in receipt['pages']},
    },
}, separators=(',', ':')))
