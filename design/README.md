# Design

Product and technical design for the Avtoskop MVP. The live versions are the Claude documents linked below; the files here are snapshots taken on 27 Sep 2026.

| File                                           | What it is                                                          | Live version                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [product-definition.md](product-definition.md) | Who it is for, features, scope, risks, goals                        | [Claude doc](https://claude.ai/code/artifact/7d03443d-46a6-410e-8659-2ec5e6d5d516) |
| [technical-plan.md](technical-plan.md)         | Stack, architecture, data model, rating and price logic, milestones | [Claude doc](https://claude.ai/code/artifact/09adafc7-7062-4938-a252-374c0694dfa3) |
| [milestone-0.md](milestone-0.md)               | Checks before code: auto.ria API, government data, NHTSA            | —                                                                                  |
| [wireframes/](wireframes/)                     | Desktop and mobile screens                                          | [Design canvas](https://claude.ai/artifact/FkHWEPA33LD1CCP72PFFNu)                 |

## Wireframes

The `.dc.html` files are the source of the design canvas. They need the canvas runtime to render, so open the canvas link to view them. `canvas.json` holds the layout.

| File                    | Screen                        |
| ----------------------- | ----------------------------- |
| `Main.dc.html`          | 1 · Choose type, brand, model |
| `Results.dc.html`       | 2 · Results list              |
| `Car.dc.html`           | 3 · Car page                  |
| `Checkout.dc.html`      | 4 · Request free report       |
| `Report.dc.html`        | 5 · History report            |
| `ResultsMobile.dc.html` | 2m · Results list, mobile     |
| `FiltersMobile.dc.html` | 2m · Filters, mobile          |
| `CarMobile.dc.html`     | 3m · Car page, mobile         |
