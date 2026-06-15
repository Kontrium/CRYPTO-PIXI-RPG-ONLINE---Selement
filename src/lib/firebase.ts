/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, set, push, onChildAdded, onValue, remove, update } from "firebase/database";
import { MapSettings, BiomeType } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyBx1DftUTvzQIkgJqwIMDWo-snk7YwlE4Q",
  authDomain: "selementchat.firebaseapp.com",
  databaseURL: "https://selementchat-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "selementchat",
  storageBucket: "selementchat.firebasestorage.app",
  messagingSenderId: "277474489738",
  appId: "1:277474489738:web:74a74d9b63890d21e78473"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getDatabase(app);

// Default Map Settings
export const DEFAULT_MAP_SETTINGS: MapSettings = {
  width: 60,
  height: 60,
  tiles: {}, // Keyed by "x,y", empty fallback defaults to procedural generation
  spawns: [
    { id: "s1", x: 10, y: 10, monsterType: "classic" },
    { id: "s2", x: 15, y: 30, monsterType: "ranger" },
    { id: "s3", x: 40, y: 15, monsterType: "tank" },
    { id: "s4", x: 30, y: 45, monsterType: "runner" }
  ],
  playerSpeedMultiplier: 1.0,
  monsterAggressionMultiplier: 1.0,
  monsterStrengthMultiplier: 1.0,
  xpRateMultiplier: 1.0,
  maxMonstersCount: 24
};

// LocalStorage helpers for fully offline robust operations
const STORAGE_PREFIX = "cryptopixi_rpg_";

export function loadSettingsLocal(): MapSettings {
  try {
    const data = localStorage.getItem(`${STORAGE_PREFIX}map_settings`);
    if (data) {
      const parsed = JSON.parse(data);
      // Ensure essential fields exist
      return { ...DEFAULT_MAP_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.error("Error reading local map settings:", err);
  }
  return DEFAULT_MAP_SETTINGS;
}

export function saveSettingsLocal(settings: MapSettings) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}map_settings`, JSON.stringify(settings));
  } catch (err) {
    console.error("Error saving local map settings:", err);
  }
}
