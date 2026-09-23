import {
  AttackLogicInput,
  AttackLogicResult,
  Config,
  NukeMagnitude,
} from "../../src/core/configuration/Config";
import { Tick, UnitType } from "../../src/core/game/Game";
import { ResearchRequirement } from "../../src/core/game/Research";

export class TestConfig extends Config {
  private _proximityBonusPortsNb: number = 0;
  private _researchGating = false;
  private _defaultNukeSpeed: number = 4;
  private _spawnImmunityDuration: number = 0;
  private _nationSpawnImmunityDuration: number = 0;

  disableNavMesh(): boolean {
    return this.gameConfig().disableNavMesh ?? true;
  }

  radiusPortSpawn(): number {
    return 1;
  }

  proximityBonusPortsNb(totalPorts: number): number {
    return this._proximityBonusPortsNb;
  }

  // Specific to TestConfig
  setProximityBonusPortsNb(nb: number): void {
    this._proximityBonusPortsNb = nb;
  }

  nukeMagnitudes(_: UnitType): NukeMagnitude {
    return { inner: 1, outer: 1 };
  }

  setDefaultNukeSpeed(speed: number): void {
    this._defaultNukeSpeed = speed;
  }

  // Flat speed for all nuke types so test tick counts stay predictable.
  nukeSpeed(_: UnitType): number {
    return this._defaultNukeSpeed;
  }

  defaultNukeTargetableRange(): number {
    return 20;
  }

  deletionMarkDuration(): number {
    return 5;
  }

  defaultSamRange(): number {
    return 20;
  }

  samRange(level: number): number {
    return 20;
  }

  setSpawnImmunityDuration(duration: Tick) {
    this._spawnImmunityDuration = duration;
  }

  spawnImmunityDuration(): Tick {
    return this._spawnImmunityDuration;
  }

  setNationSpawnImmunityDuration(duration: Tick) {
    this._nationSpawnImmunityDuration = duration;
  }

  nationSpawnImmunityDuration(): Tick {
    return this._nationSpawnImmunityDuration;
  }

  attackLogic(_input: AttackLogicInput): AttackLogicResult {
    return { attackerTroopLoss: 1, defenderTroopLoss: 1, tickFraction: 1 };
  }

  /**
   * Research gating is off by default so tests about silos, SAMs and nukes
   * can build them without first standing up a research program — the same
   * reason this class flattens attackLogic and nuke magnitudes. Tests that
   * are about the tech tree turn it back on.
   */
  unitResearchRequirement(type: UnitType): ResearchRequirement | null {
    return this._researchGating ? super.unitResearchRequirement(type) : null;
  }

  setResearchGating(enabled: boolean): void {
    this._researchGating = enabled;
  }
}
export class UseRealAttackLogic extends TestConfig {
  attackLogic(input: AttackLogicInput): AttackLogicResult {
    return Config.prototype.attackLogic.call(this, input);
  }
}
