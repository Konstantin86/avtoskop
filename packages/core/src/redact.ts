const PATTERNS = [
  /[\w.+-]+@[\w-]+(\.[\w-]+)+/g,
  /\b(?:https?:\/\/|www\.)\S+/gi,
  /\b[\w-]+(?:\.(?:com|ua|net|org|me|ru|io|info))+\b(?:\/\S*)?/gi,
  /(?:^|\s)@[\w.]{3,}/g,
  /\+?\(?\d(?:[\s\-().]*\d){8,}/g,
];

// Removes contact details buyers may type into public notes, so sellers can only
// reach them through Avtoskop.
export function redactContacts(text: string, mask = '•••'): string {
  let out = text;
  for (const pattern of PATTERNS) {
    out = out.replace(pattern, (match) => (match.startsWith(' ') ? ` ${mask}` : mask));
  }
  return out.replace(/\s{2,}/g, ' ').trim();
}
