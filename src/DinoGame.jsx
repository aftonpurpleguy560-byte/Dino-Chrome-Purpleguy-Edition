import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase'; 
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";

// Purpleguy © 2026 - tablet power
const DinoGame = () => {
  // --- STATE (DURUM) YÖNETİMİ ---
  const [gameState, setGameState] = useState('START'); // START, PLAYING, GAMEOVER
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(parseInt(localStorage.getItem('dinoHiScore')) || 0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false); // Admin Modu
  const [weather, setWeather] = useState('NORMAL'); // NORMAL, NEON_STORM, MATRIX

  // --- OYUN MOTORU DEĞİŞKENLERİ (REF) ---
  const canvasRef = useRef(null);
  const gameRef = useRef({
    dino: { x: 50, y: 150, w: 40, h: 40, dy: 0, jump: 12, gravity: 0.6, jumpCount: 0, grounded: false },
    obstacles: [],
    particles: [], // Neon Trail için
    speed: 6,
    frameId: null
  });

  // --- FIREBASE: CANLI SIRALAMA ---
  useEffect(() => {
    // Skor tablosunu "dino_leaderboard" koleksiyonundan çekiyoruz (Snake ile karışmaz)
    const q = query(collection(db, "dino_leaderboard"), orderBy("score", "desc"), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLeaderboard(snapshot.docs.map(doc => doc.data()));
    });
    return () => unsubscribe();
  }, []);

  // --- SKOR YÜKLEME (Buluta Çakma) ---
  const uploadScore = async (finalScore) => {
    if (finalScore > 50) { // Sadece 50 puan üstü skorları kaydet
      try {
        await addDoc(collection(db, "dino_leaderboard"), {
          name: isAdmin ? "Purpleguy (Admin)" : "Anonim Oyuncu",
          score: finalScore,
          timestamp: serverTimestamp(),
          signature: "Purpleguy © 2026 - tablet power" // [cite: 2026-02-01]
        });
      } catch (e) {
        console.error("Skor çakılamadı:", e);
      }
    }
  };

  // --- OYUN DÖNGÜSÜ ---
  const startGame = () => {
    setGameState('PLAYING');
    setScore(0);
    setWeather('NORMAL');
    gameRef.current.obstacles = [];
    gameRef.current.particles = [];
    gameRef.current.speed = 6;
    gameRef.current.dino.y = 150;
    gameRef.current.dino.dy = 0;
  };

  const jump = () => {
    const { dino } = gameRef.current;
    // Double Jump ve Admin Uçuş Modu
    if (dino.jumpCount < 2 || isAdmin) {
      dino.dy = isAdmin ? -15 : -12; 
      dino.jumpCount++;
    }
  };

  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const engine = gameRef.current;

    const loop = () => {
      // 1. ZORLUK VE HAVA DURUMU AYARI
      if (score > 500 && score < 1000) setWeather('NEON_STORM');
      else if (score >= 1000) setWeather('MATRIX');
      
      engine.speed += 0.002; // Yavaşça hızlanma

      // 2. DİNOZOR FİZİĞİ
      engine.dino.dy += engine.dino.gravity;
      engine.dino.y += engine.dino.dy;

      // Yer Kontrolü
      if (engine.dino.y + engine.dino.h > canvas.height) {
        engine.dino.y = canvas.height - engine.dino.h;
        engine.dino.dy = 0;
        engine.dino.jumpCount = 0;
      }

      // 3. PARÇACIK SİSTEMİ (NEON TRAIL)
      // Dino her hareket ettiğinde arkasına renkli toz bırakır
      engine.particles.push({
        x: engine.dino.x,
        y: engine.dino.y + engine.dino.h,
        alpha: 1,
        color: `hsl(${score % 360}, 100%, 50%)`, // Gökkuşağı renkleri
        size: Math.random() * 4
      });

      // 4. ENGEL YÖNETİMİ
      if (Math.random() < 0.015 && (engine.obstacles.length === 0 || engine.obstacles[engine.obstacles.length - 1].x < canvas.width - 300)) {
        const type = Math.random();
        engine.obstacles.push({
          x: canvas.width,
          y: type > 0.8 ? canvas.height - 70 : canvas.height - 50, // Bazıları uçan engel
          w: 30,
          h: type > 0.8 ? 30 : 50,
          isFlying: type > 0.8
        });
      }

      engine.obstacles.forEach((obs, i) => {
        obs.x -= engine.speed;

        // Çarpışma (Admin modunda ölümsüzlük)
        if (!isAdmin && 
            engine.dino.x < obs.x + obs.w && 
            engine.dino.x + engine.dino.w > obs.x && 
            engine.dino.y < obs.y + obs.h && 
            engine.dino.y + engine.dino.h > obs.y) {
          
          setGameState('GAMEOVER');
          if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('dinoHiScore', score);
          }
          uploadScore(score); // Firebase'e gönder
        }

        if (obs.x + obs.w < 0) {
          engine.obstacles.splice(i, 1);
          setScore(s => s + 10);
        }
      });

      // --- ÇİZİM ---
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Arka Plan Efekti (Weather)
      if (weather === 'NEON_STORM') {
        ctx.fillStyle = 'rgba(160, 32, 240, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Zemin
      ctx.strokeStyle = '#333';
      ctx.beginPath(); ctx.moveTo(0, canvas.height); ctx.lineTo(canvas.width, canvas.height); ctx.stroke();

      // Parçacıkları Çiz
      engine.particles.forEach((p, i) => {
        p.x -= engine.speed;
        p.alpha -= 0.05;
        if (p.alpha <= 0) engine.particles.splice(i, 1);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      ctx.globalAlpha = 1;

      // Dinozor (Purpleguy Style)
      ctx.shadowBlur = 20;
      ctx.shadowColor = isAdmin ? "#FF0000" : "#A020F0"; // Admin ise Kırmızı, değilse Mor
      ctx.fillStyle = isAdmin ? "#FF0000" : "#A020F0";
      ctx.fillRect(engine.dino.x, engine.dino.y, engine.dino.w, engine.dino.h);
      
      // Engeller
      engine.obstacles.forEach(obs => {
        ctx.shadowColor = "#00f2ff";
        ctx.fillStyle = "#00f2ff";
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      });
      ctx.shadowBlur = 0;

      engine.frameId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(engine.frameId);
  }, [gameState, score, weather, isAdmin]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white font-mono select-none overflow-hidden touch-none" onPointerDown={jump}>
      
      {/* 1. SKOR VE DURUM */}
      <div className="absolute top-10 text-center z-10">
        <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500 animate-pulse">
          DINO CHROME: PURPLEGUY
        </h1>
        <div className="flex gap-4 justify-center mt-2 text-sm font-bold">
          <span className="text-gray-500">HI: {highScore}</span>
          <span className="text-purple-400">SCORE: {score}</span>
        </div>
        {/* Hava Durumu Göstergesi */}
        {weather !== 'NORMAL' && <div className="text-[10px] text-red-500 animate-bounce mt-1">⚠️ {weather} ALERT ⚠️</div>}
      </div>

      {/* 2. OYUN ALANI */}
      <div className="relative border-b-2 border-purple-600/50 shadow-[0_0_50px_rgba(160,32,240,0.3)] bg-gradient-to-b from-transparent to-purple-900/10 w-full max-w-4xl">
        <canvas ref={canvasRef} width={800} height={300} className="w-full h-auto bg-black" />
        
        {/* Menü Overlay */}
        {gameState !== 'PLAYING' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <h2 className="text-3xl font-bold mb-4 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
              {gameState === 'START' ? 'SİSTEM HAZIR' : 'SİNYAL KAYBOLDU'}
            </h2>
            <button 
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-500 rounded-full font-bold transition-all hover:scale-105 shadow-[0_0_20px_purple]">
              {gameState === 'START' ? 'BAŞLAT' : 'TEKRAR DENE'}
            </button>
            <p className="mt-4 text-[10px] text-gray-500">Tap or Space to Jump | Double Jump Active</p>
          </div>
        )}

        {/* Canlı Leaderboard (Sol Üst) */}
        <div className="absolute top-4 left-4 p-3 bg-black/50 border border-purple-500/30 rounded-lg backdrop-blur-md hidden md:block">
          <h3 className="text-[10px] text-purple-400 font-bold mb-2 tracking-widest border-b border-gray-700 pb-1">TOP 5 PLAYERS</h3>
          {leaderboard.map((p, i) => (
            <div key={i} className="flex justify-between text-[10px] w-32 mb-1">
              <span className="text-gray-300 truncate w-20">{i+1}. {p.name}</span>
              <span className="text-white font-bold">{p.score}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. ADMIN VE İMZA */}
      <div className="absolute bottom-5 w-full flex justify-between px-10 items-end">
        <div className="text-[10px] text-gray-600">
          <p>Version 2.0 (Remastered)</p>
          <p className="text-purple-700 font-bold mt-1">Purpleguy © 2026 - tablet power</p>
        </div>
        
        {/* Gizli Admin Butonu */}
        <button 
          onClick={(e) => { e.stopPropagation(); setIsAdmin(!isAdmin); }} 
          className={`text-[9px] px-2 py-1 border rounded opacity-50 hover:opacity-100 transition-all ${isAdmin ? 'border-red-500 text-red-500' : 'border-gray-800 text-gray-800'}`}>
          {isAdmin ? 'ADMIN ACTIVE' : 'DEV MODE'}
        </button>
      </div>

    </div>
  );
};

export default DinoGame;


