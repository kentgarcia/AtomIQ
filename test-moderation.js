// Quick test script to verify local profanity moderation.
// Run with: node test-moderation.js

const { Filter } = require("glin-profanity");

const filter = new Filter({
  languages: ["english"],
  detectLeetspeak: true,
  leetspeakLevel: "aggressive",
  normalizeUnicode: true,
  replaceWith: "***",
});

function testModeration() {
  const samples = [
    "This is a test comment about nuclear power",
    "you are sh1t",
    "this is f4ck dangerous",
  ];

  console.log("Testing glin-profanity moderation...\n");

  for (const text of samples) {
    const result = filter.checkProfanity(text);
    console.log("Input:", text);
    console.log("Contains profanity:", result.containsProfanity);
    console.log("Profane words:", result.profaneWords);
    console.log("Processed text:", result.processedText);
    console.log("---");
  }
}

testModeration();
