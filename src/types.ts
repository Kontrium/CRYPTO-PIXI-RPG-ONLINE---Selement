/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserStats {
  charClass: string;
  level: number;
  score: number;
  lastUpdate: number;
}

export type BiomeType = 'WATER' | 'SAND' | 'GRASS' | 'FOREST' | 'RAINFOREST' | 'MOUNTAIN';

export interface BiomeConfig {
  id: number;
  c1: string;
  c2: string;
  name: string;
}

export interface SpawnPoint {
  id: string;
  x: number; // in tile coordinates
  y: number; // in tile coordinates
  monsterType: string;
}

export interface MapSettings {
  width: number;
  height: number;
  tiles: Record<string, BiomeType>; // key format "x,y" to prevent huge sparse arrays
  spawns: SpawnPoint[];
  playerSpeedMultiplier: number; // admin customizable
  monsterAggressionMultiplier: number; // admin customizable
  monsterStrengthMultiplier: number; // admin customizable
  xpRateMultiplier: number; // admin customizable, higher means quicker level up
  maxMonstersCount: number; // admin customizable
}

export interface PlayerState {
  worldX: number;
  worldY: number;
  radius: number;
  vx: number;
  vy: number;
  acceleration: number;
  friction: number;
  maxSpeed: number;
  angle: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  manaRegen: number;
  level: number;
  xp: number;
  xpNeeded: number;
  bulletDamage: number;
  skillPoints: number;
  charClass: string;
  attackCooldown: number;
  swingSide: number;
}

export interface GameMessage {
  id: string;
  user: string;
  text: string;
  timestamp: number;
}
