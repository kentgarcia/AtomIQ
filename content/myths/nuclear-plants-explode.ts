import { Myth } from '../types';

export const nuclearPlantsExplodeMyth: Myth = {
  id: 'nuclear-plants-explode',
  title: 'Nuclear Plants Can Explode Like Atomic Bombs',
  mythStatement: 'Nuclear power plants can explode like nuclear bombs',
  reality: 'Nuclear reactors cannot explode like bombs - the physics is completely different',
  explanation: `This is physically impossible. Nuclear weapons and nuclear reactors operate on fundamentally different principles.

**Why Reactors Can't Explode Like Bombs:**
- **Enrichment Level**: Reactor fuel is 3-5% enriched uranium; bombs need 90%+ enrichment
- **Critical Mass**: Reactors are designed to prevent runaway reactions
- **Geometry**: Bomb design requires precise implosion geometry that doesn't exist in reactors
- **Control Systems**: Multiple redundant safety systems prevent criticality accidents

**What CAN Happen:**
- Steam explosions (like Chernobyl) - NOT a nuclear explosion
- Hydrogen explosions (like Fukushima) - chemical, not nuclear
- Meltdowns - serious but contained, not explosive

**Historical Evidence:**
Even in the worst accidents (Chernobyl, Fukushima, Three Mile Island), there was NO nuclear explosion. The Chernobyl explosion was a steam explosion that destroyed the building, not a nuclear yield.

According to the Nuclear Energy Agency (NEA), the fundamental physics of nuclear reactors makes a bomb-like explosion impossible.`,
  
  category: 'safety',
  difficulty: 'medium',
  popularity: 9,
  
  sources: [
    {
      title: 'Nuclear Reactor Safety',
      url: 'https://www.nei.org/fundamentals/safety',
      author: 'Nuclear Energy Institute',
      type: 'official'
    },
    {
      title: 'Can Nuclear Reactors Explode?',
      url: 'https://www.world-nuclear.org/information-library/safety-and-security/safety-of-plants/safety-of-nuclear-power-reactors.aspx',
      author: 'World Nuclear Association',
      type: 'official'
    }
  ],
  
  relatedFacts: [],
  relatedLessons: ['nuclear-fission'],
  
  image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400',
  
  tags: ['safety', 'reactors', 'explosions', 'misconceptions']
};

export default nuclearPlantsExplodeMyth;

