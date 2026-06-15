/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { User, ShieldAlert, X } from "lucide-react";
import { ref, get } from "firebase/database";
import { db } from "../lib/firebase";

interface ProfileModalProps {
  username: string;
  onClose: () => void;
}

export default function ProfileModal({ username, onClose }: ProfileModalProps) {
  const [profileData, setProfileData] = useState<{
    charClass: string;
    level: number;
    score: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const statsRef = ref(db, `stats/${username}`);
    get(statsRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          setProfileData({
            charClass: val.charClass || "Brak",
            level: val.level || 1,
            score: val.score || 0
          });
        } else {
          setProfileData({
            charClass: "Nierozpoczęto",
            level: 1,
            score: 0
          });
        }
      })
      .catch((err) => {
        console.error("Error loading profile:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [username]);

  return (
    <div className="absolute inset-0 z-50 bg-[#050608]/80 flex justify-center items-center p-4">
      <div className="bg-[#0A0C10] border border-white/5 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-slate-300 font-mono">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20 mb-2">
            <User className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-lg font-bold font-display tracking-widest text-white uppercase">
            @{username}
          </h3>
          <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-bold">
            STAT_READY: ONLINE
          </span>
        </div>

        {loading ? (
          <div className="py-6 text-center text-xs text-slate-500 uppercase tracking-widest animate-pulse">
            SYS_LOADING_METRICS...
          </div>
        ) : (
          <div className="space-y-3.5 mt-4 text-xs uppercase text-slate-400">
            <div className="flex justify-between items-center py-2 border-b border-white/5 font-mono">
              <span className="text-slate-500 font-bold tracking-widest">Klasa:</span>
              <span className="text-blue-400 font-bold tracking-wider">{profileData?.charClass}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5 font-mono">
              <span className="text-slate-500 font-bold tracking-widest">Poziom:</span>
              <span className="text-white font-bold">{profileData?.level}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5 font-mono">
              <span className="text-slate-500 font-bold tracking-widest">Pokonani wrogowie:</span>
              <span className="text-red-400 font-bold">{profileData?.score}</span>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 bg-slate-800 hover:bg-slate-700 border border-white/5 text-[10px] font-bold uppercase tracking-widest py-2 rounded transition-colors"
        >
          Zamknij profil
        </button>
      </div>
    </div>
  );
}
