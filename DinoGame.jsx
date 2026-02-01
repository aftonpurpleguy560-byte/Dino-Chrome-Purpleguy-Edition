import React, { useState, useEffect, useRef } from 'react';

// Purpleguy © 2026 - tablet power
const DinoGame = () => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState('START'); // START, PLAYING, GAMEOVER
  const [highScore, setHighScore] = useState(localStorage.getItem('dinoHiScore') || 0);

  // Oyun değişkenlerini useRef ile tutuyoruz ki render döngüsünden bağımsız kalsın
  const gameRef = useRef({
    dino: { x: 50, y: 150, w: 45, h: 45, dy: 0, jump: 12, gravity: 0.6, jumpCount: 0 },
    obstacles: [],
    speed: 6,
    frameId: null
  });

  const handleJump = () => {
    if (gameState === 'START') {
      setGameState('PLAYING');
      setScore(0);
    } else if (gameState === 'PLAYING') {
      const { dino } = gameRef.current;
      if (dino.jumpCount < 2) {
        dino.dy = -dino.jump;
        dino.jumpCount++;
      }
    } else if (gameState === 'GAMEOVER') {
      window.location.reload();
    }
  };

  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const state = gameRef.current;

    const gameLoop = () => {
      // --- GÜNCELLEME (UPDATE) ---
      state.dino.dy += state.dino.gravity;
      state.dino.y += state.dino.dy;

      // Yer kontrolü
      if (state.dino.y + state.dino.h > canvas.height) {
        state.dino.y = canvas.height - state.dino.h;
        state.dino.dy = 0;
        state.dino.jumpCount = 0;
      }

      // Engel oluşturma
      if (Math.random() < 0.015 && (state.obstacles.length === 0 || state.obstacles[state.obstacles.length - 1].x < canvas.width - 300)) {
        state.obstacles.push({ x: canvas.width, y: canvas.height - 50, w: 25, h: 50 });
      }

      // Engelleri hareket ettir ve çarpışma bak
      state.obstacles.forEach((obs, i) => {
        obs.x -= state.speed;

        // Çarpışma kutusu (Hitbox) ayarı
        if (state.dino.x < obs.x + obs.w && 
            state.dino.x + state.dino.w > obs.x && 
            state.dino.y < obs.y + obs.h && 
            state.dino.y + state.dino.h > obs.y) {
          setGameState('GAMEOVER');
        }

        if (obs.x + obs.w < 0) {
          state.obstacles.splice(i, 1);
          setScore(s => {
            const newScore = s + 10;
            if (newScore > highScore) {
              setHighScore(newScore);
              localStorage.setItem('dinoHiScore', newScore);
            }
            return newScore;
          });
          state.speed += 0.1; // Gittikçe hızlan
        }
      });

      // --- ÇİZİM (DRAW) ---
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Neon Zemin
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      ctx.lineTo(canvas.width, canvas.height);
      ctx.stroke();

      // Neon Dinozor
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#A020F0";
      ctx.fillStyle = "#A020F0";
      ctx.fillRect(state.dino.x, state.dino.y, state.dino.w, state.dino.h);

      // Engeller (Siyan Neon)
      ctx.shadowColor = "#00f2ff";
      ctx.fillStyle = "#00f2ff";
      state.obstacles.forEach(obs => ctx.fillRect(obs.x, obs.y, obs.w, obs.h));
      
      ctx.shadowBlur = 0;
      state.frameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();
    return () => cancelAnimationFrame(state.frameId);
  }, [gameState]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-purple-500 font-mono select-none overflow-hidden" onClick={handleJump}>
      
      {/* Skor Paneli */}
      <div className="mb-10 text-center space-y-2">
        <h1 className="text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-800 drop-shadow-[0_0_15px_rgba(160,32,240,0.5)]">
          DINO REMASTERED
        </h1>
        <div className="flex justify-center gap-8 text-lg font-bold">
          <span className="text-zinc-500 text-sm">HI: {highScore}</span>
          <span className="text-purple-400">SCORE: {score}</span>
        </div>
      </div>

      {/* Oyun Alanı */}
      <div className="relative p-1 bg-gradient-to-b from-purple-900/20 to-transparent rounded-lg">
        <canvas 
          ref={canvasRef} 
          width={Math.min(window.innerWidth - 40, 800)} 
          height={250} 
          className="bg-black/40 backdrop-blur-sm rounded-md shadow-inner"
        />
        
        {/* Overlay (Giriş ve Bitiş Ekranı) */}
        {gameState !== 'PLAYING' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-md border border-purple-500/30">
            <h2 className="text-4xl font-bold mb-6 text-white drop-shadow-md">
              {gameState === 'START' ? 'HAZIR MISIN EFE?' : 'OYUN BİTTİ'}
            </h2>
            <button className="px-10 py-4 bg-purple-700 hover:bg-purple-600 text-white rounded-xl font-black tracking-widest transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(160,32,240,0.4)]">
              {gameState === 'START' ? 'BAŞLA' : 'TEKRAR DENE'}
            </button>
          </div>
        )}
      </div>

      {/* Alt Bilgi & İmza */}
      <footer className="mt-16 flex flex-col items-center opacity-50">
        <p className="text-[10px] tracking-[0.3em] uppercase mb-2">Developed by Afton & Efe</p>
        <div className="h-px w-20 bg-purple-900 mb-2"></div>
        <p className="text-xs font-semibold text-purple-700">Purpleguy © 2026 - tablet power</p>
      </footer>
    </div>
  );
};

export default DinoGame;

