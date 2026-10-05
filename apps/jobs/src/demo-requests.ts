import { inArray, like } from 'drizzle-orm';
import { brands, buyerRequests, type Db } from '@avtoskop/db';

// Sample buyer requests for local development. They carry no real phone and are marked
// with a "demo-" phone hash so they can be removed in one go.
const DEMO = [
  {
    brand: 'Toyota',
    model: 'RAV4',
    yearFrom: 2019,
    budgetUsd: 28000,
    fuels: ['hybrid'],
    gearbox: 'automatic',
    wishes: ['no_accidents', 'service_history'],
    importOk: true,
    region: 'kyiv',
    notes: 'Біла або сіра, бажано з повним приводом',
    hoursAgo: 2,
  },
  {
    brand: 'Volkswagen',
    model: 'Passat',
    yearFrom: 2017,
    yearTo: 2020,
    budgetUsd: 17500,
    fuels: ['diesel'],
    gearbox: 'automatic',
    wishes: ['one_owner'],
    importOk: true,
    region: 'lviv',
    notes: 'Універсал, пишіть 067 111 22 33',
    hoursAgo: 5,
  },
  {
    brand: 'Skoda',
    model: 'Octavia',
    yearFrom: 2018,
    budgetUsd: 14000,
    fuels: ['petrol'],
    gearbox: 'any',
    wishes: ['no_auction'],
    importOk: false,
    region: 'kyiv-city',
    notes: '',
    hoursAgo: 9,
  },
  {
    brand: 'Hyundai',
    model: 'Tucson',
    yearFrom: 2020,
    budgetUsd: 24000,
    fuels: [],
    gearbox: 'automatic',
    wishes: ['no_accidents'],
    importOk: true,
    region: 'dnipro',
    notes: 'Розгляну авто з Кореї',
    hoursAgo: 20,
  },
  {
    brand: 'Tesla',
    model: 'Model 3',
    yearFrom: 2021,
    budgetUsd: 26000,
    fuels: ['electric'],
    gearbox: 'any',
    wishes: ['no_accidents', 'awd'],
    importOk: true,
    region: 'all',
    notes: 'Long Range, батарея не менше 85%',
    hoursAgo: 30,
  },
  {
    brand: 'Kia',
    model: 'Sportage',
    yearFrom: 2019,
    yearTo: 2022,
    budgetUsd: 21000,
    fuels: ['petrol'],
    gearbox: 'automatic',
    wishes: ['service_history', 'one_owner'],
    importOk: false,
    region: 'odesa',
    notes: '',
    hoursAgo: 52,
  },
];

export async function addDemoRequests(db: Db): Promise<number> {
  await clearDemoRequests(db);
  const rows = await db
    .select({ id: brands.id, name: brands.name })
    .from(brands)
    .where(
      inArray(
        brands.name,
        DEMO.map((d) => d.brand),
      ),
    );
  const byName = new Map(rows.map((r) => [r.name, r.id]));
  const values = DEMO.flatMap((d, i) => {
    const brandId = byName.get(d.brand);
    if (!brandId) return [];
    return [
      {
        brandId,
        model: d.model,
        yearFrom: d.yearFrom,
        yearTo: d.yearTo ?? null,
        budgetUsd: d.budgetUsd,
        fuels: d.fuels,
        gearbox: d.gearbox,
        wishes: d.wishes,
        importOk: d.importOk,
        region: d.region,
        notes: d.notes,
        phoneEncrypted: 'demo',
        phoneHash: `demo-${i}`,
        phoneVerified: true,
        status: 'active',
        notifyVia: 'telegram',
        locale: 'uk',
        createdAt: new Date(Date.now() - d.hoursAgo * 3_600_000),
      },
    ];
  });
  if (values.length > 0) await db.insert(buyerRequests).values(values);
  return values.length;
}

export async function clearDemoRequests(db: Db): Promise<number> {
  const deleted = await db
    .delete(buyerRequests)
    .where(like(buyerRequests.phoneHash, 'demo-%'))
    .returning({ id: buyerRequests.id });
  return deleted.length;
}
