import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createDb, sourceRequests } from '@avtoskop/db';
import { createAutoriaClient } from './autoria/client.ts';
import { createCollector, DIMENSIONS, type Dimension } from './autoria/collector.ts';
import { trackedModels } from './autoria/tracked-models.ts';
import { addDemoRequests, clearDemoRequests } from './demo-requests.ts';

const USAGE = `Usage: pnpm autoria <command> [options]

Commands:
  partition [--model 715] [--dims year,price,mileage,fuel,gearbox,region]
  recent    [--model 715]          listings added or updated today
  details   --id <auto.ria id>     full details for one listing
  status    [--model 715]          coverage and quota use
  brands                           import all auto.ria brands (1 request, cached 30 days)
  demo-requests [--clear]          add (or remove) sample buyer requests for local development`;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set in .env`);
  return value;
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    model: { type: 'string' },
    dims: { type: 'string' },
    id: { type: 'string' },
    clear: { type: 'boolean' },
  },
});

const command = positionals[0];
const log = (m: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const { db, close } = createDb(env('DATABASE_URL'));
const client = createAutoriaClient({
  apiKey: env('AUTO_RIA_API_KEY'),
  cacheDir: fileURLToPath(new URL('../../../data/raw/autoria', import.meta.url)),
  maxRequestsPerHour: Number(process.env['AUTORIA_MAX_PER_HOUR'] ?? 30),
  log,
  onRequest: async (e) => {
    await db.insert(sourceRequests).values({
      source: 'autoria',
      endpoint: e.endpoint,
      params: e.params,
      status: e.status,
      fromCache: e.fromCache,
    });
  },
});
const collector = createCollector(client, db, log);

const selected = values.model
  ? trackedModels.filter((m) => String(m.modelAutoriaId) === values.model)
  : trackedModels;

try {
  if (command === 'partition') {
    const dims = (values.dims?.split(',') ?? [...DIMENSIONS]) as Dimension[];
    const unknown = dims.filter((d) => !DIMENSIONS.includes(d));
    if (unknown.length > 0) throw new Error(`Unknown dimensions: ${unknown.join(', ')}`);
    for (const m of selected) {
      log(`${m.brand} ${m.model}: partition by ${dims.join(', ')}`);
      await collector.partition(m, dims);
    }
  } else if (command === 'recent') {
    for (const m of selected) {
      log(
        `${m.brand} ${m.model}: ${(await collector.recent(m)).length} listings added or updated today`,
      );
    }
  } else if (command === 'details') {
    if (!values.id) throw new Error('--id is required');
    await collector.details(values.id);
    log(`Details saved for ${values.id}`);
  } else if (command === 'demo-requests') {
    if (values.clear) log(`Removed ${await clearDemoRequests(db)} demo requests`);
    else log(`Added ${await addDemoRequests(db)} demo requests`);
  } else if (command === 'brands') {
    log(`Imported ${await collector.importBrands()} brands`);
  } else if (command === 'status') {
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    log(
      `auto.ria requests: ${await client.requestsSince(hourAgo)} in the last hour, ${await client.requestsSince(monthStart)} this month`,
    );
    for (const m of selected) console.log(`${m.brand} ${m.model}:`, await collector.summary(m));
  } else {
    console.log(USAGE);
  }
} finally {
  await close();
}
