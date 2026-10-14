// Content markup used in IATC sources:
//   **word**  → key vocabulary (bold)
//   {word}    → the grammar form (colour-coded)
//   [[word]]  → a slot the learner can personalise

export const stripMarkup = (s: string) => s.replace(/\*\*/g, '').replace(/\[\[|\]\]/g, '').replace(/[{}]/g, '');

export const wordCount = (s: string) => (s.trim().match(/[A-Za-z0-9'’-]+/g) ?? []).length;

export function splitSentences(text: string): string[] {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+(?=["“A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const normalise = (s: string) =>
  stripMarkup(s).toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
