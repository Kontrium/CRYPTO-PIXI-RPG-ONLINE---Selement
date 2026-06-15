/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ShieldAlert, BookOpen, KeyRound, Swords, Compass } from "lucide-react";
import { ref, get, child } from "firebase/database";
import { db } from "../lib/firebase";

interface StartMenuProps {
  onClassSelected: (className: "mag" | "wojownik" | "lucznik") => void;
  onAdminUnlocked: (isAdmin: boolean) => void;
  isAdmin: boolean;
  currentUser: string | null;
}

export default function StartMenu({
  onClassSelected,
  onAdminUnlocked,
  isAdmin,
  currentUser
}: StartMenuProps) {
  const [showF10Dialog, setShowF10Dialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [checkingPassword, setCheckingPassword] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F10") {
        e.preventDefault();
        setShowF10Dialog((prev) => !prev);
        setErrorMsg("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleAdminVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      setErrorMsg("Podaj hasło!");
      return;
    }

    setCheckingPassword(true);
    setErrorMsg("");

    try {
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, "users/Kontrium"));
      
      let realPassword = "";
      if (snapshot.exists()) {
        const data = snapshot.val();
        realPassword = data.password || "";
      } else {
        // Fallback or initialization password if Kontrium doesn't exist yet
        realPassword = "KontriumPassword123";
      }

      if (adminPassword === realPassword) {
        onAdminUnlocked(true);
        setShowF10Dialog(false);
        setErrorMsg("");
        alert("Autoryzacja pomyślna! Panel administracyjny (F10) został aktywowany.");
      } else {
        setErrorMsg("Niepoprawne hasło dla konta 'Kontrium'!");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Błąd podczas weryfikacji hasła z bazy danych.");
    } finally {
      setCheckingPassword(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-radial from-[#080A0E] to-[#050608] flex flex-col justify-center items-center z-50 text-slate-300 p-6 overflow-y-auto font-sans">
      {/* Visual background pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: "radial-gradient(#334155 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

      <div className="text-center max-w-xl mb-8 relative">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight font-display drop-shadow-[0_0_12px_rgba(59,130,246,0.2)] uppercase">
          Kontrium <span className="text-blue-400">RPG</span>
        </h1>
        <p className="text-slate-400 mt-3 text-xs md:text-sm max-w-lg mx-auto leading-relaxed">
          Wstąp do magicznego i pasjonującego świata gry. Wybierz swoją rolę bojową i stań do zorganizowanej walki z mitycznymi bestiami świata Kontrium.
        </p>
        
        <div className="mt-4 inline-flex items-center gap-2 bg-[#0A0C10] border border-blue-500/20 px-4 py-1.5 rounded text-[10px] text-blue-400 font-mono tracking-wider uppercase">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Skrót klawiszowy: <strong className="font-semibold text-white bg-slate-800 px-1.5 py-0.5 rounded">F10</strong> wywołuje panel edycji administracyjnej</span>
        </div>
      </div>

      <div className="flex gap-6 max-w-5xl justify-center flex-wrap items-stretch">
        {/* MAG */}
        <div
          onClick={() => onClassSelected("mag")}
          className="group relative bg-[#080A0E] border border-white/5 hover:border-blue-500/50 hover:bg-blue-600/5 cursor-pointer p-6 rounded-2xl w-72 text-center transition-all duration-300 hover:-translate-y-2 flex flex-col justify-between shadow-lg"
        >
          <div>
            <div className="w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all">
              <Compass className="w-7 h-7 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white mt-4 group-hover:text-blue-300 font-display uppercase tracking-wider">MAG</h2>
            <p className="text-[10px] text-blue-400/80 italic mt-1 font-mono uppercase tracking-widest">Mistrz wyładowań energii</p>
            <ul className="text-left mt-5 text-[11px] text-slate-400 space-y-2 font-mono">
              <li className="flex items-start gap-1.5">
                <span className="text-blue-400 font-bold">•</span>
                <span>BROŃ: KOSTUR MOCY</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-400 font-bold">•</span>
                <span>ATAK: ENERGETYCZNE KULE</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-400 font-bold">•</span>
                <span>ZALETA: SILNE ATUTY DYSTANSOWE</span>
              </li>
            </ul>
          </div>
          <div className="mt-6 text-[10px] py-2 px-4 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-bold uppercase tracking-widest group-hover:bg-blue-600 group-hover:text-white transition-all font-mono">
            WYBIERZ MAJESTAT
          </div>
        </div>

        {/* WOJOWNIK */}
        <div
          onClick={() => onClassSelected("wojownik")}
          className="group relative bg-[#080A0E] border border-white/5 hover:border-red-500/50 hover:bg-red-600/5 cursor-pointer p-6 rounded-2xl w-72 text-center transition-all duration-300 hover:-translate-y-2 flex flex-col justify-between shadow-lg"
        >
          <div>
            <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20 group-hover:bg-red-500/20 group-hover:scale-110 transition-all">
              <Swords className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mt-4 group-hover:text-red-300 font-display uppercase tracking-wider">WOJOWNIK</h2>
            <p className="text-[10px] text-red-400/80 italic mt-1 font-mono uppercase tracking-widest">Ciężki szermierz bojowy</p>
            <ul className="text-left mt-5 text-[11px] text-slate-400 space-y-2 font-mono">
              <li className="flex items-start gap-1.5">
                <span className="text-red-400 font-bold">•</span>
                <span>BROŃ: CIĘŻKI STALOWY MIECZ</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-red-400 font-bold">•</span>
                <span>ATAK: BLISKIE SZYBKIE CIĘCIA</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-red-400 font-bold">•</span>
                <span>ZALETA: DUŻY POZIOM HP I SZAŁ ATATKU</span>
              </li>
            </ul>
          </div>
          <div className="mt-6 text-[10px] py-2 px-4 rounded bg-red-500/10 text-red-300 border border-red-500/20 font-bold uppercase tracking-widest group-hover:bg-red-600 group-hover:text-white transition-all font-mono">
            WYBIERZ WOJOWNIKA
          </div>
        </div>

        {/* ŁUCZNIK */}
        <div
          onClick={() => onClassSelected("lucznik")}
          className="group relative bg-[#080A0E] border border-white/5 hover:border-emerald-500/50 hover:bg-emerald-600/5 cursor-pointer p-6 rounded-2xl w-72 text-center transition-all duration-300 hover:-translate-y-2 flex flex-col justify-between shadow-lg"
        >
          <div>
            <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all">
              <Compass className="w-7 h-7 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white mt-4 group-hover:text-emerald-300 font-display uppercase tracking-wider">ŁUCZNIK</h2>
            <p className="text-[10px] text-emerald-400/80 italic mt-1 font-mono uppercase tracking-widest">Zwinny strzelec borowy</p>
            <ul className="text-left mt-5 text-[11px] text-slate-400 space-y-2 font-mono">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span>BROŃ: ŁUK REFLEKSYJNY</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span>ATAK: SZYBKIE STRZAŁY SINE</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span>ZALETA: PRĘDKOŚĆ I OGIEŃ STRZELECKI</span>
              </li>
            </ul>
          </div>
          <div className="mt-6 text-[10px] py-2 px-4 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold uppercase tracking-widest group-hover:bg-emerald-600 group-hover:text-white transition-all font-mono">
            WYBIERZ ŁUCZNIKA
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 py-2 px-6 rounded text-xs text-blue-400 font-mono tracking-wider animate-pulse uppercase">
          SYSTEM_ACCESS: ADMIN PRIVILEGES ACTIVE - WELCOME KONTRIUM
        </div>
      )}

      {/* Admin Verification Modal (F10) */}
      {showF10Dialog && (
        <div className="absolute inset-0 z-50 bg-[#050608]/95 flex justify-center items-center p-4">
          <div className="bg-[#0A0C10] border border-white/5 rounded-2xl p-6 w-full max-w-md shadow-2xl relative text-slate-300 font-mono">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm text-white font-display uppercase tracking-widest">
                  Weryfikacja Kontrolna
                </h3>
              </div>
              <button
                onClick={() => setShowF10Dialog(false)}
                className="text-slate-500 hover:text-white transition-all text-xs uppercase"
              >
                Anuluj
              </button>
            </div>

            <p className="text-[10px] text-slate-500 mb-6 uppercase leading-relaxed">
              Podaj klucz autoryzujący terminala głównego administracji dla użytkownika <strong className="text-blue-400">&quot;Kontrium&quot;</strong>.
            </p>

            <form onSubmit={handleAdminVerify} className="space-y-4">
              <div>
                <label className="block text-[9px] uppercase text-slate-500 mb-1.5 font-bold tracking-widest">
                  Identyfikator logowania
                </label>
                <input
                  type="text"
                  disabled
                  value="Kontrium"
                  className="w-full bg-[#050608] border border-white/5 text-slate-500 rounded py-2 px-3 text-xs select-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase text-slate-500 mb-1.5 font-bold tracking-widest">
                  Klucz uwierzytelniania
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="KLUCZ SYST..."
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-[#050608] border border-white/10 focus:border-blue-500 rounded py-2 px-9 text-blue-400 text-xs transition-colors focus:outline-none placeholder-slate-700"
                    autoFocus
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="text-[10px] text-red-400 font-bold bg-red-950/10 border border-red-500/20 py-2 px-3 rounded">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={checkingPassword}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded transition-all shadow-md active:scale-95 disabled:opacity-50 text-[10px] uppercase tracking-widest"
              >
                {checkingPassword ? "Sprawdzanie klucza..." : "Zatwierdź klucz (F10)"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
