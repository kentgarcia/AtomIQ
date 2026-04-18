const fs = require("fs");
const path = require("path");

const inputPath = path.join("DOCS", "myths-facts.md");
const outputPath = path.join("content", "myths", "myths-facts-pack.ts");

const raw = fs.readFileSync(inputPath, "utf8").replace(/\r/g, "");

const pairRegex = /^\s*(\d{1,2})\.\s*Myth:\s*(.+)\n\s*Fact:\s*(.+)$/gm;
const items = [];
let m;

while ((m = pairRegex.exec(raw)) !== null) {
  const index = Number(m[1]);
  if (index >= 1 && index <= 30) {
    items.push({
      index,
      myth: m[2].trim().replace(/\s+/g, " "),
      fact: m[3].trim().replace(/\s+/g, " "),
    });
  }
}

items.sort((a, b) => a.index - b.index);

if (items.length !== 30) {
  throw new Error(`Expected 30 myth/fact pairs, found ${items.length}`);
}

const difficultyForIndex = (index) => {
  if (index <= 10) return "easy";
  if (index <= 20) return "medium";
  return "hard";
};

const categoryForIndex = (index) => {
  if (index <= 10) return "basics";
  if (index <= 20) return "safety";
  return "reactors";
};

const popularityForIndex = (index) => {
  if (index <= 10) return 9;
  if (index <= 20) return 8;
  return 7;
};

const titleFromMyth = (myth) =>
  myth
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

const toId = (index) => `myths-facts-${String(index).padStart(2, "0")}`;

const sources = [
  {
    title: "Sources and Effects of Ionizing Radiation",
    url: "https://www.unscear.org/unscear/en/publications.html",
    author: "UNSCEAR",
    type: "official",
  },
  {
    title: "Radiation in Everyday Life",
    url: "https://www.iaea.org/topics/radiation-in-everyday-life",
    author: "IAEA",
    type: "official",
  },
  {
    title: "Safety of Nuclear Power Reactors",
    url: "https://www.world-nuclear.org/information-library/safety-and-security/safety-of-plants/safety-of-nuclear-power-reactors.aspx",
    author: "World Nuclear Association",
    type: "official",
  },
];

const myths = items.map((item) => {
  const difficulty = difficultyForIndex(item.index);
  const category = categoryForIndex(item.index);
  const popularity = popularityForIndex(item.index);

  return {
    id: toId(item.index),
    title: titleFromMyth(item.myth),
    mythStatement: item.myth,
    reality: item.fact,
    explanation: `This statement is a common myth in nuclear science.\n\n**Reality:** ${item.fact}`,
    category,
    difficulty,
    popularity,
    sources,
    tags: ["mythbuster", "nuclear", "radiation", category, difficulty],
  };
});

const ts = `import { Myth } from '../types';\n\nexport const mythsFactsList: Myth[] = ${JSON.stringify(myths, null, 2)};\n\nexport const mythsFactsPack: Record<string, Myth> = mythsFactsList.reduce((acc, myth) => {\n  acc[myth.id] = myth;\n  return acc;\n}, {} as Record<string, Myth>);\n\nexport default mythsFactsPack;\n`;

fs.writeFileSync(outputPath, ts, "utf8");
console.log(`Wrote ${outputPath} with ${myths.length} myths.`);
