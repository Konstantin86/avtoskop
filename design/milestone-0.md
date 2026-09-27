# Milestone 0 — checks before code

Checked on 27 Sep 2026.

## Results

| Check               | Result                                                                                                                                                                                                                    | Impact                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| auto.ria API limits | Free: 1,000 requests/month, 30/hour. Paid: 20,000/month for 500 UAH, 100,000/month for 2,000 UAH, 500,000/month for 6,000 UAH                                                                                             | Free is only enough for a small test. See "auto.ria request budget"                                                   |
| auto.ria API shape  | Search returns listing IDs only, max 100 per request. Details (price, mileage, VIN, photos) need one request per listing. An average price endpoint exists                                                                | Cost grows with new listings, not with visitors                                                                       |
| auto.ria terms      | Must show a link to AUTO.RIA (indexable) wherever its data is used. The API key is personal and cannot be shared                                                                                                          | We link every listing to its auto.ria page; add a "Data: AUTO.RIA" credit                                             |
| MVS registrations   | Monthly ZIP/CSV per year, 2013–2026, CC BY licence. Full VIN included. Columns: owner type, operation code and name, date, office, brand, model, VIN, year, color, kind, purpose, body, fuel, engine size, power, weights | Registry history by VIN works. Operation codes also show first registration of imported cars, so we can detect origin |
| MVS stolen vehicles | National Police JSON (~36 MB), updated several times a day. Fields: brand, model, type, color, plate, body number (VIN), chassis number, engine number, date stolen, police unit                                          | Stolen check by VIN and plate works                                                                                   |
| NHTSA               | VIN decoder and recalls API work without a key. EU-market VINs decode poorly                                                                                                                                              | Use only for US imports                                                                                               |

## auto.ria request budget

One request lists 100 IDs. Each new listing needs one detail request. Rough monthly need:

| Models tracked           | Detail requests / month (estimate) | Plan         | Cost / month     |
| ------------------------ | ---------------------------------- | ------------ | ---------------- |
| 5–10 (local development) | 5,000–15,000                       | Standard     | 500 UAH (~$12)   |
| 50 (launch)              | 50,000–100,000                     | Professional | 2,000 UAH (~$48) |

The estimates depend on how many listings each model has; measure it with the free plan first. At launch this raises the monthly total from about $25–40 to about $60–85.

Ways to reduce it:

- Re-fetch details only for new listings, and for listings someone opens.
- Use the average price endpoint where it is enough.
- Start with fewer, popular models.
- Ask RIA about a partner or startup price.

## Decision: auto.ria plan by stage

Decided 27 Sep 2026.

| Stage                     | Plan                        | Cost / month     | How we work                                                                                                                                                                                      |
| ------------------------- | --------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Development               | Free (1,000/month, 30/hour) | $0               | 2–3 test models (e.g. Toyota RAV4, Skoda Octavia, VW Passat). The collector saves every raw response; development replays saved files. It stays under 30 requests/hour and backs off on HTTP 429 |
| A few weeks before launch | Standard, 20,000/month      | 500 UAH (~$12)   | Collector runs daily to start building the listing history                                                                                                                                       |
| Launch                    | Professional, 100,000/month | 2,000 UAH (~$48) | 50 models; accepted for the MVP                                                                                                                                                                  |

## Your actions

- [ ] Register at developers.ria.com and get a free API key (put it in `.env` as `AUTO_RIA_API_KEY`).
- [ ] Create an Anthropic account, add a card, set a monthly spend limit (for example $10 for local development).
- [x] Start Colima (`colima start`), then run `pnpm db:up`. Done: PostgreSQL 18.6 runs locally.
- [ ] Optional now: register avtoskop.com.ua. Hetzner can wait until launch.

## Sources

- [AUTO.RIA API limits](https://docs-developers.ria.com/en/main_rules/AUTO)
- [AUTO.RIA pricing](https://developers.ria.com/payment/)
- [AUTO.RIA search API](https://api-docs-v2.readthedocs.io/ru/latest/auto_ria/used_cars/search.html)
- [MVS registrations dataset](https://data.gov.ua/dataset/06779371-308f-42d7-895e-5a39833375f0)
- [Stolen vehicles dataset](https://data.gov.ua/dataset/2cd12755-834b-4c43-9026-fe356ce93af5)
- [NHTSA vPIC API](https://vpic.nhtsa.dot.gov/api/)
