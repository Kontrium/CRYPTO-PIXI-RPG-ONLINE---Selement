/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import {
  Map,
  Compass,
  Sparkles,
  HeartCrack,
  X,
  Plus,
  Trash2,
  Brush,
  Gauge,
  UserCheck,
  Zap,
  RotateCcw
} from "lucide-react";
import { MapSettings, BiomeType, SpawnPoint } from "../types";

interface AdminEditorProps {
  settings: MapSettings;
  onChangeSettings: (newSettings: MapSettings) => void;
  onClose: () => void;
  editorTool: "none" | "paint" | "add_spawn";
  setEditorTool: (tool: "none" | "paint" | "add_spawn") => void;
  selectedBiome: BiomeType;
  setSelectedBiome: (biome: BiomeType) => void;
}

export default function AdminEditor({
  settings,
  onChangeSettings,
  onClose,
  editorTool,
  setEditorTool,
  selectedBiome,
  setSelectedBiome
}: AdminEditorProps) {
  const [mapW, setMapW] = useState(settings.width);
  const [mapH, setMapH] = useState(settings.height);
  const [spawnType, setSpawnType] = useState("classic");

  const biomes: { type: BiomeType; name: string; color: string }[] = [
    { type: "GRASS", name: "Grass (Łąka)", color: "bg-[#4caf50]" },
    { type: "WATER", name: "Water (Woda)", color: "bg-[#1f618d]" },
    { type: "SAND", name: "Sand (Piasek)", color: "bg-[#f1c40f]" },
    { type: "FOREST", name: "Forest (Las)", color: "bg-[#1e8449]" },
    { type: "RAINFOREST", name: "Rainforest (Dżungla)", color: "bg-[#117a65]" },
    { type: "MOUNTAIN", name: "Mountain (Góra)", color: "bg-[#7f8c8d]" }
  ];

  const handleUpdateSize = () => {
    if (mapW < 10 || mapH < 10) {
      alert("Rozmiar mapy musi wynosić przynajmniej 10x10!");
      return;
    }
    onChangeSettings({
      ...settings,
      width: Math.floor(mapW),
      height: Math.floor(mapH)
    });
    alert(`Zmieniono rozmiar mapy na: ${mapW}x${mapH}`);
  };

  const handleDeleteSpawn = (id: string) => {
    onChangeSettings({
      ...settings,
      spawns: settings.spawns.filter((s) => s.id !== id)
    });
  };

  const handleResetSettings = () => {
    if (confirm("Czy na pewno chcesz przywrócić parametry domyślne?")) {
      onChangeSettings({
        ...settings,
        playerSpeedMultiplier: 1.0,
        monsterAggressionMultiplier: 1.0,
        monsterStrengthMultiplier: 1.0,
        xpRateMultiplier: 1.0,
        maxMonstersCount: 24
      });
    }
  };

  return (
    <div className="absolute top-4 right-4 bottom-4 w-80 bg-[#080A0E]/95 backdrop-blur border border-white/5 rounded-2xl flex flex-col z-40 text-slate-300 shadow-2xl select-none font-mono">
      {/* Panel Header */}
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0A0C10] rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
          <span className="font-bold font-display uppercase text-xs tracking-widest text-white">
            ADMIN_CONTROL_v4.2
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white hover:bg-white/5 p-1 rounded transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Editor scroll body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-[11px]">
        {/* Dimensions section */}
        <div className="space-y-2 border-b border-white/5 pb-4">
          <h4 className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Map className="w-3.5 h-3.5 text-blue-400" /> WYMIARY WORLD_GRID
          </h4>
          <p className="text-[9px] text-slate-500 uppercase tracking-widest leading-normal">
            Siatka współrzędnych mapy świata (Min 10x10)
          </p>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">WIDTH (W):</span>
              <input
                type="number"
                value={mapW}
                onChange={(e) => setMapW(Number(e.target.value))}
                className="w-full bg-[#050608] border border-white/10 rounded px-2.5 py-1.5 focus:border-blue-500 text-blue-400 font-mono text-center focus:outline-none"
              />
            </div>
            <div>
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">HEIGHT (H):</span>
              <input
                type="number"
                value={mapH}
                onChange={(e) => setMapH(Number(e.target.value))}
                className="w-full bg-[#050608] border border-white/10 rounded px-2.5 py-1.5 focus:border-blue-500 text-blue-400 font-mono text-center focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleUpdateSize}
            className="w-full mt-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 rounded cursor-pointer transition-colors text-[10px] uppercase tracking-wider"
          >
            USTAW WYMIARY SIATKI
          </button>
        </div>

        {/* Tile Paint Settings */}
        <div className="space-y-2 border-b border-white/5 pb-4">
          <h4 className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Brush className="w-3.5 h-3.5 text-blue-400 animate-bounce" /> MODYFIKACJA BIOMÓW
          </h4>
          <p className="text-[9px] text-slate-500 uppercase tracking-widest leading-normal">
            Maluj bezpośrednio na siatce przytrzymując kliknięcie
          </p>

          <div className="flex gap-2 items-center mt-2.5">
            <button
              onClick={() => setEditorTool(editorTool === "paint" ? "none" : "paint")}
              className={`flex-1 py-1.5 px-3 rounded text-[10px] font-bold transition-all uppercase tracking-wider ${
                editorTool === "paint"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {editorTool === "paint" ? "🖌️ PĘDZEL: AKTYWNY" : "🖌️ URUCHOM RYSOWANIE"}
            </button>
          </div>

          {editorTool === "paint" && (
            <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-white/5">
              {biomes.map((b) => (
                <button
                  key={b.type}
                  onClick={() => setSelectedBiome(b.type)}
                  className={`flex items-center gap-2 p-1.5 rounded text-[9px] text-left border transition-all ${
                    selectedBiome === b.type
                      ? "border-blue-500/50 bg-blue-500/5 text-blue-300"
                      : "border-white/5 bg-[#050608]/45 hover:border-white/10 hover:text-white"
                  }`}
                >
                  <span className={`w-3 h-3 rounded-sm ${b.color} border border-white/5`} />
                  <span className="truncate tracking-wide uppercase">{b.name.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Monster Spawnpoints Section */}
        <div className="space-y-2 border-b border-white/5 pb-4">
          <h4 className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-blue-400" /> SPAWN_POINTS ENEMY
          </h4>
          <p className="text-[9px] text-slate-500 uppercase tracking-widest leading-normal">
            Dodawaj stałe wylęgarnie wrogów na mapie świata
          </p>

          <div className="flex flex-col gap-1.5 mt-2">
            <div className="flex gap-1">
              <select
                value={spawnType}
                onChange={(e) => setSpawnType(e.target.value)}
                className="bg-[#050608] border border-white/10 rounded px-2 text-[10px] flex-1 text-slate-300 focus:outline-none focus:border-blue-500 uppercase tracking-wider"
              >
                <option value="classic">👹 Classic</option>
                <option value="runner">⚡ Runner</option>
                <option value="ranger">🏹 Ranger</option>
                <option value="tank">🛡️ Tank</option>
                <option value="stalker">🥷 Stalker</option>
                <option value="shaman">🔮 Shaman</option>
              </select>

              <button
                onClick={() => setEditorTool(editorTool === "add_spawn" ? "none" : "add_spawn")}
                className={`py-1.5 px-3 rounded text-[10px] font-bold transition-all uppercase tracking-wider ${
                  editorTool === "add_spawn" ? "bg-amber-500 text-black font-semibold" : "bg-blue-600 text-white hover:bg-blue-500"
                }`}
              >
                {editorTool === "add_spawn" ? "CELOWNIK" : "DODAJ"}
              </button>
            </div>

            {/* List existing spawns */}
            {settings.spawns.length > 0 && (
              <div className="max-h-24 overflow-y-auto mt-2 space-y-1 bg-[#050608]/45 p-1 px-1.5 rounded border border-white/5">
                {settings.spawns.map((s) => (
                  <div key={s.id} className="flex justify-between items-center bg-[#07090d] p-1 rounded border border-white/5 text-[10px]">
                    <span className="text-slate-400 uppercase tracking-wide">
                      {s.monsterType} ({s.x},{s.y})
                    </span>
                    <button
                      onClick={() => handleDeleteSpawn(s.id)}
                      className="text-red-400 hover:text-red-300 p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Global Multipliers Section */}
        <div className="space-y-4 pt-1">
          <h4 className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-blue-400" /> MULTIPLIERS ENGINE
          </h4>

          {/* Hero Speed Multiplier */}
          <div className="space-y-1.5 bg-[#050608]/50 p-2.5 rounded border border-white/5">
            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              <span>💨 MOVEMENT_SPEED</span>
              <span className="text-blue-400 font-mono">
                {settings.playerSpeedMultiplier.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={settings.playerSpeedMultiplier}
              onChange={(e) =>
                onChangeSettings({
                  ...settings,
                  playerSpeedMultiplier: Number(e.target.value)
                })
              }
              className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Monster Strength (Damage) Multiplier */}
          <div className="space-y-1.5 bg-[#050608]/50 p-2.5 rounded border border-white/5">
            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              <span>💪 MONSTER_STRENGTH</span>
              <span className="text-red-400 font-mono font-bold">
                {settings.monsterStrengthMultiplier.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.3"
              max="3.0"
              step="0.1"
              value={settings.monsterStrengthMultiplier}
              onChange={(e) =>
                onChangeSettings({
                  ...settings,
                  monsterStrengthMultiplier: Number(e.target.value)
                })
              }
              className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
          </div>

          {/* Monster Aggressiveness (Chase Speed & Range) */}
          <div className="space-y-1.5 bg-[#050608]/50 p-2.5 rounded border border-white/5">
            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              <span>👁️ MONSTER_AGGR_RADIUS</span>
              <span className="text-amber-400 font-mono">
                {settings.monsterAggressionMultiplier.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={settings.monsterAggressionMultiplier}
              onChange={(e) =>
                onChangeSettings({
                  ...settings,
                  monsterAggressionMultiplier: Number(e.target.value)
                })
              }
              className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Gaining Next Level Speed (XP Rate) */}
          <div className="space-y-1.5 bg-[#050608]/50 p-2.5 rounded border border-white/5">
            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              <span>⚡ EXPERIENCE_RATE</span>
              <span className="text-emerald-400 font-mono">
                {settings.xpRateMultiplier.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="5.0"
              step="0.2"
              value={settings.xpRateMultiplier}
              onChange={(e) =>
                onChangeSettings({
                  ...settings,
                  xpRateMultiplier: Number(e.target.value)
                })
              }
              className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Spawn Quantity / Monster Spawn rate */}
          <div className="space-y-1.5 bg-[#050608]/50 p-2.5 rounded border border-white/5">
            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              <span>👾 MONSTER_MAX_LIMIT</span>
              <span className="text-purple-400 font-mono">
                {settings.maxMonstersCount}
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="70"
              step="1"
              value={settings.maxMonstersCount}
              onChange={(e) =>
                onChangeSettings({
                  ...settings,
                  maxMonstersCount: Number(e.target.value)
                })
              }
              className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Panel Footer */}
      <div className="p-3 border-t border-white/5 bg-[#0A0C10] rounded-b-2xl flex gap-1.5">
        <button
          onClick={handleResetSettings}
          className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-1.5 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer text-[9px] uppercase tracking-wider"
        >
          <RotateCcw className="w-3 h-3 text-blue-400" /> RESET_PRESETS
        </button>
      </div>
    </div>
  );
}
