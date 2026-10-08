# Avtoskop end-to-end test plan

The checks to run before launch, grouped by workflow. Each check says who runs it:

- **Auto**: an automated browser test (Playwright) against a local copy of the site, with a stand-in Telegram server that records every message the site and the bot send.
- **Manual**: needs a real phone, real Telegram, or a person's judgement. Run it on the Pi or the launch server.

Every check lists what to do and what should happen. "Buyer" and "seller" mean two different Telegram accounts; for manual runs use your own account for one and a second account (a friend's phone, or a second Telegram account) for the other.

## 0. Setup

| # | Check | Expected | Who |
| --- | --- | --- | --- |
| 0.1 | Start from an empty database: migrations, then brands and models import | All migrations apply; brand and model pickers list them | Auto |
| 0.2 | `docker compose up` on the server from a clean checkout | Site, bot and migrations start; photos volume is created | Manual |
| 0.3 | Every setting in `deploy/.env` is filled | No `[SITE_OPERATOR]` or `[CONTACT_EMAIL]` placeholders on Terms and Privacy; feedback links work | Manual |

## 1. Buyer: posting a request

| # | Check | Expected | Who |
| --- | --- | --- | --- |
| 1.1 | Home page quick form: pick brand, model, year, budget, region, press "Отримати пропозиції" | Request form opens with those fields filled | Auto |
| 1.2 | Submit the request form empty | Every required field shows its error; the first one gets focus | Auto |
| 1.3 | Brand picker: type part of a name, use arrows and Enter, click again after choosing | Popular brands first; list reopens on the second click | Auto |
| 1.4 | Model field: before and after choosing a brand; type a model not on the list | Hint changes from the RAV4 example to "Оберіть модель"; unknown model is refused for brands with a list | Auto |
| 1.5 | Type letters into year, budget and mileage; paste "25 000 $" | Only digits stay | Auto |
| 1.6 | Choose "Нове" | Only importers and dealers stay ticked; year filled with this year; mileage hidden | Auto |
| 1.7 | Seller count line with 3+ matching sellers, and with fewer | Line shows the number; hidden below 3 | Auto |
| 1.8 | Publish a valid request | "Sent" page with the summary and the Telegram step | Auto |
| 1.9 | On the "sent" page, open the bot and share your number | Bot says the request is published and sends the private link and the AUTO.RIA link; "sent" page updates by itself | Manual |
| 1.10 | Share someone else's contact in the bot | Bot refuses and asks for your own | Manual |
| 1.11 | Publish a second request from the same Telegram account | Published at once, no number asked again | Auto |
| 1.12 | Publish a fourth request in one day | Bot says the daily limit is reached; request stays unpublished | Auto |
| 1.13 | Desktop: scan the QR code on the "sent" page with a phone | Bot opens in Telegram on the phone | Manual |

## 2. Buyer: managing a request

| # | Check | Expected | Who |
| --- | --- | --- | --- |
| 2.1 | Open the private link | Status line, active-until date, AUTO.RIA card, empty offers state | Auto |
| 2.2 | AUTO.RIA link | Opens AUTO.RIA search with the same brand, model, years, budget, region, fuel and gearbox | Auto |
| 2.3 | Edit request: change budget, years, region | Saved; "Запит оновлено"; car is locked; AUTO.RIA link changes; sellers with offers get one message | Auto |
| 2.4 | Edit four times in one day | Fourth edit refused with a message | Auto |
| 2.5 | Edit to allow import or a new region | Sellers who match only now get the alert within a minute; earlier sellers don't get it again | Auto |
| 2.6 | Extend near expiry | New date 30 days ahead | Auto |
| 2.7 | Close with each reason, and with none | Request leaves the board; sellers with offers get the message with that reason | Auto |
| 2.8 | Reopen | Active again for 30 days; reason cleared | Auto |
| 2.9 | Expiry job: request reaches its date | Buyer reminded 3 days before; closed on the day; buyer and sellers told | Auto |
| 2.10 | Notification settings: "Раз на день", quiet nights | Settings saved and shown in the summary line | Auto |

## 3. Buyer: offers

| # | Check | Expected | Who |
| --- | --- | --- | --- |
| 3.1 | First offer arrives | Telegram message with the main photo; header badge "1"; menu dot on phones | Auto |
| 3.2 | Open the request page | Badge clears after the page loads; seller gets "Покупець переглянув" once | Auto |
| 3.3 | Offer card content | Price, position among offers, facts, photos, price split, VIN checks, wishes met, seller with rating and badge | Auto |
| 3.4 | Photo gallery: open, swipe, arrows, close | Full-screen view works with mouse, keyboard (Esc) and touch | Manual |
| 3.5 | Sort by price, wishes, rating; star two offers; "Обрані" | Order changes; withdrawn and declined offers stay last; filter shows only starred | Auto |
| 3.6 | Compare | Table lists only open offers in the current order; scrolls sideways on a phone | Auto + Manual (phone) |
| 3.7 | Ask for VIN, photos, garage check | Seller gets a message per ask; asked chip shows; ask disappears once the seller adds the detail | Auto |
| 3.8 | Private note | Saved, shown as the note line, never visible to the seller | Auto |
| 3.9 | "Відкрити мій номер" | Confirmation dialog; seller gets the number in Telegram; card says the number was shared | Auto |
| 3.10 | "Не цікаво", then restore | Card fades, then comes back | Auto |
| 3.11 | Report an offer | Offer declined; seller gets the complaint; complaint shows on the admin page | Auto |
| 3.12 | Seller edits: lower price, car arrives, first photos | "Оновлено" note with the changes; one Telegram message; no message for small edits or declined offers | Auto |
| 3.13 | Same during quiet hours, and in digest mode | Messages held; bot sends them combined at 8:00 or 9:00 Kyiv time | Auto |
| 3.14 | Seller withdraws an offer | Card faded with the reason; number can't be shared | Auto |
| 3.15 | Close with "Знайшов через Автоскоп" after sharing a number | Review form; review saved; rating shows next to the seller; seller told | Auto |
| 3.16 | Rating link | Seller page with profile, reviews and replies | Auto |
| 3.17 | Safety box link | Safe-buying page opens | Auto |

## 4. Seller: account and profile

| # | Check | Expected | Who |
| --- | --- | --- | --- |
| 4.1 | Sign in with Telegram on desktop and on a phone | Signed in; returns to the page they came from | Manual |
| 4.2 | Sign in again from a known Telegram account | No number asked; signed in at once | Auto |
| 4.3 | Create a profile for each seller type | Saved; welcome message from the bot; countries only for importers | Auto |
| 4.4 | Alert filters: budget from, year from; clear them | Saved; cleared fields remove the filter | Auto |
| 4.5 | Request the verified badge with a company code or a link | Request shown in the account; admins told; shown on the admin page | Auto |
| 4.6 | Admin verifies the seller | Badge on offers; daily limit rises to 50; seller gets the message | Auto |
| 4.7 | "Як вас бачать покупці" | Own seller page opens | Auto |

## 5. Seller: alerts and the board

| # | Check | Expected | Who |
| --- | --- | --- | --- |
| 5.1 | New request matching brand and region | Alert with request details and the offer link | Auto |
| 5.2 | Requests that should not reach the seller | No alert when brand, region, import, seller type, budget floor or year filter rule it out, or when the seller is the buyer | Auto |
| 5.3 | Alert for a car the seller offered on before | Extra "Відповісти як попередньою пропозицією" line; link opens a filled form | Auto |
| 5.4 | Board filters by brand, region, import | Cards match; count matches; page opens at the top | Auto |
| 5.5 | Request page | Details, "Оновлено" date after an edit, offer count, offer button | Auto |

## 6. Seller: offers

| # | Check | Expected | Who |
| --- | --- | --- | --- |
| 6.1 | Short form: car, year, price, availability only | Offer sent; buyer told | Auto |
| 6.2 | "В дорозі" without weeks | Error on the weeks field | Auto |
| 6.3 | Sourcing to order with a price range | Range shown to the buyer; no VIN field; order note on the card | Auto |
| 6.4 | Price split: parts under, equal to and above the price | Under and equal saved, with "інше" for the rest; above shows the error | Auto |
| 6.5 | VIN: wrong format, wrong make, matching | Format error; one-time confirmation for a mismatch; match shown to the buyer | Auto |
| 6.6 | Photos: pick, drag and drop, make main, remove, 11th photo, a non-image, a large phone photo | Uploads with progress; limit of 10; clear error for a non-image; GPS removed from stored files | Auto + Manual (iPhone, Android) |
| 6.7 | Photos over plain http (the Pi address) | Uploads work | Manual |
| 6.8 | Copy from a previous offer | Only offers for the same car are listed; photos are not copied | Auto |
| 6.9 | Sixth offer in a day as a new seller | Refused with the limit message | Auto |
| 6.10 | Offer on a request that allows only owners, as an importer | Refused with the "not allowed" message | Auto |
| 6.11 | Edit an offer | Warning about buyer notifications above the button; changes saved | Auto |
| 6.12 | Withdraw (sold, other), then put back | Status and reason shown; buyer sees it; put back restores it | Auto |
| 6.13 | Account lists | Statuses, closed requests with the reason, buyer asks, 30-day stats | Auto |
| 6.14 | Complaint reply | Reply saved; admins told; shown on the admin page | Auto |
| 6.15 | Review reply, then edit it | Shown on the seller page; phone numbers hidden | Auto |

## 7. Admin

| # | Check | Expected | Who |
| --- | --- | --- | --- |
| 7.1 | Open `/admin` as a non-admin and signed out | Refused | Auto |
| 7.2 | Verify, move back to review, ban a seller | Status changes; a banned seller's offers disappear for buyers and they can't send new ones | Auto |
| 7.3 | Resolve a complaint | Leaves the open list | Auto |
| 7.4 | VIN flags and statistics | Wanted or mismatched VINs listed; page view counts shown | Auto |

## 8. Security and privacy

| # | Check | Expected | Who |
| --- | --- | --- | --- |
| 8.1 | Private request link with a wrong key | "Not found"; nothing leaked | Auto |
| 8.2 | Act on another request's offer by changing the offer id in a form | Nothing happens | Auto |
| 8.3 | Edit, withdraw or reply as a different seller | Nothing happens | Auto |
| 8.4 | Buyer phone never in public pages, page source, board or seller pages | Not present until shared | Auto |
| 8.5 | Contacts in request notes, offer descriptions, review comments and replies | Phones, links and usernames masked | Auto |
| 8.6 | Private pages (`/my`, `/account`, `/s`, photos) | Marked noindex; photos only by long random name | Auto |
| 8.7 | Upload limits | Unsigned and banned users can't upload; 30 pending photos per seller | Auto |

## 9. Pages, languages, devices

| # | Check | Expected | Who |
| --- | --- | --- | --- |
| 9.1 | Every page in Ukrainian and English | No missing texts, no raw keys, no "—" in visible text | Auto |
| 9.2 | Light and dark theme on every page | Readable; illustrations follow the theme | Auto (screenshots) + Manual review |
| 9.3 | Phone layout: sticky button, menu, footer, forms | Nothing cut off; sticky button hides at the footer | Auto + Manual (real phones) |
| 9.4 | "How it works" animation; reduced-motion setting | Plays once; static with reduced motion | Manual |
| 9.5 | Link previews (Telegram, Facebook) for home, sellers and a request | Preview image and text | Manual |
| 9.6 | Unknown address | Friendly 404 page | Auto |
| 9.7 | Slow phone network (throttled) | Pages usable; progress bar shows | Manual |

## 10. Background jobs

| # | Check | Expected | Who |
| --- | --- | --- | --- |
| 10.1 | Wanted-cars import | Runs at start and daily; list date shown on offers | Auto |
| 10.2 | Photo cleanup | Unsent uploads removed after a day; photos of long-closed requests after 90 days | Auto |
| 10.3 | Bot restart during sending | No duplicate alerts or queued messages | Auto |

## How the automated part works

- Playwright drives a real browser against the site built in production mode, with a fresh test database for each run.
- A small stand-in for the Telegram API records every message, so bot and notification checks become plain assertions. The site and bot need one setting that points them at it (for example `TELEGRAM_API_URL`), defaulting to the real Telegram.
- Time-based checks (expiry, quiet hours, digest, cleanup) run the jobs directly with a fixed clock rather than waiting.
- Each run ends with screenshots of every page in both languages, both themes and two screen sizes, for a quick visual review.

## Manual run on real devices

Allow about two hours with two phones (one iPhone, one Android) and a laptop:

1. Buyer on phone A posts a request and confirms in Telegram (1.8–1.13).
2. Seller on phone B signs in, sets up a profile and gets the alert (4.1, 5.1).
3. Seller sends an offer with photos from the phone gallery (6.6).
4. Buyer gets it, browses photos, compares, asks for the VIN, shares the number (3.1–3.9).
5. Seller updates the offer, then the buyer closes the request with a review (3.12, 3.15).
6. Check link previews, dark mode, and the layout on both phones (9.2–9.5).
