import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase'; 
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";

const DinoGame = () => {
  const [gameState, setGameState] = useState('MENU'); 
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(parseInt(localStorage.getItem('dinoHiScore')) || 0);
  const [leaderboard, setLeaderboard] = useState([]);

  const canvasRef = useRef(null);
  const gameRef = useRef({
    dino: { x: 50, y: 150, w: 40, h: 40, dy: 0, jump: -12, gravity: 0.6, color: '#A020F0' }, // Mor Dino
    obstacles: [],
    speed: 6,
    frameCount: 0,
    frameId: null,
    colors: { // Neon Renk Paleti
        dino: '#A020F0', // Purpleguy Moru
        obstacle: '#00FFFF', // Neon Turkuaz
        ground: '#555555',
        shadow: '#A020F0'
    }
  });

  // Liderlik Tablosu Verisi
  useEffect(() => {
    // Brave'in Firebase'i engelleme ihtimaline karşı try-catch
    try {
      const q = query(collection(db, "dino_leaderboard"), orderBy("score", "desc"), limit(5));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setLeaderboard(snapshot.docs.map(doc => doc.data()));
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Firebase bağlantı hatası veya Brave tarafından engellendi:", e);
      // Firebase'siz çalıştırmak için boş bir liderlik tablosu ayarla
      setLeaderboard([{ name: "Local", score: highScore, signature: "Brave Engelledi" }]);
    }
  }, [highScore]); // highScore değiştiğinde leaderboard'ı güncelle

  const startGame = (e) => {
    if (e) e.stopPropagation(); 
    gameRef.current.obstacles = [];
    gameRef.current.speed = 6;
    gameRef.current.frameCount = 0;
    setScore(0);
    setGameState('PLAYING');
  };

  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const g = gameRef.current;

    const update = () => {
      g.frameCount++;

      // Dino Fiziği
      g.dino.dy += g.dino.gravity;
      g.dino.y += g.dino.dy;
      if (g.dino.y > 150) { g.dino.y = 150; g.dino.dy = 0; }

      // Engel Oluşturma (Tamamen kodla çiziliyor)
      if (g.frameCount % 100 === 0) {
        const type = Math.random() > 0.5 ? 'CACTUS' : 'BIRD';
        let obstacle = { x: 800, type: type, color: g.colors.obstacle };
        
        if (type === 'CACTUS') {
            obstacle.w = 20; obstacle.h = 40; obstacle.y = 160 - obstacle.h;
        } else { // Bird
            obstacle.w = 30; obstacle.h = 20; obstacle.y = Math.random() < 0.5 ? 100 : 130;
        }
        g.obstacles.push(obstacle);
      }

      ctx.clearRect(0, 0, 800, 200);

      // --- Zemin Çizgisi (Neon) ---
      ctx.beginPath();
      ctx.moveTo(0, 160);
      ctx.lineTo(800, 160);
      ctx.strokeStyle = g.colors.ground;
      ctx.lineWidth = 2;
      ctx.stroke();

      // --- NEON DİNOZOR ÇİZİMİ (Kodla!) ---
      ctx.shadowBlur = 10;
      ctx.shadowColor = g.colors.shadow;
      ctx.fillStyle = g.colors.dino;
      ctx.fillRect(g.dino.x, g.dino.y, g.dino.w, g.dino.h);
      ctx.shadowBlur = 0; // Gölgeyi sıfırla ki diğerleri etkilenmesin

      // Engelleri Güncelle ve Çiz (Neon)
      g.obstacles.forEach((obs, i) => {
        obs.x -= g.speed;
        ctx.shadowBlur = 8;
        ctx.shadowColor = obs.color;
        ctx.fillStyle = obs.color;
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.shadowBlur = 0;

        // Çarpışma Kontrolü
        if (g.dino.x < obs.x + obs.w && 
            g.dino.x + g.dino.w > obs.x && 
            g.dino.y < obs.y + obs.h && 
            g.dino.y + g.dino.h > obs.y) {
          
          setGameState('GAMEOVER');
          if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('dinoHiScore', score.toString());
          }
          // Firebase'e sadece Brave engellemediyse kaydet
          try {
            addDoc(collection(db, "dino_leaderboard"), {
              name: "Efe",
              score: score,
              signature: "Purpleguy © 2026 - tablet power",
              timestamp: serverTimestamp()
            });
          } catch (e) { console.log("Skor Firebase'e kaydedilemedi (Brave engeli)."); }
        }
        if (obs.x + obs.w < 0) g.obstacles.splice(i, 1);
      });

      setScore(s => s + 1);
      g.speed += 0.001;
      g.frameId = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(g.frameId);
  }, [gameState, score, highScore]);

  // Klavye ve Dokunmatik Kontroller
  useEffect(() => {
    const handleAction = (e) => {
      // Sadece 'Space' veya 'ArrowUp' için klavye olayı dinle
      if (e.type === 'keydown' && (e.code !== 'Space' && e.code !== 'ArrowUp')) return;

      if (gameState === 'PLAYING' && gameRef.current.dino.y > 140) {
        gameRef.current.dino.dy = gameRef.current.dino.jump;
      } else if (gameState !== 'PLAYING') {
        startGame();
      }
    };

    window.addEventListener('keydown', handleAction);
    // Canvas veya ekran tıklaması için
    const canvasElement = canvasRef.current;
    if (canvasElement) {
        canvasElement.addEventListener('click', handleAction);
    }
    
    return () => {
        window.removeEventListener('keydown', handleAction);
        if (canvasElement) {
            canvasElement.removeEventListener('click', handleAction);
        }
    };
  }, [gameState]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-purple-500 font-mono select-none overflow-hidden">
      
      {/* ÜST PANEL */}
      <div className="mb-6 flex gap-12 text-lg font-bold">
        <span className="text-zinc-600 italic">HI {highScore.toString().padStart(5, '0')}</span>
        <span className="text-white">{score.toString().padStart(5, '0')}</span>
      </div>

      <div className="relative w-full max-w-3xl aspect-[4/1] bg-zinc-950 border-y-2 border-purple-900/40 shadow-2xl">
        <canvas ref={canvasRef} width={800} height={200} className="w-full h-full bg-gradient-to-t from-gray-900 to-black" />

        {/* ANA MENÜ VE SKOR TABLOSU */}
        {gameState !== 'PLAYING' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-[100]">
            <h1 className="text-4xl font-black mb-6 text-purple-600 tracking-widest animate-pulse">PURPLEGUY DINO</h1>
            
            <button 
              onClick={startGame}
              className="mb-8 px-14 py-3 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-full transition-all active:scale-95 shadow-[0_0_30px_rgba(160,32,240,0.4)]">
              {gameState === 'MENU' ? 'BAŞLA' : 'TEKRAR DENE'}
            </button>

            <div className="w-full max-w-xs bg-purple-950/20 border border-purple-800/30 rounded-xl p-4">
              <h3 className="text-[10px] text-center mb-3 text-purple-400 font-bold tracking-[0.3em]">DÜNYA SKORLARI</h3>
              {leaderboard.map((item, i) => (
                <div key={i} className="flex justify-between text-[12px] mb-2 px-2 border-b border-purple-900/20 last:border-0 pb-1">
                  <span className="text-zinc-400">{i+1}. {item.name}</span>
                  <span className="text-white font-bold">{item.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        <p className="text-[10px] text-purple-900 font-bold tracking-[0.5em] uppercase">Purpleguy © 2026 - tablet power</p>
      </div>
    </div>
  );
};

export default DinoGame;

