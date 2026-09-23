# Battlefront

A singleplayer real-time strategy game about running a nation, not just
painting a map. Pick a theatre, take command of a historical power, choose the
economic system you will run it under, and fight the AI for it.

**Play it: https://yohaann196.github.io/battlefront/**

No account, no lobby, no server — the simulation runs entirely in your browser.

## What you actually decide

**Doctrine.** Every nation runs one of four economic systems, and each is a
real trade-off rather than a flavour text:

| Doctrine        | Gains                                          | Costs                                   |
| --------------- | ---------------------------------------------- | --------------------------------------- |
| **Capitalism**  | +25% gold, +15% trade, cheaper industry        | −10% troop growth, costlier military    |
| **Communism**   | +25% troop growth, +20% cap, +10% defense      | −15% gold, −25% trade, costlier industry |
| **Militarism**  | +15% attack, −25% military building cost       | −10% gold, −15% research                |
| **Technocracy** | +50% research, −30% lab cost, +5% defense      | −10% troop growth and cap, −5% attack   |

Switching mid-game costs a flat sum plus half your treasury, and the new
government's benefits do not apply for two minutes while it reorganises. It is
a pivot you plan, not a reaction.

**Research.** Research labs generate points on their own. Seven levels unlock
in order — conscription, doctrine, fortification, rocketry, then the nuclear
ladder. Nuclear weapons additionally require a minimum number of labs, so you
cannot reach them on one upgraded building.

**Force structure.** Alongside the usual cities and ports there are barracks
(troop ceiling and recruitment), artillery (attacks into its range cost fewer
troops), fortresses (a defense post that actually holds a line), and research
labs. The economy buildings are deliberately weaker than in the game this is
built on: they fund an army rather than win on their own.

**Nuclear weapons are a decision, not a purchase.** They are research-gated and
cost several times what they used to, and using one has consequences that
outlast the blast: every nation that is not your ally turns hostile, your
income is halved and your defenses weakened for five minutes, and you are
branded a pariah. The game warns you before you commit.

## Theatres

| Scenario            | Map    | Notes                                              |
| ------------------- | ------ | -------------------------------------------------- |
| **Modern World**    | World  | Today's nations and arsenals, free-for-all          |
| **World War II**    | Europe | Axis / Allies / Neutral, fission only               |
| **World War I**     | Europe | Central Powers / Entente, no rockets or warheads    |
| **Empires of 1500** | World  | Age of sail; no industry, no rocketry               |
| **Mongol Conquest** | Asia   | Ride out of the steppe; horse archers and siege     |

You pick a power and deploy onto its own ground — the United States does not
start in Germany. Each scenario caps the technology of its era.

## Running it locally

```bash
npm run inst   # npm ci --ignore-scripts — do NOT use npm install
npm run dev    # http://localhost:9000
```

```bash
npm test       # Vitest
npm run lint
```

Build the static site (what GitHub Pages serves):

```bash
npm run build-pages
```

## Credits and licence

Battlefront is built on [OpenFront](https://github.com/openfrontio/OpenFrontIO)
and is a derivative work of it. **© OpenFront and Contributors.**

Source code is licensed under the **GNU AGPL v3.0** — see [LICENSE](LICENSE).
Assets are licensed under **CC BY-SA 4.0** — see
[LICENSE-ASSETS](LICENSE-ASSETS) and [CREDITS.md](CREDITS.md).

As a derivative work this repository keeps the upstream copyright notices, and
the game itself displays them in the footer and on the loading screen.
