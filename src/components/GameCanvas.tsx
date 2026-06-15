/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Eye, EyeOff, Swords } from "lucide-react";
import { BiomeType, BiomeConfig, MapSettings, PlayerState, SpawnPoint } from "../types";

// Biome Colors and config matching original design
export const BIOMES: Record<BiomeType, BiomeConfig> = {
  WATER: { id: 0, c1: "#1f618d", c2: "#2e86c1", name: "Woda" },
  SAND: { id: 1, c1: "#f1c40f", c2: "#f39c12", name: "Pustynia" },
  GRASS: { id: 2, c1: "#4caf50", c2: "#45a049", name: "Łąka" },
  FOREST: { id: 3, c1: "#1e8449", c2: "#196f3d", name: "Las" },
  RAINFOREST: { id: 4, c1: "#117a65", c2: "#0e6251", name: "Las Deszczowy" },
  MOUNTAIN: { id: 5, c1: "#7f8c8d", c2: "#95a5a6", name: "Góry" }
};

interface GameCanvasProps {
  mapSettings: MapSettings;
  charClass: "mag" | "wojownik" | "lucznik";
  currentUser: string;
  isAdminActive: boolean;
  editorTool: "none" | "paint" | "add_spawn";
  selectedBiome: BiomeType;
  onMapTileCustomized: (tileKey: string, type: BiomeType) => void;
  onSpawnPointAdded: (spawn: SpawnPoint) => void;
  onGameStatsUpdated: (level: number, score: number) => void;
}

// Procedural noise algorithm matching the original formula
export function getNoiseTileAt(x: number, y: number, mapW: number, mapH: number): BiomeType {
  // Wrap coordinate inside map boundary widths
  const boundedX = ((x % mapW) + mapW) % mapW;
  const boundedY = ((y % mapH) + mapH) % mapH;

  const getSmoothNoise = (tx: number, ty: number) => {
    let total = 0;
    total += (Math.sin(tx * 0.05) + Math.cos(ty * 0.05)) * 2.0;
    total += (Math.sin(tx * 0.15) * Math.cos(ty * 0.12)) * 1.0;
    total += (Math.sin(tx * 0.01) + Math.sin(ty * 0.01)) * 4.0;
    return total;
  };

  const n = getSmoothNoise(boundedX, boundedY);
  const riverNoise = Math.abs(Math.sin(boundedX * 0.08) + Math.cos(boundedY * 0.08));

  if (n < -2.2 || riverNoise < 0.08) return "WATER";
  if (n < -1.2) return "SAND";
  if (n < 0.8) return "GRASS";
  if (n < 2.2) return "FOREST";
  if (n < 3.8) return "RAINFOREST";
  return "MOUNTAIN";
}

export function MathNoise(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
  return n - Math.floor(n);
}

export default function GameCanvas({
  mapSettings,
  charClass,
  currentUser,
  isAdminActive,
  editorTool,
  selectedBiome,
  onMapTileCustomized,
  onSpawnPointAdded,
  onGameStatsUpdated
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Score metrics
  const [score, setScore] = useState(0);

  // Hero parameters in state to render on React HUD easily
  const [playerHp, setPlayerHp] = useState(100);
  const [playerMaxHp, setPlayerMaxHp] = useState(100);
  const [playerMana, setPlayerMana] = useState(100);
  const [playerMaxMana, setPlayerMaxMana] = useState(100);
  const [playerLvl, setPlayerLvl] = useState(1);
  const [playerXp, setPlayerXp] = useState(0);
  const [playerXpNeeded, setPlayerXpNeeded] = useState(100);

  // Weather parameters
  const [currentWeather, setCurrentWeather] = useState("sunny");
  const [bossUiActive, setBossUiActive] = useState(false);
  const [bossHpPercentage, setBossHpPercentage] = useState(100);

  // References to keep state accessible immediately in high-frequency event loop (up to 120 FPS)
  const statsRef = useRef({
    score: 0,
    level: 1,
    xp: 0,
    xpNeeded: 100,
    hp: 100,
    maxHp: 100,
    mana: 100,
    maxMana: 100
  });

  // Track spawn intervals
  const mapSettingsRef = useRef(mapSettings);
  mapSettingsRef.current = mapSettings;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrameId: number;
    let isRunning = true;

    // Canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const TILE_SIZE = 64;

    // Entities simulation lists
    const bullets: any[] = [];
    const enemyBullets: any[] = [];
    const enemies: any[] = [];
    const animals: any[] = [];
    const loots: any[] = [];
    const fishes: any[] = [];
    const visualEffects: any[] = [];
    const particles: any[] = [];

    // Initialize fishes
    for (let i = 0; i < 30; i++) {
      fishes.push({
        worldX: (Math.random() - 0.5) * 4000,
        worldY: (Math.random() - 0.5) * 4000,
        angle: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1,
        timeOffset: Math.random() * 100
      });
    }

    // Camera details
    let screenCenterX = canvas.width / 2;
    let screenCenterY = canvas.height / 2;
    let camShakeTime = 0;
    let camShakeIntensity = 0;

    const triggerCameraShake = (time: number, intensity: number) => {
      camShakeTime = time;
      camShakeIntensity = intensity;
    };

    // Keyboard navigation inputs
    const keys: Record<string, boolean> = { w: false, a: false, s: false, d: false };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;
      const key = e.key.toLowerCase();
      if (key in keys) keys[key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key in keys) keys[key] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Mouse and touch tracing
    const mouse = { x: screenCenterX, y: screenCenterY };
    let isMousing = false;
    let isMouseDown = false;

    // Touch controls helpers
    const joystick = {
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      active: false,
      pointerId: null as number | null,
      maxRadius: 60
    };
    const touchAim = { x: screenCenterX, y: screenCenterY, active: false, pointerId: null as number | null };

    // Player Object
    const initialSpeed = 5.5;
    const player: PlayerState = {
      worldX: mapSettingsRef.current.width * 32, // Start in center of custom width
      worldY: mapSettingsRef.current.height * 32, // Start in center of custom height
      radius: 18,
      vx: 0,
      vy: 0,
      acceleration: 0.8,
      friction: 0.85,
      maxSpeed: initialSpeed,
      angle: 0,
      hp: charClass === "wojownik" ? 130 : 100,
      maxHp: charClass === "wojownik" ? 130 : 100,
      mana: charClass === "mag" ? 120 : 100,
      maxMana: charClass === "mag" ? 120 : 100,
      manaRegen: charClass === "mag" ? 0.38 : 0.28,
      level: 1,
      xp: 0,
      xpNeeded: 100,
      bulletDamage: charClass === "wojownik" ? 60 : charClass === "mag" ? 40 : 28,
      skillPoints: 0,
      charClass,
      attackCooldown: 0,
      swingSide: 1
    };

    // Update state to React HUD initially
    setPlayerHp(player.hp);
    setPlayerMaxHp(player.maxHp);
    setPlayerMana(player.mana);
    setPlayerMaxMana(player.maxMana);
    setPlayerLvl(player.level);
    setPlayerXp(player.xp);
    setPlayerXpNeeded(player.xpNeeded);

    // Alert nearby enemies helper
    const alertNearbyEnemies = (sourceEnemy: any, range = 350) => {
      enemies.forEach((e) => {
        if (e.state !== "aggressive") {
          const dx = e.worldX - sourceEnemy.worldX;
          const bgDam = e.worldY - sourceEnemy.worldY;
          if (Math.sqrt(dx * dx + bgDam * bgDam) < range) {
            e.state = "aggressive";
            e.alertProgress = 100;
          }
        }
      });
    };

    // Hero offensive attacks
    const triggerPlayerAttack = () => {
      if (player.attackCooldown > 0) return;

      if (player.charClass === "mag") {
        if (player.mana >= 15) {
          player.mana -= 15;
          bullets.push({
            type: "energy_ball",
            worldX: player.worldX,
            worldY: player.worldY,
            vx: Math.cos(player.angle) * 11,
            vy: Math.sin(player.angle) * 11,
            radius: 8,
            life: 65,
            damage: player.bulletDamage,
            animFrame: 0
          });
          player.attackCooldown = 18;
        }
      } else if (player.charClass === "wojownik") {
        if (player.mana >= 12) {
          player.mana -= 12;
          player.swingSide *= -1;

          const attackAngle = player.angle + 0.45 * player.swingSide;
          visualEffects.push({
            type: "slash",
            worldX: player.worldX,
            worldY: player.worldY,
            angle: attackAngle,
            side: player.swingSide,
            life: 12,
            maxLife: 12
          });

          const range = 85;
          const ax = player.worldX + Math.cos(player.angle) * 40;
          const ay = player.worldY + Math.sin(player.angle) * 40;

          // Hit enemies
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            const edx = e.worldX - ax;
            const edy = e.worldY - ay;
            if (Math.sqrt(edx * edx + edy * edy) < e.radius + range / 2) {
              e.hp = Math.max(0, e.hp - player.bulletDamage);
              if (e.state !== "aggressive") {
                e.state = "aggressive";
                e.alertProgress = 100;
              }
              alertNearbyEnemies(e);
              triggerCameraShake(8, 3.5);

              if (e.hp <= 0) {
                if (e.type === "boss") setBossUiActive(false);
                enemies.splice(i, 1);
                handleGainScore(e.xpReward);
              }
            }
          }

          // Hit animals
          animals.forEach((a, aIdx) => {
            const adx = a.worldX - ax;
            const ady = a.worldY - ay;
            if (Math.sqrt(adx * adx + ady * ady) < a.radius + range / 2) {
              a.hp -= player.bulletDamage;
              if (a.hp <= 0) {
                loots.push({ worldX: a.worldX, worldY: a.worldY, pulse: 0 });
                animals.splice(aIdx, 1);
              }
            }
          });

          player.attackCooldown = 8;
        }
      } else if (player.charClass === "lucznik") {
        if (player.mana >= 7) {
          player.mana -= 7;
          const spread = (Math.random() - 0.5) * 0.06;
          const finalAngle = player.angle + spread;

          bullets.push({
            type: "arrow",
            worldX: player.worldX,
            worldY: player.worldY,
            vx: Math.cos(finalAngle) * 15,
            vy: Math.sin(finalAngle) * 15,
            radius: 4,
            life: 65,
            damage: player.bulletDamage,
            angle: finalAngle
          });
          player.attackCooldown = 9;
        }
      }

      // Sync React indicators
      setPlayerMana(player.mana);
    };

    // Gain score / Level Up calculations including Admin Leveling multiplier!
    const handleGainScore = (xpEarned: number) => {
      const addedScore = score + 1;
      setScore(addedScore);
      statsRef.current.score = addedScore;

      // Apply Gaining Level speed scaler from configuration settings directly!
      const finalXpEarned = Math.floor(xpEarned * mapSettingsRef.current.xpRateMultiplier);
      player.xp += finalXpEarned;

      if (player.xp >= player.xpNeeded) {
        player.xp -= player.xpNeeded;
        player.level += 1;
        player.skillPoints += 3;
        player.xpNeeded = Math.floor(player.xpNeeded * 1.55);

        // Max out stats on level up
        player.maxHp = Math.floor(player.maxHp * 1.08);
        player.hp = player.maxHp;
        player.maxMana = Math.floor(player.maxMana * 1.05);
        player.mana = player.maxMana;
        player.bulletDamage = Math.floor(player.bulletDamage * 1.06);

        setPlayerMaxHp(player.maxHp);
        setPlayerMaxMana(player.maxMana);
        setPlayerLvl(player.level);
        setPlayerXpNeeded(player.xpNeeded);
      }

      setPlayerXp(player.xp);
      setPlayerHp(player.hp);
      setPlayerMana(player.mana);

      onGameStatsUpdated(player.level, addedScore);
    };

    // Dynamic environmental physics
    let gameTime = 1200;
    let weatherTimer = 3000;
    const WEATHER_PRESETS = ["sunny", "rain", "snow", "fog", "thunder"];
    let thunderFlash = 0;

    const runWeatherCycle = () => {
      gameTime = (gameTime + 0.35) % 2400;
      weatherTimer--;

      if (weatherTimer <= 0) {
        const nextWeather = WEATHER_PRESETS[Math.floor(Math.random() * WEATHER_PRESETS.length)];
        setCurrentWeather(nextWeather);
        weatherTimer = 2500 + Math.random() * 2500;
      }

      // Fallback rain/particles generator
      if ((currentWeather === "rain" || currentWeather === "thunder") && particles.length < 150) {
        particles.push({
          x: Math.random() * canvas.width,
          y: -15,
          speed: 10 + Math.random() * 5,
          len: 15 + Math.random() * 8,
          type: "rain"
        });
      } else if (currentWeather === "snow" && particles.length < 90) {
        particles.push({
          x: Math.random() * canvas.width,
          y: -15,
          speed: 2.2 + Math.random() * 2,
          drift: (Math.random() - 0.5) * 1,
          len: 3 + Math.random() * 3,
          type: "snow"
        });
      }

      if (currentWeather === "thunder" && Math.random() < 0.0035 && thunderFlash <= 0) {
        thunderFlash = 9;
        triggerCameraShake(18, 6.5);
      }

      if (thunderFlash > 0) thunderFlash--;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (p.type === "rain") {
          p.y += p.speed;
          p.x += 1;
        } else {
          p.y += p.speed;
          p.x += p.drift;
        }
        if (p.y > canvas.height) particles.splice(i, 1);
      }
    };

    // Helper: Paint edited biome or add spawn point
    const handleMouseInteraction = (clientX: number, clientY: number) => {
      if (!isAdminActive || editorTool === "none") return;

      const scaleX = canvas.width / canvas.clientWidth;
      const scaleY = canvas.height / canvas.clientHeight;
      const canvasMouseX = clientX * scaleX;
      const canvasMouseY = clientY * scaleY;

      // Translate canvas coordinate inside world coordinate system using camera offsets
      const cameraX = player.worldX - screenCenterX;
      const cameraY = player.worldY - screenCenterY;
      const worldClickX = canvasMouseX + cameraX;
      const worldClickY = canvasMouseY + cameraY;

      // Map coordinate to tile format
      const tx = Math.floor(worldClickX / TILE_SIZE);
      const ty = Math.floor(worldClickY / TILE_SIZE);

      if (tx < 0 || tx >= mapSettingsRef.current.width || ty < 0 || ty >= mapSettingsRef.current.height) {
        return;
      }

      if (editorTool === "paint") {
        const key = `${tx},${ty}`;
        onMapTileCustomized(key, selectedBiome);
      } else if (editorTool === "add_spawn") {
        const newId = `spawn_dyn_${Date.now()}`;
        const newSpawn: SpawnPoint = {
          id: newId,
          x: tx,
          y: ty,
          monsterType: "classic" // Defaults to normal, admin can select
        };
        onSpawnPointAdded(newSpawn);
      }
    };

    // Mouse events config
    const onMouseDown = (e: MouseEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;
      if (e.button === 0) {
        isMouseDown = true;
        if (isAdminActive && editorTool !== "none") {
          handleMouseInteraction(e.clientX, e.clientY);
        } else if (player.charClass !== "lucznik") {
          triggerPlayerAttack();
        }
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) isMouseDown = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      isMousing = true;

      // Paint continuously on hold if in paint mode
      if (isMouseDown && isAdminActive && editorTool === "paint") {
        handleMouseInteraction(e.clientX, e.clientY);
      }
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mousemove", onMouseMove);

    // Touch Pointer Events
    const onPointerDown = (e: PointerEvent) => {
      if (e.clientX < canvas.width / 2 && !joystick.active) {
        joystick.active = true;
        joystick.pointerId = e.pointerId;
        joystick.startX = joystick.currentX = e.clientX;
        joystick.startY = joystick.currentY = e.clientY;
      } else if (e.clientX >= canvas.width / 2) {
        touchAim.active = true;
        touchAim.pointerId = e.pointerId;
        touchAim.x = e.clientX;
        touchAim.y = e.clientY;
        isMousing = false;
        isMouseDown = true;

        if (isAdminActive && editorTool !== "none") {
          handleMouseInteraction(e.clientX, e.clientY);
        } else if (player.charClass !== "lucznik") {
          triggerPlayerAttack();
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (joystick.active && e.pointerId === joystick.pointerId) {
        joystick.currentX = e.clientX;
        joystick.currentY = e.clientY;
      }
      if (touchAim.active && e.pointerId === touchAim.pointerId) {
        touchAim.x = e.clientX;
        touchAim.y = e.clientY;
        isMousing = false;

        if (isAdminActive && editorTool === "paint" && isMouseDown) {
          handleMouseInteraction(e.clientX, e.clientY);
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (joystick.active && e.pointerId === joystick.pointerId) joystick.active = false;
      if (touchAim.active && e.pointerId === touchAim.pointerId) {
        touchAim.active = false;
        isMouseDown = false;
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);

    // Real-time loop calculations
    const updateGameElements = () => {
      runWeatherCycle();

      // Regen resources
      if (player.mana < player.maxMana) {
        player.mana = Math.min(player.maxMana, player.mana + player.manaRegen);
        setPlayerMana(player.mana);
      }

      if (player.attackCooldown > 0) player.attackCooldown--;

      // Continuous shooting for Archer
      if (isMouseDown && player.charClass === "lucznik" && player.attackCooldown <= 0 && editorTool === "none") {
        triggerPlayerAttack();
      }

      // Check current tile constraints and apply water speed reduction
      const pTileX = Math.floor(player.worldX / TILE_SIZE);
      const pTileY = Math.floor(player.worldY / TILE_SIZE);
      const customKey = `${pTileX},${pTileY}`;
      
      const currentMapTile =
        mapSettingsRef.current.tiles[customKey] ||
        getNoiseTileAt(pTileX, pTileY, mapSettingsRef.current.width, mapSettingsRef.current.height);

      // Hero speed modifications including custom Admin Multiplier!
      const finalMaxSpeed = player.maxSpeed * mapSettingsRef.current.playerSpeedMultiplier;
      const speedModifier = currentMapTile === "WATER" ? 0.52 : 1.0;
      const maxSpeedLimit = finalMaxSpeed * speedModifier;
      const acceleration = player.acceleration * speedModifier;

      let ax = 0;
      let ay = 0;

      if (joystick.active) {
        const dx = joystick.currentX - joystick.startX;
        const dy = joystick.currentY - joystick.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const angle = Math.atan2(dy, dx);
          const intensity = Math.min(dist, joystick.maxRadius) / joystick.maxRadius;
          ax = Math.cos(angle) * acceleration * intensity;
          ay = Math.sin(angle) * acceleration * intensity;
        }
      } else {
        if (keys.w) ay -= acceleration;
        if (keys.s) ay += acceleration;
        if (keys.a) ax -= acceleration;
        if (keys.d) ax += acceleration;
      }

      player.vx += ax;
      player.vy += ay;
      player.vx *= player.friction;
      player.vy *= player.friction;

      const actSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
      if (actSpeed > maxSpeedLimit) {
        player.vx = (player.vx / actSpeed) * maxSpeedLimit;
        player.vy = (player.vy / actSpeed) * maxSpeedLimit;
      }

      // Border constraints (keep inside the grid dynamically)
      player.worldX = Math.max(16, Math.min(mapSettingsRef.current.width * TILE_SIZE - 16, player.worldX + player.vx));
      player.worldY = Math.max(16, Math.min(mapSettingsRef.current.height * TILE_SIZE - 16, player.worldY + player.vy));

      // Projectiles target angle
      let targetScreenX = screenCenterX;
      let targetScreenY = screenCenterY;
      if (touchAim.active) {
        targetScreenX = touchAim.x;
        targetScreenY = touchAim.y;
      } else if (isMousing) {
        targetScreenX = mouse.x;
        targetScreenY = mouse.y;
      }

      const diffX = targetScreenX - screenCenterX;
      const diffY = targetScreenY - screenCenterY;
      if (Math.abs(diffX) > 1 || Math.abs(diffY) > 1) {
        player.angle = Math.atan2(diffY, diffX);
      }

      // Update projectiles
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.worldX += b.vx;
        b.worldY += b.vy;
        b.life--;
        if (b.type === "energy_ball") b.animFrame++;

        if (b.life <= 0) {
          bullets.splice(i, 1);
        }
      }

      for (let i = visualEffects.length - 1; i >= 0; i--) {
        visualEffects[i].life--;
        if (visualEffects[i].life <= 0) visualEffects.splice(i, 1);
      }

      // Update monster projectiles
      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const eb = enemyBullets[i];
        eb.worldX += eb.vx;
        eb.worldY += eb.vy;
        eb.life--;

        const edx = player.worldX - eb.worldX;
        const edy = player.worldY - eb.worldY;
        if (Math.sqrt(edx * edx + edy * edy) < player.radius + eb.radius) {
          // Monster damage includes Admin multiplier strength adjustments!
          const scaledDmg = Math.ceil(12 * mapSettingsRef.current.monsterStrengthMultiplier);
          player.hp = Math.max(0, player.hp - scaledDmg);
          setPlayerHp(player.hp);
          triggerCameraShake(10, 3.5);
          enemyBullets.splice(i, 1);
          continue;
        }

        if (eb.life <= 0) enemyBullets.splice(i, 1);
      }

      // Fishes random moves
      fishes.forEach((f) => {
        f.timeOffset += 0.02;
        f.angle += Math.sin(f.timeOffset) * 0.1;
        f.worldX += Math.cos(f.angle) * f.speed;
        f.worldY += Math.sin(f.angle) * f.speed;

        if (Math.abs(f.worldX - player.worldX) > 1500 || Math.abs(f.worldY - player.worldY) > 1500) {
          f.worldX = player.worldX + (Math.random() - 0.5) * 1500;
          f.worldY = player.worldY + (Math.random() - 0.5) * 1500;
        }
      });

      // Loots magnet/pickups
      for (let i = loots.length - 1; i >= 0; i--) {
        const l = loots[i];
        const ldx = player.worldX - l.worldX;
        const ldy = player.worldY - l.worldY;
        const lDist = Math.sqrt(ldx * ldx + ldy * ldy);

        if (lDist < player.radius + 18) {
          player.hp = Math.min(player.maxHp, player.hp + 20);
          setPlayerHp(player.hp);
          loots.splice(i, 1);
        }
      }

      // Wildlife mechanics
      for (let i = animals.length - 1; i >= 0; i--) {
        const a = animals[i];
        const adx = player.worldX - a.worldX;
        const ady = player.worldY - a.worldY;
        const dist = Math.sqrt(adx * adx + ady * ady);

        if (a.behavior === "scared") {
          if (dist < 180) {
            const runAngle = Math.atan2(ady, adx) + Math.PI;
            a.worldX += Math.cos(runAngle) * a.speed;
            a.worldY += Math.sin(runAngle) * a.speed;
          } else {
            a.worldX += (Math.random() - 0.5) * 0.5;
            a.worldY += (Math.random() - 0.5) * 0.5;
          }
        } else if (a.behavior === "aggressive") {
          if (dist < a.vision) {
            const attackAngle = Math.atan2(ady, adx);
            a.worldX += Math.cos(attackAngle) * a.speed;
            a.worldY += Math.sin(attackAngle) * a.speed;

            if (dist < a.radius + player.radius) {
              const wildlifeDmg = Math.ceil(a.damage * mapSettingsRef.current.monsterStrengthMultiplier);
              player.hp = Math.max(0, player.hp - wildlifeDmg);
              setPlayerHp(player.hp);
            }
          } else {
            a.worldX += (Math.random() - 0.5) * 0.3;
            a.worldY += (Math.random() - 0.5) * 0.3;
          }
        } else if (a.behavior === "flying") {
          const flyAngle = Math.sin(Date.now() * 0.001 + i) * 0.5;
          a.worldX += Math.cos(flyAngle) * a.speed;
          a.worldY += Math.sin(flyAngle) * a.speed;
        }

        // Clip hit on animal
        for (let j = bullets.length - 1; j >= 0; j--) {
          const b = bullets[j];
          const bdx = b.worldX - a.worldX;
          const bdy = b.worldY - a.worldY;
          if (Math.sqrt(bdx * bdx + bdy * bdy) < a.radius + b.radius) {
            a.hp -= b.damage;
            bullets.splice(j, 1);
            if (a.hp <= 0) {
              loots.push({ worldX: a.worldX, worldY: a.worldY, pulse: 0 });
              animals.splice(i, 1);
              break;
            }
          }
        }

        if (dist > 2000) animals.splice(i, 1);
      }

      // Monsters simulation Loop
      let bossAlive = false;

      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];

        if (e.type === "boss") {
          bossAlive = true;
          setBossHpPercentage((e.hp / e.maxHp) * 100);
        }

        const edx = player.worldX - e.worldX;
        const edy = player.worldY - e.worldY;
        const distToPlayer = Math.sqrt(edx * edx + edy * edy);

        // Apply Biome water speed penalty for monsters
        const eTileX = Math.floor(e.worldX / TILE_SIZE);
        const eTileY = Math.floor(e.worldY / TILE_SIZE);
        const biomeKey = `${eTileX},${eTileY}`;
        
        const estTile =
          mapSettingsRef.current.tiles[biomeKey] ||
          getNoiseTileAt(eTileX, eTileY, mapSettingsRef.current.width, mapSettingsRef.current.height);

        let finalEnemySpeed = e.speed;
        if (estTile === "WATER" && e.type !== "stalker") {
          finalEnemySpeed *= 0.52;
        }

        // Apply aggressiveness multiplier set by Admin Kontrium to their moving speeds!
        finalEnemySpeed *= mapSettingsRef.current.monsterAggressionMultiplier;

        // Apply Shaman rage speed buffs if applicable
        finalEnemySpeed *= e.rageMode || 1.0;

        // Scale monster's alert/vision metrics with aggressiveness multiplier!
        const scaledVision = e.visionRadius * mapSettingsRef.current.monsterAggressionMultiplier;
        const scaledLoseTarget = e.loseTargetRadius * mapSettingsRef.current.monsterAggressionMultiplier;

        if (e.state === "calm") {
          e.shakeX = 0;
          e.shakeY = 0;
          e.walkTimer--;

          if (e.walkTimer <= 0) {
            e.walkTimer = 160 + Math.random() * 200;
            if (Math.random() < 0.6) {
              e.isWalking = true;
              const randAngle = Math.random() * Math.PI * 2;
              const randDist = 60 + Math.random() * 120;
              e.targetWalkX = e.worldX + Math.cos(randAngle) * randDist;
              e.targetWalkY = e.worldY + Math.sin(randAngle) * randDist;
            } else {
              e.isWalking = false;
            }
          }

          if (e.isWalking) {
            const tdx = e.targetWalkX - e.worldX;
            const tdy = e.targetWalkY - e.worldY;
            const tDist = Math.sqrt(tdx * tdx + tdy * tdy);
            if (tDist > 4) {
              e.worldX += (tdx / tDist) * (finalEnemySpeed * 0.45);
              e.worldY += (tdy / tDist) * (finalEnemySpeed * 0.45);
            } else {
              e.isWalking = false;
            }
          }

          if (distToPlayer < scaledVision) {
            e.state = "nervous";
          }
        } else if (e.state === "nervous") {
          e.shakeX = (Math.random() - 0.5) * 6;
          e.shakeY = (Math.random() - 0.5) * 6;
          e.alertProgress += 1.6;

          if (e.alertProgress >= 100) {
            e.state = "aggressive";
            e.shakeX = 0;
            e.shakeY = 0;
            alertNearbyEnemies(e);
          }

          if (distToPlayer > scaledVision + 30) {
            e.alertProgress -= 2.2;
            if (e.alertProgress <= 0) {
              e.alertProgress = 0;
              e.state = "calm";
            }
          }
        } else if (e.state === "aggressive") {
          e.dynamicTimer += 0.055;
          const waveOffset = Math.sin(e.dynamicTimer + e.aiSeed) * 1.55;
          const approachAngle = Math.atan2(edy, edx);

          if (e.type === "boss") {
            e.bossTimer++;
            if (e.bossActionState === "none" && e.bossTimer > 200) {
              e.bossActionState = "preparing";
              e.bossTimer = 0;
            }

            if (e.bossActionState === "preparing") {
              e.shakeX = (Math.random() - 0.5) * 12;
              e.shakeY = (Math.random() - 0.5) * 12;
              if (e.bossTimer > 55) {
                e.bossActionState = "charging";
                e.bossTimer = 0;
                const chargeAngle = Math.atan2(player.worldY - e.worldY, player.worldX - e.worldX);
                e.chargeVx = Math.cos(chargeAngle) * 13.5;
                e.chargeVy = Math.sin(chargeAngle) * 13.5;
                triggerCameraShake(25, 9);
              }
            } else if (e.bossActionState === "charging") {
              e.worldX += e.chargeVx;
              e.worldY += e.chargeVy;
              if (e.bossTimer > 35) {
                e.bossActionState = "none";
                e.bossTimer = 0;
                e.shakeX = 0;
                e.shakeY = 0;
              }
            } else {
              if (distToPlayer > 5) {
                e.worldX += Math.cos(approachAngle + waveOffset * 0.18) * finalEnemySpeed;
                e.worldY += Math.sin(approachAngle + waveOffset * 0.18) * finalEnemySpeed;
              }
            }
          } else if (e.type === "ranger") {
            const orbitAngle = approachAngle + Math.PI / 2 + waveOffset * 0.12;

            if (distToPlayer > 250) {
              e.worldX += Math.cos(approachAngle) * finalEnemySpeed;
              e.worldY += Math.sin(approachAngle) * finalEnemySpeed;
            } else if (distToPlayer < 180) {
              e.worldX -= Math.cos(approachAngle) * finalEnemySpeed;
              e.worldY -= Math.sin(approachAngle) * finalEnemySpeed;
            } else {
              e.worldX += Math.cos(orbitAngle) * (finalEnemySpeed * 0.85);
              e.worldY += Math.sin(orbitAngle) * (finalEnemySpeed * 0.85);
            }

            e.shootCooldown++;

            if (e.shootCooldown > 55) {
              e.shootCooldown = 0;
              const shootAngle = Math.atan2(player.worldY - e.worldY, player.worldX - e.worldX);
              enemyBullets.push({
                worldX: e.worldX,
                worldY: e.worldY,
                vx: Math.cos(shootAngle - 0.12) * 6.5,
                vy: Math.sin(shootAngle - 0.12) * 6.5,
                radius: 4,
                life: 80
              });
              enemyBullets.push({
                worldX: e.worldX,
                worldY: e.worldY,
                vx: Math.cos(shootAngle + 0.12) * 6.5,
                vy: Math.sin(shootAngle + 0.12) * 6.5,
                radius: 4,
                life: 80
              });
            }
          } else if (e.type === "stalker") {
            e.teleportCooldown++;

            if (e.teleportCooldown > 135 && distToPlayer > 130) {
              e.teleportCooldown = 0;
              const telAngle = approachAngle + (Math.random() > 0.5 ? 0.65 : -0.65);
              e.worldX = player.worldX - Math.cos(telAngle) * 105;
              e.worldY = player.worldY - Math.sin(telAngle) * 105;
              visualEffects.push({
                type: "slash",
                worldX: e.worldX,
                worldY: e.worldY,
                angle: telAngle,
                side: 1,
                life: 6,
                maxLife: 6
              });
            } else {
              e.worldX += Math.cos(approachAngle + waveOffset * 0.35) * finalEnemySpeed;
              e.worldY += Math.sin(approachAngle + waveOffset * 0.35) * finalEnemySpeed;
            }
          } else if (e.type === "shaman") {
            if (distToPlayer < 230) {
              e.worldX -= Math.cos(approachAngle) * finalEnemySpeed;
              e.worldY -= Math.sin(approachAngle) * finalEnemySpeed;
            } else if (distToPlayer > 330) {
              e.worldX += Math.cos(approachAngle) * finalEnemySpeed;
              e.worldY += Math.sin(approachAngle) * finalEnemySpeed;
            } else {
              e.worldX += Math.cos(approachAngle + Math.PI / 2) * finalEnemySpeed;
              e.worldY += Math.sin(approachAngle + Math.PI / 2) * finalEnemySpeed;
            }

            e.healCooldown++;

            if (e.healCooldown > 85) {
              e.healCooldown = 0;
              enemies.forEach((other) => {
                if (other !== e && Math.abs(other.worldX - e.worldX) < 220 && Math.abs(other.worldY - e.worldY) < 220) {
                  other.hp = Math.min(other.maxHp, other.hp + 30);
                  other.rageMode = 1.35; // Speed multiplier buff
                }
              });
            }
          } else {
            // Tank & Classic
            if (distToPlayer > 5) {
              const xtraDash =
                e.type === "runner" && distToPlayer < 100 && Math.floor(Date.now() / 400) % 2 === 0 ? 1.55 : 1.0;
              e.worldX += Math.cos(approachAngle + waveOffset * 0.28) * finalEnemySpeed * xtraDash;
              e.worldY += Math.sin(approachAngle + waveOffset * 0.28) * finalEnemySpeed * xtraDash;
            }
          }

          // Lose focus checking
          if (distToPlayer > scaledLoseTarget && e.type !== "boss") {
            e.state = "calm";
            e.alertProgress = 0;
            e.rageMode = 1.0;
          }

          // Player collision hit
          if (distToPlayer < e.radius + player.radius) {
            // Apply scale strength set by Admin Kontrium to their physical strike damages!
            const hitDamage = Math.ceil(e.damage * mapSettingsRef.current.monsterStrengthMultiplier);
            player.hp = Math.max(0, player.hp - hitDamage);
            setPlayerHp(player.hp);
            triggerCameraShake(10, 3);

            if (player.hp <= 0) {
              alert(`Koniec Gry! Twój osiągnięty poziom: ${player.level}. Wybierz klasę i zagraj jeszcze raz!`);
              // Reset values
              player.hp = 100;
              player.level = 1;
              player.xp = 0;
              player.xpNeeded = 100;
              player.skillPoints = 0;
              setScore(0);
              statsRef.current.score = 0;
              enemies.length = 0;
              bullets.length = 0;
              enemyBullets.length = 0;
              setBossUiActive(false);

              setPlayerHp(player.hp);
              setPlayerLvl(player.level);
              setPlayerXp(player.xp);
              setPlayerXpNeeded(player.xpNeeded);
              onGameStatsUpdated(1, 0);
            }
          }
        }

        // Projectiles collision detection on this monster
        for (let j = bullets.length - 1; j >= 0; j--) {
          const b = bullets[j];
          const bdx = b.worldX - e.worldX;
          const bdy = b.worldY - e.worldY;

          if (Math.sqrt(bdx * bdx + bdy * bdy) < e.radius + b.radius) {
            e.hp = Math.max(0, e.hp - b.damage);
            bullets.splice(j, 1);

            if (e.state !== "aggressive") {
              e.state = "aggressive";
              e.alertProgress = 100;
            }
            alertNearbyEnemies(e);

            if (e.hp <= 0) {
              if (e.type === "boss") setBossUiActive(false);
              enemies.splice(i, 1);
              handleGainScore(e.xpReward);
              break;
            }
          }
        }
      }

      setBossUiActive(bossAlive);

      if (camShakeTime > 0) camShakeTime--;
    };

    // Rendering Canvas components
    const renderWorkspace = () => {
      let currentShakeX = 0;
      let currentShakeY = 0;

      if (camShakeTime > 0) {
        currentShakeX = (Math.random() - 0.5) * camShakeIntensity;
        currentShakeY = (Math.random() - 0.5) * camShakeIntensity;
      }

      // Backdrop fill
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Camera coordinates offset
      const cameraX = player.worldX - screenCenterX + currentShakeX;
      const cameraY = player.worldY - screenCenterY + currentShakeY;

      // Determine viewport ranges
      const startTileX = Math.floor(cameraX / TILE_SIZE);
      const endTileX = Math.ceil((cameraX + canvas.width) / TILE_SIZE);
      const startTileY = Math.floor(cameraY / TILE_SIZE);
      const endTileY = Math.ceil((cameraY + canvas.height) / TILE_SIZE);

      // Draw custom & procedural tiles inside viewport
      for (let y = startTileY; y <= endTileY; y++) {
        for (let x = startTileX; x <= endTileX; x++) {
          if (x < 0 || x >= mapSettingsRef.current.width || y < 0 || y >= mapSettingsRef.current.height) {
            // Out of bounds background
            continue;
          }

          const customKey = `${x},${y}`;
          const currentMapTile =
            mapSettingsRef.current.tiles[customKey] ||
            getNoiseTileAt(x, y, mapSettingsRef.current.width, mapSettingsRef.current.height);

          const tileObj = BIOMES[currentMapTile];

          const rx = Math.round(x * TILE_SIZE - cameraX);
          const ry = Math.round(y * TILE_SIZE - cameraY);

          // Render gradients
          const grad = ctx.createRadialGradient(rx + 32, ry + 32, 6, rx + 32, ry + 32, 45);
          grad.addColorStop(0, tileObj.c1);
          grad.addColorStop(1, tileObj.c2);
          ctx.fillStyle = grad;
          ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);

          // Procedural elements rendering
          const pSeed = MathNoise(x, y);

          if (currentMapTile === "WATER" && pSeed < 0.12) {
            ctx.fillStyle = "#1e8449";
            ctx.beginPath();
            ctx.arc(rx + 32 + pSeed * 20, ry + 32 - pSeed * 20, 8, 0, Math.PI * 1.7);
            ctx.fill();
          } else if ((currentMapTile === "GRASS" || currentMapTile === "RAINFOREST") && pSeed < 0.25) {
            if (pSeed < 0.08) {
              const color = pSeed < 0.03 ? "#ff3366" : pSeed < 0.06 ? "#33ccff" : "#ffcc00";
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(rx + 20 + pSeed * 30, ry + 20 + pSeed * 30, 4, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.strokeStyle = "#1b5e20";
              ctx.lineWidth = 2;
              ctx.beginPath();
              const tx = rx + 15 + pSeed * 30;
              const ty = ry + 40;
              ctx.moveTo(tx, ty);
              ctx.lineTo(tx - 3, ty - 12);
              ctx.moveTo(tx, ty);
              ctx.lineTo(tx, ty - 15);
              ctx.moveTo(tx, ty);
              ctx.lineTo(tx + 4, ty - 10);
              ctx.stroke();
            }
          } else if ((currentMapTile === "FOREST" || currentMapTile === "MOUNTAIN") && pSeed < 0.18) {
            const ox = rx + 32;
            const oy = ry + 32;
            if (pSeed < 0.09) {
              ctx.fillStyle = "rgba(0,0,0,0.3)";
              ctx.beginPath();
              ctx.ellipse(ox + 5, oy + 5, 12, 6, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = "#5d4037";
              ctx.beginPath();
              ctx.arc(ox, oy, 10, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.fillStyle = "rgba(0,0,0,0.3)";
              ctx.beginPath();
              ctx.ellipse(ox + 4, oy + 4, 14, 8, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = "#9e9e9e";
              ctx.beginPath();
              ctx.arc(ox, oy, 9, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // Optional: Draw subtle grid lines if Admin is active so they can edit tiles perfectly!
          if (isAdminActive) {
            ctx.strokeStyle = "rgba(0, 255, 204, 0.07)";
            ctx.lineWidth = 1;
            ctx.strokeRect(rx, ry, TILE_SIZE, TILE_SIZE);
          }
        }
      }

      // Render wildlife fishes
      fishes.forEach((f) => {
        const fTileX = Math.floor(f.worldX / TILE_SIZE);
        const fTileY = Math.floor(f.worldY / TILE_SIZE);
        const key = `${fTileX},${fTileY}`;
        const currentTile =
          mapSettingsRef.current.tiles[key] ||
          getNoiseTileAt(fTileX, fTileY, mapSettingsRef.current.width, mapSettingsRef.current.height);

        if (currentTile === "WATER") {
          ctx.save();
          ctx.translate(Math.round(f.worldX - cameraX), Math.round(f.worldY - cameraY));
          ctx.rotate(f.angle);
          ctx.fillStyle = "#ff7675";
          ctx.beginPath();
          ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      // Render spawnpoints explicitly ONLY for Admin's eyes!
      if (isAdminActive) {
        mapSettingsRef.current.spawns.forEach((s) => {
          const sx = Math.round(s.x * TILE_SIZE + 32 - cameraX);
          const sy = Math.round(s.y * TILE_SIZE + 32 - cameraY);
          
          // Draw spawn flag or circle
          ctx.save();
          ctx.fillStyle = "rgba(124, 58, 237, 0.25)";
          ctx.strokeStyle = "#8b5cf6";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx, sy, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 9px monospace";
          ctx.shadowBlur = 4;
          ctx.shadowColor = "#000000";
          ctx.textAlign = "center";
          ctx.fillText(s.monsterType.toUpperCase(), sx, sy - 4);
          ctx.fillText(`(${s.x},${s.y})`, sx, sy + 6);
          ctx.restore();
        });
      }

      // Render loot items on ground
      loots.forEach((l) => {
        l.pulse += 0.08;
        const sizeMod = Math.sin(l.pulse) * 1.8;
        const lx = Math.round(l.worldX - cameraX);
        const ly = Math.round(l.worldY - cameraY);

        ctx.fillStyle = "#d63031";
        ctx.beginPath();
        ctx.arc(lx, ly, 8 + sizeMod, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(lx - 2, ly - 2, 4, 9);
      });

      // Render peaceful animals
      animals.forEach((a) => {
        let ax = Math.round(a.worldX - cameraX);
        let ay = Math.round(a.worldY - cameraY);
        if (a.behavior === "flying") {
          ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
          ctx.beginPath();
          ctx.arc(ax, ay + a.heightOffset, a.radius * 0.8, 0, Math.PI * 2);
          ctx.fill();
          ay -= a.heightOffset;
        } else {
          ctx.fillStyle = "rgba(0,0,0,0.15)";
          ctx.beginPath();
          ctx.ellipse(ax + 3, ay + 3, a.radius, a.radius * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = a.color;
        ctx.beginPath();
        ctx.arc(ax, ay, a.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#2d3436";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Render player energy projectives
      bullets.forEach((b) => {
        const bx = Math.round(b.worldX - cameraX);
        const by = Math.round(b.worldY - cameraY);

        if (b.type === "energy_ball") {
          ctx.save();
          ctx.shadowColor = "#00d2ff";
          ctx.shadowBlur = 15;

          ctx.strokeStyle = "rgba(51, 204, 255, 0.65)";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(bx, by, b.radius * 2.2, b.radius * 0.8, b.animFrame * 0.15, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.ellipse(bx, by, b.radius * 0.8, b.radius * 2.2, -b.animFrame * 0.2, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const len = b.radius * (1.2 + Math.random() * 0.8);
            const ang = (Math.PI / 2) * i + (Math.random() - 0.5);
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + Math.cos(ang) * len, by + Math.sin(ang) * len);
          }
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(bx, by, b.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (b.type === "arrow") {
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(b.angle);
          ctx.strokeStyle = "#f39c12";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-10, 0);
          ctx.lineTo(8, 0);
          ctx.stroke();
          ctx.fillStyle = "#ecf0f1";
          ctx.beginPath();
          ctx.moveTo(-10, -3.5);
          ctx.lineTo(-14, -5.5);
          ctx.lineTo(-11.5, 0);
          ctx.lineTo(-14, 5.5);
          ctx.lineTo(-10, 3.5);
          ctx.fill();
          ctx.restore();
        }
      });

      // Play visual sweep effects
      visualEffects.forEach((fx) => {
        if (fx.type === "slash") {
          ctx.save();
          ctx.translate(Math.round(fx.worldX - cameraX), Math.round(fx.worldY - cameraY));
          ctx.rotate(fx.angle);

          const alpha = fx.life / fx.maxLife;
          ctx.strokeStyle = `rgba(255, 51, 51, ${alpha})`;
          ctx.lineWidth = 5;
          ctx.shadowBlur = 10;
          ctx.shadowColor = "#ff0000";
          ctx.beginPath();
          ctx.arc(15, 0, 45, -Math.PI / 3, Math.PI / 3, false);
          ctx.stroke();
          ctx.restore();
        }
      });

      // Play enemy projectiles
      enemyBullets.forEach((eb) => {
        ctx.save();
        ctx.shadowColor = "#ff00ff";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(Math.round(eb.worldX - cameraX), Math.round(eb.worldY - cameraY), eb.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#df00ff";
        ctx.fill();
        ctx.restore();
      });

      // Draw aggressive & passive monsters
      enemies.forEach((e) => {
        const scrX = Math.round(e.worldX - cameraX + e.shakeX);
        const scrY = Math.round(e.worldY - cameraY + e.shakeY);
        ctx.save();

        // Stalker stealth opacity
        if (e.type === "stalker" && e.state === "aggressive") {
          ctx.globalAlpha = 0.35;
        }

        ctx.beginPath();
        ctx.arc(scrX, scrY, e.radius, 0, Math.PI * 2);
        if (e.type === "boss") {
          if (e.bossActionState === "preparing" && Math.floor(Date.now() / 70) % 2 === 0) {
            ctx.fillStyle = "#ff3300";
          } else {
            ctx.fillStyle = "#2980b9";
          }
        } else {
          ctx.fillStyle = e.state === "aggressive" ? e.agroColor : e.color;
        }

        ctx.fill();
        ctx.strokeStyle = "#111";
        ctx.lineWidth = e.type === "boss" ? 4 : 2;
        ctx.stroke();

        // Rage speed buff halo from shaman spell
        if (e.rageMode > 1.0) {
          ctx.strokeStyle = "#e67e22";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(scrX, scrY, e.radius + 5, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();

        // Enemy health indicators
        const barW = e.radius * 2.2;
        const barH = 4.5;
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(scrX - barW / 2, scrY - e.radius - 12, barW, barH);
        ctx.fillStyle = "#00ffcc";
        ctx.fillRect(scrX - barW / 2, scrY - e.radius - 12, barW * (e.hp / e.maxHp), barH);
      });

      // Draw Player Hero (pinned to center representing camera target)
      ctx.save();
      ctx.translate(screenCenterX, screenCenterY);

      ctx.lineWidth = 2;
      if (player.charClass === "mag") {
        ctx.strokeStyle = "rgba(51,204,255,0.4)";
        ctx.beginPath();
        ctx.arc(0, 0, player.radius + 6 + Math.sin(Date.now() * 0.01) * 2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (player.charClass === "wojownik") {
        ctx.strokeStyle = "rgba(255,51,51,0.4)";
        ctx.beginPath();
        ctx.arc(0, 0, player.radius + 6 + Math.cos(Date.now() * 0.01) * 2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (player.charClass === "lucznik") {
        ctx.strokeStyle = "rgba(46,204,113,0.4)";
        ctx.beginPath();
        ctx.arc(0, 0, player.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.rotate(player.angle);

      ctx.beginPath();
      ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
      if (player.charClass === "mag") ctx.fillStyle = "#00d2ff";
      else if (player.charClass === "wojownik") ctx.fillStyle = "#ff3333";
      else if (player.charClass === "lucznik") ctx.fillStyle = "#2ecc71";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Show specific weaponry models dynamically
      if (player.charClass === "mag") {
        ctx.fillStyle = "#8e44ad";
        ctx.fillRect(8, -4, player.radius + 10, 6);
        ctx.fillStyle = "#33ccff";
        ctx.beginPath();
        ctx.arc(player.radius + 12, -1, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (player.charClass === "wojownik") {
        ctx.fillStyle = "#7f8c8d";
        ctx.fillRect(5, -3, player.radius + 20, 6);
        ctx.fillStyle = "#f1c40f";
        ctx.fillRect(5, -5, 3, 10);
      } else if (player.charClass === "lucznik") {
        ctx.strokeStyle = "#d35400";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.radius - 2, 0, 14, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        ctx.strokeStyle = "#eee";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(player.radius - 2, -14);
        ctx.lineTo(player.radius - 2, 14);
        ctx.stroke();
      }

      ctx.restore();

      // Ambient time overlay lighting
      let ambientIntensity = 0;
      if (gameTime < 400 || gameTime > 2000) ambientIntensity = 0.72;
      else if (gameTime >= 400 && gameTime < 700) {
        ambientIntensity = 0.72 - ((gameTime - 400) / 300) * 0.72;
      } else if (gameTime >= 1700 && gameTime <= 2000) {
        ambientIntensity = ((gameTime - 1700) / 300) * 0.72;
      }
      if (currentWeather === "fog") ambientIntensity = Math.max(ambientIntensity, 0.45);

      if (ambientIntensity > 0 && thunderFlash <= 0) {
        ctx.save();
        const lightGrad = ctx.createRadialGradient(screenCenterX, screenCenterY, 30, screenCenterX, screenCenterY, 180);
        lightGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
        lightGrad.addColorStop(1, `rgba(10, 15, 30, ${ambientIntensity})`);
        ctx.fillStyle = lightGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      if (thunderFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${thunderFlash * 0.12})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Render weather elements overlays
      ctx.save();
      particles.forEach((p) => {
        if (p.type === "rain") {
          ctx.strokeStyle = "rgba(174, 214, 241, 0.52)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + 1, p.y + p.len);
          ctx.stroke();
        } else if (p.type === "snow") {
          ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.len / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();

      // Render joysticks
      if (joystick.active) {
        ctx.beginPath();
        ctx.arc(joystick.startX, joystick.startY, joystick.maxRadius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        const dx = joystick.currentX - joystick.startX;
        const dy = joystick.currentY - joystick.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let knobX = joystick.currentX;
        let knobY = joystick.currentY;

        if (dist > joystick.maxRadius) {
          const angle = Math.atan2(dy, dx);
          knobX = joystick.startX + Math.cos(angle) * joystick.maxRadius;
          knobY = joystick.startY + Math.sin(angle) * joystick.maxRadius;
        }

        ctx.beginPath();
        ctx.arc(knobX, knobY, 26, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 255, 204, 0.55)";
        ctx.fill();
        ctx.stroke();
      }

      // Render minimap
      ctx.save();
      const miniRadius = 65;
      const miniCenterX = canvas.width - miniRadius - 20;
      const miniCenterY = canvas.height - miniRadius - 20;

      ctx.beginPath();
      ctx.arc(miniCenterX, miniCenterY, miniRadius, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = "rgba(20, 20, 20, 0.88)";
      ctx.fillRect(miniCenterX - miniRadius, miniCenterY - miniRadius, miniRadius * 2, miniRadius * 2);

      enemies.forEach((e) => {
        const mdx = (e.worldX - player.worldX) / 12;
        const mdy = (e.worldY - player.worldY) / 12;
        if (mdx * mdx + mdy * mdy < miniRadius * miniRadius) {
          ctx.beginPath();
          ctx.arc(miniCenterX + mdx, miniCenterY + mdy, e.type === "boss" ? 4.5 : 2.5, 0, Math.PI * 2);
          ctx.fillStyle = e.type === "boss" ? "#2980b9" : "#ff3333";
          ctx.fill();
        }
      });
      ctx.restore();

      ctx.beginPath();
      ctx.arc(miniCenterX, miniCenterY, miniRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 255, 204, 0.35)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    };

    // Spawn classic & ranger/stalker mobs continuously at admin defined amounts!
    const spawnGameEnemy = () => {
      if (!isRunning || chatOverlayActive() || enemies.length >= mapSettingsRef.current.maxMonstersCount) return;

      const angle = Math.random() * Math.PI * 2;
      const distance = Math.max(canvas.width, canvas.height) / 2 + 180;
      const ex = player.worldX + Math.cos(angle) * distance;
      const ey = player.worldY + Math.sin(angle) * distance;

      // Spawn Boss periodically
      if (statsRef.current.score > 0 && statsRef.current.score % 15 === 0 && !enemies.some((e) => e.type === "boss")) {
        enemies.push({
          type: "boss",
          name: "SIERADZKI NISZCZYCIEL",
          worldX: ex,
          worldY: ey,
          radius: 36,
          speed: 2.1,
          hp: 950,
          maxHp: 950,
          xpReward: 250,
          damage: 2.2,
          state: "calm",
          alertProgress: 0,
          shakeX: 0,
          shakeY: 0,
          visionRadius: 400,
          loseTargetRadius: 700,
          walkTimer: 0,
          targetWalkX: ex,
          targetWalkY: ey,
          isWalking: false,
          bossTimer: 0,
          bossActionState: "none",
          chargeVx: 0,
          chargeVy: 0,
          aiSeed: Math.random() * 100
        });
        return;
      }

      // Check configured custom spawnpoints from Admin settings!
      // If spawns are configured, we randomly choose to spawn off one of those spawn positions or spawn procedurally!
      let spawnX = ex;
      let spawnY = ey;
      let forcedType: string | null = null;

      if (mapSettingsRef.current.spawns.length > 0 && Math.random() < 0.6) {
        const randSpawn = mapSettingsRef.current.spawns[Math.floor(Math.random() * mapSettingsRef.current.spawns.length)];
        // Convert tile coordinate to world coordinate
        spawnX = randSpawn.x * TILE_SIZE + 32;
        spawnY = randSpawn.y * TILE_SIZE + 32;
        forcedType = randSpawn.monsterType;
      }

      const typesPool = ["classic"];
      if (statsRef.current.score >= 3) typesPool.push("runner");
      if (statsRef.current.score >= 6) typesPool.push("ranger", "stalker");
      if (statsRef.current.score >= 10) typesPool.push("tank", "shaman");

      const chosenType = forcedType || typesPool[Math.floor(Math.random() * typesPool.length)];

      const enemyData = {
        type: chosenType,
        worldX: spawnX,
        worldY: spawnY,
        state: "calm",
        alertProgress: 0,
        shakeX: 0,
        shakeY: 0,
        walkTimer: Math.random() * 120,
        targetWalkX: spawnX,
        targetWalkY: spawnY,
        isWalking: false,
        aiSeed: Math.random() * 500,
        dynamicTimer: 0,
        rageMode: 1.0,
        radius: 16,
        speed: 2.4,
        hp: 120,
        maxHp: 120,
        xpReward: 32,
        color: "#aa3333",
        agroColor: "#ff1111",
        visionRadius: 260,
        loseTargetRadius: 450,
        damage: 0.65,
        shootCooldown: 0,
        teleportCooldown: 0,
        healCooldown: 0
      };

      if (chosenType === "runner") {
        Object.assign(enemyData, { radius: 14, speed: 4.3, hp: 80, maxHp: 80, xpReward: 40, color: "#ccb11a", agroColor: "#ffff00", visionRadius: 200, loseTargetRadius: 400, damage: 0.5 });
      } else if (chosenType === "ranger") {
        Object.assign(enemyData, { radius: 16, speed: 2.2, hp: 105, maxHp: 105, xpReward: 50, color: "#8e44ad", agroColor: "#d2527f", visionRadius: 310, loseTargetRadius: 500, damage: 0.4 });
      } else if (chosenType === "tank") {
        Object.assign(enemyData, { radius: 25, speed: 1.3, hp: 350, maxHp: 350, xpReward: 90, color: "#27ae60", agroColor: "#2ecc71", visionRadius: 230, loseTargetRadius: 400, damage: 1.35 });
      } else if (chosenType === "stalker") {
        Object.assign(enemyData, { radius: 15, speed: 2.8, hp: 100, maxHp: 100, xpReward: 55, color: "#556270", agroColor: "#4ecdc4", visionRadius: 280, loseTargetRadius: 420, damage: 0.72 });
      } else if (chosenType === "shaman") {
        Object.assign(enemyData, { radius: 17, speed: 1.9, hp: 140, maxHp: 140, xpReward: 70, color: "#e67e22", agroColor: "#f1c40f", visionRadius: 280, loseTargetRadius: 440, damage: 0.3 });
      }

      enemies.push(enemyData);
    };

    const spawnWildAnimal = () => {
      if (!isRunning || chatOverlayActive() || animals.length >= 20) return;

      const angle = Math.random() * Math.PI * 2;
      const distance = Math.max(canvas.width, canvas.height) / 2 + 200;
      const ax = player.worldX + Math.cos(angle) * distance;
      const ay = player.worldY + Math.sin(angle) * distance;

      const behaviors = ["scared", "aggressive", "flying"];
      const bOption = behaviors[Math.floor(Math.random() * behaviors.length)];

      const animalData = {
        behavior: bOption,
        worldX: ax,
        worldY: ay,
        hp: 60,
        maxHp: 60,
        vx: 0,
        vy: 0,
        name: "Wildlife",
        radius: 12,
        speed: 3.5,
        color: "#d7ccc8",
        damage: 0.4,
        vision: 180,
        heightOffset: 40
      };

      if (bOption === "scared") {
        const scaredNames = ["Zając", "Jeleń", "Renifer"];
        Object.assign(animalData, { name: scaredNames[Math.floor(Math.random() * scaredNames.length)], radius: 13, speed: 3.6, color: "#d7ccc8" });
      } else if (bOption === "aggressive") {
        const violentNames = ["Wilk", "Hiena", "Niedźwiedź"];
        const nOption = violentNames[Math.floor(Math.random() * violentNames.length)];
        if (nOption === "Niedźwiedź") {
          Object.assign(animalData, { name: nOption, radius: 24, speed: 1.9, color: "#5d4037", hp: 180, maxHp: 180, damage: 1.25, vision: 210 });
        } else {
          Object.assign(animalData, { name: nOption, radius: 14, speed: 3.1, color: "#78909c", damage: 0.55, vision: 190 });
        }
      } else if (bOption === "flying") {
        const isNight = gameTime < 400 || gameTime > 2000;
        Object.assign(animalData, { name: isNight ? "Nietoperz" : "Ptak", radius: 10, speed: 2.6, color: isNight ? "#37474f" : "#64b5f6" });
      }

      animals.push(animalData);
    };

    const chatOverlayActive = () => {
      return document.getElementById("chatOverlay")?.style.display === "flex";
    };

    // Loops schedulers
    const enemySpawner = setInterval(spawnGameEnemy, 1000);
    const animalSpawner = setInterval(spawnWildAnimal, 2000);

    // Frame trigger
    const tick = () => {
      if (!isRunning) return;
      if (!chatOverlayActive()) {
        updateGameElements();
      }
      renderWorkspace();
      animFrameId = requestAnimationFrame(tick);
    };
    animFrameId = requestAnimationFrame(tick);

    // Cleanup callbacks
    return () => {
      isRunning = false;
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      clearInterval(enemySpawner);
      clearInterval(animalSpawner);

      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
    };
  }, [charClass, mapSettings, isAdminActive, editorTool, selectedBiome]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden block">
      {/* Canvas */}
      <canvas ref={canvasRef} className="block w-full h-full touch-none z-0" />

      {/* Visual top bar HUD info of game */}
      <div className="absolute top-4 left-4 z-10 bg-[#080A0E]/95 border border-white/5 rounded-xl p-4 min-w-[240px] shadow-2xl space-y-3 font-mono pointer-events-none md:pointer-events-auto select-none">
        <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
          <span className="text-white font-bold tracking-wider uppercase">KONTRIUM RPG HUD</span>
          <span className="bg-blue-600/10 border border-blue-500/20 text-blue-400 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase">
            Klasa: {charClass.toUpperCase()}
          </span>
        </div>

        {/* Level metrics */}
        <div className="flex justify-between items-center text-xs text-slate-300 uppercase">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Poziom:</span>
          <span className="text-blue-400 font-bold">{playerLvl}</span>
        </div>

        {/* HP bar container */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-500 uppercase tracking-widest font-bold">
            <span>Punkty Zdrowia</span>
            <span className="text-red-400 font-bold">
              {Math.ceil(playerHp)}/{playerMaxHp}
            </span>
          </div>
          <div className="w-full bg-[#050608] border border-white/5 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-red-500 h-full rounded-full transition-all duration-100"
              style={{ width: `${Math.max(0, (playerHp / playerMaxHp) * 100)}%` }}
            />
          </div>
        </div>

        {/* Mana bar container */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-500 uppercase tracking-widest font-bold">
            <span>MOC_MANA</span>
            <span className="text-blue-400 font-bold">
              {Math.ceil(playerMana)}/{playerMaxMana}
            </span>
          </div>
          <div className="w-full bg-[#050608] border border-white/5 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-75"
              style={{ width: `${Math.max(0, (playerMana / playerMaxMana) * 100)}%` }}
            />
          </div>
        </div>

        {/* XP meter bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-500 uppercase tracking-widest font-bold">
            <span>KONTRIUM_XP</span>
            <span className="text-emerald-400 font-bold">
              {playerXp}/{playerXpNeeded}
            </span>
          </div>
          <div className="w-full bg-[#050608] border border-white/5 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (playerXp / playerXpNeeded) * 100)}%` }}
            />
          </div>
        </div>

        {/* Weather type and custom parameters indicators */}
        <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-white/5 uppercase font-bold tracking-widest">
          <span>POGODA:</span>
          <span className="font-bold text-amber-500 tracking-wider font-mono">{currentWeather}</span>
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase font-bold tracking-widest">
          <span>POKONANI WROGOWIE:</span>
          <span className="font-bold text-white">{score}</span>
        </div>
      </div>

      {/* Real-time Boss HUD */}
      {bossUiActive && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-[50%] min-w-[280px] z-10 bg-black/90 border-2 border-red-500/80 rounded-xl p-3.5 text-center font-mono shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse select-none pointer-events-none">
          <div className="text-red-500 font-black tracking-wider text-xs uppercase mb-1.5">
            Mityczny Boss: SIERADZKI NISZCZYCIEL Swarms
          </div>
          <div className="w-full bg-gray-900 border border-red-500/30 h-3 rounded-md overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-amber-500 h-full" style={{ width: `${bossHpPercentage}%` }} />
          </div>
        </div>
      )}

      {/* Editor Active Brush Hint Overlay */}
      {isAdminActive && editorTool !== "none" && (
        <div className="absolute top-22 left-4 z-10 bg-amber-400/95 border border-amber-500 text-black font-semibold rounded-lg py-1.5 px-3 shadow text-[10px] flex items-center gap-1.5 pointer-events-none uppercase">
          <ShieldCheck className="w-4 h-4" />
          <span>
            {editorTool === "paint" ? `Tryb rysowania: ${selectedBiome}` : "KLIKNIJ ABY POSTAWIĆ SPAWNPOINT"}
          </span>
        </div>
      )}
    </div>
  );
}
