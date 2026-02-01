import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase'; 
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";

const DinoGame = () => {
  const [gameState, setGameState] = useState('MENU'); 
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(parseInt(localStorage.getItem('dinoHiScore')) || 0);
  const [leaderboard, setLeaderboard] = useState([]);
  const canvasRef = useRef(null);
  const gameRef = useRef({ dino: { x: 50, y: 150, w: 44, h: 47, dy: 0 }, obstacles: [], speed: 6, frame: 0 });

  const sprite = new Image();
  sprite.crossOrigin = "anonymous";
  sprite.src = 'https://raw.githubusercontent.com/wayou/t-rex-runner/master/assets/default_100_percent/100-offline-sprite.png';

  useEffect(() => {
    const q = query(collection(db, "dino_leaderboard"), orderBy("score", "desc"), limit(5));
    return onSnapshot(q, (s) => setLeaderboard(s.docs.map(d => d.data())));
  }, []);

  const start = () => {
    gameRef.current = { dino: { x: 50, y: 150, w: 44, h: 47, dy: 0 }, obstacles: [], speed: 6, frame: 0 };
    setScore(0); setGameState('PLAYING');
  };

  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const ctx = canvasRef.current.getContext('2d');
    const loop = () => {
      const g = gameRef.current; g.frame++;
      g.dino.dy += 0.6; g.dino.y += g.dino.dy;
      if (g.dino.y > 150) { g.dino.y = 150; g.dino.dy = 0; }
      
      // Engel Oluşturma (Bug Çözümü: 800px mesafede başlatma)
      if (g.frame % 100 === 0) g.obstacles.push({ x: 800, y: 155, w: 34, h: 50 });

      ctx.clearRect(0, 0, 800, 200);
      // Dino Çizimi (Animasyonlu)
      ctx.drawImage(sprite, (Math.floor(g.frame/5)%2?1854:1942), 2, 88, 94, g.dino.x, g.dino.y, 44, 47);
      
      g.obstacles.forEach((o, i) => {
        o.x -= g.speed; 
        ctx.drawImage(sprite, 446, 2, 90, 90, o.x, o.y, 34, 50); // Kaktüs Sprite

        // Çarpışma Kontrolü
        if (g.dino.x < o.x + 24 && g.dino.x + 34 > o.x && g.dino.y < o.y + 40 && g.dino.y + 40 > o.y) {
          setGameState('OVER');
          if (score > highScore) { setHighScore(score); localStorage.setItem('dinoHiScore', score); }
          addDoc(collection(db, "dino_leaderboard"), { name: "Efe", score, timestamp: serverTimestamp() });
        }
        if (o.x < -50) g.obstacles.splice(i, 1);
      });
      
      setScore(s => s + 1); g.speed += 0.001;
      g.rid = requestAnimationFrame(loop);
    };
    loop(); return () => cancelAnimationFrame(gameRef.current.rid);
  }, [gameState]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-purple-500 font-mono italic" 
         onClick={() => gameState === 'PLAYING' && gameRef.current.dino.y === 150 && (gameRef.current.dino.dy = -12)}>
      
      <div className="mb-4 text-lg font-bold">HI {highScore.toString().padStart(5, '0')} | SCORE {score.toString().padStart(5, '0')}</div>
      
      <div className="relative border-2 border-purple-900 bg-zinc-950 overflow-hidden shadow-[0_0_50px_rgba(160,32,240,0.2)]">
        <canvas ref={canvasRef} width={800} height={200} className="w-full h-auto" />
        
        {/* ANA MENÜ TASARIMI */}
        {gameState !== 'PLAYING' && (
          <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-4 z-50">
            <h1 className="text-4xl font-black text-purple-600 mb-2 italic tracking-tighter">PURPLEGUY DINO</h1>
            <p className="text-[10px] text-zinc-500 mb-6 uppercase tracking-widest">Brave Edition - Tablet Power</p>
            
            <button onClick={(e) => { e.stopPropagation(); start(); }} 
                    className="px-14 py-3 bg-purple-700 hover:bg-purple-600 text-white font-black rounded-full shadow-lg shadow-purple-500/50 mb-6 transition-transform active:scale-95">
              {gameState === 'MENU' ? 'BAŞLA' : 'TEKRAR DENE'}
            </button>

            <div className="w-48 bg-purple-950/20 border border-purple-900/40 rounded-lg p-3">
              <p className="text-[9px] text-center mb-2 text-purple-300 font-bold uppercase">Liderlik Tablosu</p>
              {leaderboard.map((l, i) => (
                <div key={i} className="flex justify-between text-[11px] text-zinc-400 border-b border-purple-900/10 mb-1">
                  <span>{i+1}. {l.name}</span><span className="text-white font-bold">{l.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <footer className="mt-8 text-[10px] tracking-[0.5em] opacity-30 uppercase font-bold">
        Purpleguy © 2026 - tablet power [cite: 2026-02-01]
      </footer>
    </div>
  );
};

export default DinoGame;

