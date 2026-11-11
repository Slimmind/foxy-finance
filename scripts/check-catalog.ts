/**
 * Cross-checks every fund in the catalog against OpenFIGI (free, no key).
 * It never edits the catalog: a person decides what to change.
 *
 *   npm run check:catalog
 *
 * Exit code: 0 = no errors, 1 = errors found, 2 = could not reach / rate-limited by OpenFIGI.
 */
import { FUNDS, type Fund } from '../src/data/catalog';
import { evaluateFund, type Finding } from '../src/lib/catalogCheck';

const URL = 'https://api.openfigi.com/v3/mapping';
const BATCH = 10; // OpenFIGI accepts up to 10 jobs per request without a key
const PAUSE_MS = 2500; // and about 25 requests per minute

interface FigiRow {
  name: string;
}
interface FigiAnswer {
  data?: FigiRow[];
  warning?: string;
  error?: string;
}

class RateLimited extends Error {}

async function lookup(funds: Fund[]): Promise<FigiAnswer[]> {
  // US funds are identified by ticker on the US exchange, UCITS funds by ISIN (their tickers differ per venue).
  const jobs = funds.map((f) =>
    f.market === 'us' ? { idType: 'TICKER', idValue: f.ticker, exchCode: 'US' } : { idType: 'ID_ISIN', idValue: f.isin ?? '' },
  );
  const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(jobs) });
  if (res.status === 429) throw new RateLimited('OpenFIGI: лимит запросов, повтори через минуту');
  if (!res.ok) throw new Error(`OpenFIGI ответил ${res.status}`);
  return (await res.json()) as FigiAnswer[];
}

const chunk = <T,>(a: T[], n: number): T[][] => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<number> {
  const results = new Map<string, Finding[]>();
  const batches = chunk(FUNDS, BATCH);

  for (const [i, part] of batches.entries()) {
    const answers = await lookup(part);
    part.forEach((fund, k) => {
      const names = [...new Set((answers[k]?.data ?? []).map((d) => d.name))];
      results.set(fund.id, evaluateFund(fund, names.length ? names : null));
    });
    if (i < batches.length - 1) await sleep(PAUSE_MS);
  }

  let errors = 0;
  let factsUnchecked = 0;
  let otherWarnings = 0;
  for (const fund of FUNDS) {
    const findings = results.get(fund.id) ?? [];
    for (const f of findings) {
      if (f.level === 'error') {
        errors++;
        console.log(`ОШИБКА  ${fund.id.padEnd(12)} ${f.text}`);
      } else if (f.text.startsWith('комиссия и состав не сверены')) factsUnchecked++;
      else {
        otherWarnings++;
        console.log(`внимание ${fund.id.padEnd(11)} ${f.text}`);
      }
    }
  }

  console.log(`\nПроверено фондов: ${FUNDS.length}. Ошибок: ${errors}. Прочих предупреждений: ${otherWarnings}.`);
  if (factsUnchecked) {
    console.log(`Комиссия и состав не сверены с документами эмитента у ${factsUnchecked} фондов: проверь вручную и впиши factsChecked.`);
  }
  if (errors === 0) console.log('Идентификаторы в порядке: если сверка свежая, обнови IDS_CHECKED в src/data/catalog.ts.');
  return errors ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(2);
  },
);
