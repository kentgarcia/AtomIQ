/**
 * Turns a card's body into chat bubbles. Pure and framework-free (node --test).
 *
 * A teacher "says" a card in a few short bubbles instead of one block: the body is split into
 * sentences (never inside a [[term|shown]] glossary marker) and the sentences are grouped into at
 * most `max` bubbles, in order, as evenly as possible.
 */

/** Split text into sentences. A sentence ends at . ! or ? followed by a space, outside [[...]]. */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  let inTerm = false;
  for (let i = 0; i < text.length; i++) {
    if (text.startsWith("[[", i)) inTerm = true;
    else if (text.startsWith("]]", i)) inTerm = false;
    if (inTerm || !/[.!?]/.test(text[i])) continue;
    // Closing quotes and brackets stay with the sentence they end.
    let j = i + 1;
    while (j < text.length && /["'\u201D\u2019)]/.test(text[j])) j++;
    if (j < text.length && !/\s/.test(text[j])) continue;
    const piece = text.slice(start, j).trim();
    if (piece) out.push(piece);
    start = j;
    i = j - 1;
  }
  const rest = text.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

/** Group sentences into at most `max` bubbles, keeping order and balancing the sizes. */
export function bubblesFor(text: string, max = 3): string[] {
  const sentences = splitSentences(text);
  if (sentences.length <= max) return sentences;
  const bubbles: string[] = [];
  let index = 0;
  for (let b = 0; b < max; b++) {
    const take = Math.ceil((sentences.length - index) / (max - b));
    bubbles.push(sentences.slice(index, index + take).join(" "));
    index += take;
  }
  return bubbles;
}
