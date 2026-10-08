import { createServer, type IncomingMessage } from 'node:http';
import { BOT_USERNAME, TELEGRAM_PORT } from './env.ts';

// A stand-in for the Telegram Bot API. It records every message the site and the bot send,
// and hands the bot updates that tests push in (a /start, a shared contact).

export interface SentMessage {
  chatId: number;
  text: string;
  photo: boolean;
  at: number;
}

const sent: SentMessage[] = [];
const updates: Array<{ update_id: number; message: unknown }> = [];
let nextUpdate = 1;
let nextMessage = 1;

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

// sendPhoto arrives as multipart form data; only the chat and caption matter here.
function multipartField(body: Buffer, contentType: string, name: string): string | null {
  const boundary = /boundary=(.+)$/.exec(contentType)?.[1];
  if (!boundary) return null;
  for (const part of body.toString('latin1').split(`--${boundary}`)) {
    if (part.includes(`name="${name}"`)) {
      const value = part.split('\r\n\r\n')[1] ?? '';
      return Buffer.from(value.replace(/\r\n$/, ''), 'latin1').toString('utf8');
    }
  }
  return null;
}

export function startFakeTelegram(port = TELEGRAM_PORT) {
  const server = createServer(async (req, res) => {
    const reply = (result: unknown, status = 200) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(result));
    };
    const url = req.url ?? '';
    const body = await readBody(req);

    // Test controls.
    if (url === '/__messages') return reply(sent);
    if (url === '/__reset') {
      sent.length = 0;
      updates.length = 0;
      return reply({ ok: true });
    }
    if (url === '/__updates' && req.method === 'POST') {
      updates.push({ update_id: nextUpdate++, message: JSON.parse(body.toString('utf8')) });
      return reply({ ok: true });
    }

    // Stand-in VIN decoder: Skoda for TMB…, Volkswagen for WVW…, nothing otherwise.
    const vin = /^\/api\/vehicles\/DecodeVinValues\/(\w+)/.exec(url)?.[1];
    if (vin) {
      const known: Record<string, [string, string]> = {
        TMB: ['SKODA', 'Octavia'],
        WVW: ['VOLKSWAGEN', 'Golf'],
      };
      const hit = known[vin.slice(0, 3)];
      const year = 2000 + Number(vin[9] === 'K' ? 19 : vin[9] === 'L' ? 20 : 21);
      return reply({
        Results: [
          { Make: hit?.[0] ?? '', Model: hit?.[1] ?? '', ModelYear: hit ? String(year) : '' },
        ],
      });
    }

    // Bot API: /bot<token>/<method>
    const method = /^\/bot[^/]+\/(\w+)/.exec(url)?.[1];
    const type = req.headers['content-type'] ?? '';
    const json =
      type.includes('application/json') && body.length ? JSON.parse(body.toString('utf8')) : {};
    switch (method) {
      case 'getMe':
        return reply({
          ok: true,
          result: { id: 1, is_bot: true, first_name: 'Avtoskop', username: BOT_USERNAME },
        });
      case 'setMyCommands':
        return reply({ ok: true, result: true });
      case 'getUpdates': {
        const offset = Number(json.offset ?? 0);
        // Short long-poll so the bot reacts quickly in tests.
        for (let i = 0; i < 10; i++) {
          const ready = updates.filter((u) => u.update_id >= offset);
          if (ready.length > 0) return reply({ ok: true, result: ready });
          await new Promise((r) => setTimeout(r, 100));
        }
        return reply({ ok: true, result: [] });
      }
      case 'sendMessage':
        sent.push({
          chatId: Number(json.chat_id),
          text: String(json.text ?? ''),
          photo: false,
          at: Date.now(),
        });
        return reply({ ok: true, result: { message_id: nextMessage++ } });
      case 'sendPhoto':
        sent.push({
          chatId: Number(multipartField(body, type, 'chat_id')),
          text: multipartField(body, type, 'caption') ?? '',
          photo: true,
          at: Date.now(),
        });
        return reply({ ok: true, result: { message_id: nextMessage++ } });
      default:
        return reply({ ok: false, description: `Unknown method ${method}` }, 404);
    }
  });
  server.listen(port);
  return server;
}

// Run on its own: `node src/fake-telegram.ts`
if (import.meta.url === `file://${process.argv[1]}`) {
  startFakeTelegram();
  console.log(`Fake Telegram on :${TELEGRAM_PORT}`);
}
