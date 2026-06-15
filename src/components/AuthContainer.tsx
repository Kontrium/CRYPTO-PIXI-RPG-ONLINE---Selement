/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Mail, User, Lock, ArrowRight, ShieldCheck, UserCheck } from "lucide-react";
import { ref, get, set } from "firebase/database";
import { db } from "../lib/firebase";

interface AuthContainerProps {
  onAuthenticated: (username: string) => void;
}

export default function AuthContainer({ onAuthenticated }: AuthContainerProps) {
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg("Wypełnij wymagane pola!");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const normalizedUser = username.trim();

    try {
      const userRef = ref(db, `users/${normalizedUser}`);
      const snapshot = await get(userRef);

      if (!isLoginMode) {
        // Registration
        if (!email.trim()) {
          setErrorMsg("Podaj adres e-mail!");
          setLoading(false);
          return;
        }

        if (snapshot.exists()) {
          setErrorMsg("Ta nazwa użytkownika jest już zajęta.");
        } else {
          // Register the user
          await set(userRef, {
            email: email.trim(),
            password: password
          });
          onAuthenticated(normalizedUser);
        }
      } else {
        // Login
        if (snapshot.exists()) {
          const userData = snapshot.val();
          if (userData.password === password) {
            onAuthenticated(normalizedUser);
          } else {
            setErrorMsg("Niepoprawne hasło.");
          }
        } else {
          setErrorMsg("Użytkownik o podanej nazwie nie istnieje.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Wystąpił błąd autoryzacji: " + (err.message || "Brak połączenia"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#080A0E] border border-white/5 rounded-2xl p-8 w-full max-w-md shadow-2xl relative z-50 text-slate-300">
      {/* Subtle tech border top indicator */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-indigo-600 rounded-t-2xl" />

      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center mx-auto border border-blue-500/30 mb-3">
          {isLoginMode ? (
            <UserCheck className="w-6 h-6 text-blue-400" />
          ) : (
            <ShieldCheck className="w-6 h-6 text-blue-400" />
          )}
        </div>
        <h2 className="text-xl font-bold font-display tracking-wide uppercase text-white">
          {isLoginMode ? "SYS_LOG_IN" : "SYS_CREATE_ACCOUNT"}
        </h2>
        <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-1 font-mono">
          CryptoPixiRPG Access Gateway v4.2
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLoginMode && (
          <div>
            <label className="block text-[9px] uppercase text-slate-500 mb-1 font-bold tracking-wider font-mono">
              Adres E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                placeholder="np. satoshi@bitcoin.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#050608] border border-white/10 hover:border-white/20 focus:border-blue-500 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 placeholder-slate-700 text-sm transition-all focus:outline-none font-mono"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-[9px] uppercase text-slate-500 mb-1 font-bold tracking-wider font-mono">
            Nazwa Użytkownika (Nick)
          </label>
          <div className="relative">
            <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              required
              placeholder="Wpisz nazwę... (np. Kontrium)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#050608] border border-white/10 hover:border-white/20 focus:border-blue-500 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 placeholder-slate-700 text-sm transition-all focus:outline-none font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-[9px] uppercase text-slate-500 mb-1 font-bold tracking-wider font-mono">
            Hasło
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#050608] border border-white/10 hover:border-white/20 focus:border-blue-500 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 placeholder-slate-700 text-sm transition-all focus:outline-none font-mono"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="text-xs text-red-400 font-mono bg-red-950/20 border border-red-500/20 rounded-lg p-2.5 text-center">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 text-xs uppercase tracking-wider font-mono"
        >
          <span>{loading ? "Weryfikacja..." : isLoginMode ? "Autoryzuj wejście" : "Zainicjuj profil"}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </form>

      <div className="text-center mt-6 pt-4 border-t border-white/5 text-xs text-slate-500">
        <span>{isLoginMode ? "Nie posiadasz profilu?" : "Posiadasz już profil?"} </span>
        <button
          onClick={() => {
            setIsLoginMode(!isLoginMode);
            setErrorMsg("");
          }}
          className="text-blue-400 hover:underline hover:text-blue-300 font-semibold cursor-pointer ml-1"
        >
          {isLoginMode ? "Utwórz profil" : "Logowanie"}
        </button>
      </div>
    </div>
  );
}
