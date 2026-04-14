import { Myth } from "../types";

export const fukushimaWasNuclearExplosionMyth: Myth = {
  id: "fukushima-was-nuclear-explosion",
  title: "Fukushima Was a Nuclear Explosion",
  mythStatement:
    "The Fukushima Daiichi accident was a nuclear explosion like an atomic bomb",
  reality:
    "Fukushima was a tsunami-driven loss-of-cooling accident with hydrogen (chemical) explosions, not a nuclear detonation",
  explanation: `The Fukushima 2011 incident is often misunderstood. It was severe, but it was not a nuclear bomb-type explosion.

**What actually happened:**
- A 9.0 earthquake and tsunami disabled external power and backup generators
- Reactor cooling systems failed after flooding
- Fuel overheating produced hydrogen gas
- Hydrogen accumulated and exploded in reactor buildings

**Why this matters:**
- Hydrogen explosions are chemical reactions, not nuclear yield
- Reactor fuel enrichment is too low for bomb-like detonation
- The core damage came from overheating and loss of cooling, not a nuclear blast

**Debunk:**
Fukushima demonstrates emergency-cooling and backup-power risks during extreme disasters, but it does not support the myth that reactors can explode like atomic bombs.`,

  category: "safety",
  difficulty: "medium",
  popularity: 9,

  sources: [
    {
      title: "Fukushima Daiichi Accident (Update)",
      url: "https://www.iaea.org/topics/fukushima-daiichi-nuclear-accident",
      author: "IAEA",
      type: "official",
    },
    {
      title: "Fukushima Daiichi Accident Information",
      url: "https://www.world-nuclear.org/information-library/safety-and-security/safety-of-plants/fukushima-daiichi-accident.aspx",
      author: "World Nuclear Association",
      type: "official",
    },
    {
      title: "The Fukushima Daiichi Accident Report",
      url: "https://www.oecd-nea.org/jcms/pl_14966/the-fukushima-daiichi-accident",
      author: "Nuclear Energy Agency (OECD/NEA)",
      type: "official",
    },
  ],

  relatedFacts: [],
  relatedLessons: ["nuclear-fission"],

  image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400",

  tags: ["fukushima", "safety", "accident", "reactors", "debunk"],
};

export default fukushimaWasNuclearExplosionMyth;
