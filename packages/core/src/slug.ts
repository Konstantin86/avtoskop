// Official Ukrainian transliteration (Cabinet of Ministers resolution 55, 2010).
const LETTERS: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'h',
  ґ: 'g',
  д: 'd',
  е: 'e',
  є: 'ie',
  ж: 'zh',
  з: 'z',
  и: 'y',
  і: 'i',
  ї: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ь: '',
  ю: 'iu',
  я: 'ia',
  ы: 'y',
  э: 'e',
  ъ: '',
  ё: 'io',
  "'": '',
  ʼ: '',
  '’': '',
};

const WORD_START: Record<string, string> = { є: 'ye', ї: 'yi', й: 'y', ю: 'yu', я: 'ya' };

export function transliterateUk(text: string): string {
  let out = '';
  let atWordStart = true;
  for (const ch of text.toLowerCase()) {
    const mapped = (atWordStart ? WORD_START[ch] : undefined) ?? LETTERS[ch] ?? ch;
    out += mapped;
    atWordStart = !/[\p{L}'ʼ’]/u.test(ch);
  }
  return out;
}

export function slugify(text: string): string {
  return transliterateUk(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
