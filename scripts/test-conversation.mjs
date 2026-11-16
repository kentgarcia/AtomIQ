import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bubblesFor, splitSentences } from "../components/lesson/conversation-core.ts";

describe("conversation bubbles", () => {
  it("splits on sentence ends", () => {
    assert.deepEqual(splitSentences("One. Two! Three?"), ["One.", "Two!", "Three?"]);
  });
  it("never splits inside a glossary marker or a number", () => {
    assert.deepEqual(splitSentences("The [[proton|protons. odd]] are positive. About 1.5 cm."), ["The [[proton|protons. odd]] are positive.", "About 1.5 cm."]);
  });
  it("keeps closing quotes with their sentence", () => {
    assert.deepEqual(splitSentences('He said "stop." Then left.'), ['He said "stop."', "Then left."]);
  });
  it("gives text with no ending punctuation as one sentence", () => {
    assert.deepEqual(splitSentences("Just a label"), ["Just a label"]);
    assert.deepEqual(splitSentences(""), []);
  });
  it("uses one bubble per sentence up to the maximum", () => {
    assert.equal(bubblesFor("A. B. C.", 3).length, 3);
    assert.equal(bubblesFor("A. B.", 3).length, 2);
  });
  it("groups extra sentences in order, evenly", () => {
    assert.deepEqual(bubblesFor("A. B. C. D. E.", 3), ["A. B.", "C. D.", "E."]);
    assert.deepEqual(bubblesFor("A. B. C. D. E. F. G.", 3), ["A. B. C.", "D. E.", "F. G."]);
  });
});
