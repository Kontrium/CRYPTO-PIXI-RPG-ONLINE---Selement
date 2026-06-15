/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { LogOut, SlidersHorizontal, MessageSquare, Compass, Shield, ShieldCheck } from "lucide-react";
import { ref, onValue, set, remove } from "firebase/database";
import { db, loadSettingsLocal, saveSettingsLocal, DEFAULT_MAP_SETTINGS } from "./lib/firebase";
import { MapSettings, BiomeType, SpawnPoint } from "./types";

// Import modular subsets Components
import AuthContainer from "./components/AuthContainer";
import StartMenu from "./components/StartMenu";
import GameCanvas from "./components/GameCanvas";
import ChatOverlay from "./components/ChatOverlay";
import ProfileModal from "./components/ProfileModal";
import AdminEditor from "./components/AdminEditor";

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [screen, setScreen] = useState<"auth" | "start" | "game">("auth");
  const [charClass, setCharClass] = useState<"mag" | "wojownik" | "lucznik">("mag");

  // Map settings state synced across network
  const [mapSettings, setMapSettings] = useState<MapSettings>(DEFAULT_MAP_SETTINGS);

  // Administrative mode trackers
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  
  // Brush editor tools
  const [editorTool, setEditorTool] = useState<"none" | "paint" | "add_spawn">("none");
  const [selectedBiome, setSelectedBiome] = useState<BiomeType>("GRASS");

  // Interaction overlay popups state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);

  // Game statistics state
  const [gameStats, setGameStats] = useState({ level: 1, score: 0 });

  // 1. Listen for global Map settings on Firebase
  useEffect(() => {
    // Load local settings as immediate fallback
    const local = loadSettingsLocal();
    setMapSettings(local);

    // Sync from Firebase DB
    const settingsRef = ref(db, "mapSettings");
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        setMapSettings({
          ...DEFAULT_MAP_SETTINGS,
          ...val,
          tiles: val.tiles || {},
          spawns: val.spawns || []
        });
        // Cache to localStorage
        saveSettingsLocal(val);
      }
    });

    return () => {
      // Firebase cleanup is handled implicitly
    };
  }, []);

  // 2. Manage online state transitions and cleanups
  useEffect(() => {
    if (!currentUser) return;

    // Set online status
    const myOnlineRef = ref(db, `online/${currentUser}`);
    set(myOnlineRef, true);

    // Sync stats to Firebase
    const myStatsRef = ref(db, `stats/${currentUser}`);
    set(myStatsRef, {
      charClass: "Niewybrana/Rozgrzewka",
      level: 1,
      score: 0,
      lastUpdate: Date.now()
    });

    // Cleanup online status on shutdown
    const handleUnload = () => {
      remove(myOnlineRef);
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      remove(myOnlineRef);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [currentUser]);

  // Handle ESC or Tylda (`) shortcut trigger for chat opening
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== "game") return;

      // Skip triggering shortcuts if user inputs values inside a standard dialog text-box
      if (document.activeElement?.tagName === "INPUT") return;

      if (e.key === "`") {
        e.preventDefault();
        setIsChatOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [screen]);

  // Callback when character selection is selected
  const handleSelectClass = (selected: "mag" | "wojownik" | "lucznik") => {
    setCharClass(selected);
    setScreen("game");

    // Sync active stats
    if (currentUser) {
      set(ref(db, `stats/${currentUser}`), {
        charClass: selected.toUpperCase(),
        level: 1,
        score: 0,
        lastUpdate: Date.now()
      });
    }
  };

  // Callback when active game scores update
  const handleStatsUpdated = (level: number, score: number) => {
    setGameStats({ level, score });

    if (currentUser) {
      set(ref(db, `stats/${currentUser}`), {
        charClass: charClass.toUpperCase(),
        level,
        score,
        lastUpdate: Date.now()
      });
    }
  };

  // Push Map customizations directly to Firebase
  const handleUpdateMapSettings = (newSettings: MapSettings) => {
    setMapSettings(newSettings);
    // Persist to RTDB
    set(ref(db, "mapSettings"), newSettings);
    // Persist Locally
    saveSettingsLocal(newSettings);
  };

  const handleTileCustomized = (tileKey: string, type: BiomeType) => {
    const updatedTiles = { ...mapSettings.tiles, [tileKey]: type };
    const updated = { ...mapSettings, tiles: updatedTiles };
    handleUpdateMapSettings(updated);
  };

  const handleSpawnAdded = (spawn: SpawnPoint) => {
    const updatedSpawns = [...mapSettings.spawns, spawn];
    const updated = { ...mapSettings, spawns: updatedSpawns };
    handleUpdateMapSettings(updated);
  };

  const handleLogout = () => {
    if (currentUser) {
      remove(ref(db, `online/${currentUser}`));
    }
    setCurrentUser(null);
    setScreen("auth");
    setIsAdminUnlocked(false);
    setIsAdminPanelOpen(false);
  };

  return (
    <div className="relative w-screen h-screen bg-[#0b0f19] flex justify-center items-center overflow-hidden">
      {/* 1. AUTH SCREEN PANEL */}
      {screen === "auth" && (
        <div className="absolute inset-0 bg-radial from-[#151d30] to-[#0b0f19] flex justify-center items-center p-4">
          {/* Subtle background overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#00ffcc_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
          <AuthContainer
            onAuthenticated={(username) => {
              setCurrentUser(username);
              setScreen("start");
            }}
          />
        </div>
      )}

      {/* 2. CHARACTER SELECTION / START MENU PANEL SCREEN */}
      {screen === "start" && (
        <StartMenu
          currentUser={currentUser}
          onClassSelected={handleSelectClass}
          isAdmin={isAdminUnlocked}
          onAdminUnlocked={(unlocked) => {
            setIsAdminUnlocked(unlocked);
            // Auto open the panel
            setIsAdminPanelOpen(unlocked);
          }}
        />
      )}

      {/* 3. CORE ADVENTURE GAMEPLAY PANEL SCREEN */}
      {screen === "game" && currentUser && (
        <div className="relative w-full h-full">
          <GameCanvas
            mapSettings={mapSettings}
            charClass={charClass}
            currentUser={currentUser}
            isAdminActive={isAdminPanelOpen}
            editorTool={editorTool}
            selectedBiome={selectedBiome}
            onMapTileCustomized={handleTileCustomized}
            onSpawnPointAdded={handleSpawnAdded}
            onGameStatsUpdated={handleStatsUpdated}
          />

          {/* Inline Action Buttons overlay */}
          <div className="absolute bottom-4 left-4 z-10 flex gap-2">
            <button
              onClick={() => setIsChatOpen(true)}
              className="bg-[#151d30]/95 border border-[#00ffcc]/35 text-[#00ffcc] hover:bg-[#00ffcc] hover:text-[#0b0f19] focus:outline-none rounded-xl px-4 py-2.5 font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer text-xs"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Otwórz Czat (`)</span>
            </button>

            {isAdminUnlocked && (
              <button
                onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
                className={`border font-semibold rounded-xl px-4 py-2.5 shadow-lg transition-all cursor-pointer text-xs flex items-center gap-1.5 ${
                  isAdminPanelOpen
                    ? "bg-[#00ffcc] border-[#00ffcc] text-black font-extrabold"
                    : "bg-[#151d30]/95 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Panel Edycji (F10)</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="bg-[#151d30]/90 border border-[#ff4a4a]/40 text-red-400 hover:bg-[#ff4a4a] hover:text-white rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Wyloguj</span>
            </button>
          </div>

          {/* Play/Admin Status visual badge in upper right corner */}
          <div className="absolute top-4 right-4 z-10 pointer-events-none flex flex-col items-end gap-1 font-mono">
            <div className="bg-black/85 border border-slate-800 rounded-lg py-1 px-3 text-[10px] text-gray-400">
              Użytkownik: <strong className="text-white">@{currentUser}</strong>
            </div>

            {isAdminUnlocked ? (
              <div className="bg-[#00ffcc]/10 border border-[#00ffcc]/30 rounded-lg py-1 px-3 text-[9px] text-[#00ffcc] font-black uppercase flex items-center gap-1 animate-pulse">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Super Admin (Kontrium)</span>
              </div>
            ) : (
              <div className="bg-slate-900/90 border border-slate-800/80 rounded-lg py-1 px-3 text-[9px] text-gray-500 uppercase flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>Ranga: Gracz</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. REAL-TIME CHAT CONTAINER OVERLAY */}
      {isChatOpen && currentUser && (
        <ChatOverlay
          currentUser={currentUser}
          onClose={() => setIsChatOpen(false)}
          onViewProfile={(uname) => setProfileUsername(uname)}
        />
      )}

      {/* 5. USER DETAILS PROFILE CARD MODAL */}
      {profileUsername && (
        <ProfileModal username={profileUsername} onClose={() => setProfileUsername(null)} />
      )}

      {/* 6. ADMIN SYSTEM WORLD EDITOR DRAW-PANEL */}
      {isAdminPanelOpen && isAdminUnlocked && screen === "game" && (
        <AdminEditor
          settings={mapSettings}
          onChangeSettings={handleUpdateMapSettings}
          editorTool={editorTool}
          setEditorTool={setEditorTool}
          selectedBiome={selectedBiome}
          setSelectedBiome={setSelectedBiome}
          onClose={() => setIsAdminPanelOpen(false)}
        />
      )}
    </div>
  );
}
