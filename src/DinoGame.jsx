import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase'; 
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";

const DinoGame = () => {
  // --- STATE YÖNETİMİ ---
  const [gameState, setGameState] = useState('MENU'); // MENU, PLAYING, GAMEOVER
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(parseInt(localStorage.getItem('dinoHiScore')) || 0);
  const [leaderboard, setLeaderboard] = useState([]);

  const canvasRef = useRef(null);
  const gameRef = useRef({
    dino: { x: 50, y: 150, w: 44, h: 47, dy: 0, jump: -12, gravity: 0.6, frame: 0 },
    obstacles: [],
    speed: 6,
    frameCount: 0
  });

  // --- SPRITE YÜKLEME ---
  const spriteImg = new Image();
  spriteImg.src = 'https://raw.githubusercontent.com/wayou/t-rex-runner/master/assets/default_100_percent/100-offline-sprite.png';

  // --- FIREBASE: CANLI SKOR TABLOSU ---
  useEffect(() => {
    const q = query(collection(db, "dino_leaderboard"), orderBy("score", "desc"), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLeaderboard(snapshot.docs.map(doc => doc.data()));
    });
    return () => unsubscribe();
  }, []);

  // --- OYUN BAŞLATMA ---
  const startGame = () => {
    setScore(0);
    setGameState('PLAYING');
    gameRef.current.obstacles = [];
    gameRef.current.speed = 6;
    gameRef.current.dino.y = 150;
    gameRef.current.dino.dy = 0;
  };

  // --- OYUN DÖNGÜSÜ ---
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const update = () => {
      const g = gameRef.current;
      g.frameCount++;

      // 1. Dinozor Fiziği
      g.dino.dy += g.dino.gravity;
      g.dino.y += g.dino.dy;

      if (g.dino.y + g.dino.h > canvas.height - 10) {
        g.dino.y = canvas.height - 10 - g.dino.h;
        g.dino.dy = 0;
      }

      // 2. Engel Oluşturma (Kaktüs ve Kuş)
      if (g.frameCount % 100 === 0) {
        const isBird = Math.random() > 0.8;
        g.obstacles.push({
          x: canvas.width,
          y: isBird ? canvas.height - 80 : canvas.height - 50,
          w: isBird ? 46 : 34,
          h: isBird ? 40 : 50,
          type: isBird ? 'BIRD' : 'CACTUS',
          spriteX: isBird ? 264 : 446
        });
      }

      // 3. Çizim ve Çarpışma
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Zemin Çizgisi
      ctx.strokeStyle = '#555';
      ctx.beginPath(); ctx.moveTo(0, canvas.height - 10); ctx.lineTo(canvas.width, canvas.height - 10); ctx.stroke();

      // Dinozor Çizimi (Sprite'tan Kesme)
      // Dino Koşma Animasyonu: 1854 ve 1942 koordinatları arası
      const dinoFrame = (Math.floor(g.frameCount / 5) % 2 === 0) ? 1854 : 1942;
      ctx.drawImage(spriteImg, dinoFrame, 2, 88, 94, g.dino.x, g.dino.y, g.dino.w, g.dino.h);

      // Engelleri Güncelle ve Çiz
      g.obstacles.forEach((obs, i) => {
        obs.x -= g.speed;
        
        // Sprite Çizimi
        ctx.drawImage(spriteImg, obs.spriteX, 2, 90, 90, obs.x, obs.y, obs.w, obs.h);

        // Çarpışma Kontrolü
        if (g.dino.x < obs.x + obs.w - 5 && 
            g.dino.x + g.dino.w - 5 > obs.x && 
            g.dino.y < obs.y + obs.h - 5 && 
            g.dino.y + g.dino.h - 5 > obs.y) {
          
          setGameState('GAMEOVER');
          if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('dinoHiScore', score.toString());
          }
          // Skor "çakma" işlemi
          addDoc(collection(db, "dino_leaderboard"), {
            name: "Efe",
            score: score,
            signature: "Purpleguy © 2026 - tablet power",
            timestamp: serverTimestamp()
          });
        }

        if (obs.x + obs.w < 0) g.obstacles.splice(i, 1);
      });

      setScore(s => s + 1);
      g.speed += 0.001;
      g.frameId = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(gameRef.current.frameId);
  }, [gameState, score, highScore]);

  // --- KLAVYE KONTROL ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (gameState === 'PLAYING' && gameRef.current.dino.y > 150) {
          gameRef.current.dino.dy = gameRef.current.dino.jump;
        } else if (gameState !== 'PLAYING') {
          startGame();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-purple-500 font-mono select-none" onClick={() => {if(gameState !== 'PLAYING') startGame(); else gameRef.current.dino.dy = gameRef.current.dino.jump;}}>
      
      {/* BEST SCORE VE MEVCUT SKOR */}
      <div className="mb-6 flex gap-12 text-lg font-bold italic tracking-widest">
        <span className="text-zinc-500">HI {highScore.toString().padStart(5, '0')}</span>
        <span className="text-white">{score.toString().padStart(5, '0')}</span>
      </div>

      <div className="relative w-full max-w-3xl aspect-[3/1] bg-zinc-950 border-y-2 border-purple-900/30 shadow-[0_0_50px_rgba(160,32,240,0.1)]">
        <canvas ref={canvasRef} width={800} height={200} className="w-full h-full" />

        {/* ANA MENÜ VE SKOR TABLOSU OVERLAY */}
        {gameState !== 'PLAYING' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6">
            <h1 className="text-4xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-b from-purple-400 to-purple-800 uppercase tracking-tighter">
              PURPLEGUY DINO
            </h1>
            
            <button className="mb-6 px-12 py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(160,32,240,0.4)]">
              {gameState === 'START' ? 'OYUNU BAŞLAT' : 'TEKRAR DENE'}
            </button>

            {/* SKOR TABLOSU */}
            <div className="w-full max-w-xs bg-purple-950/10 border border-purple-500/20 rounded-lg p-3">
              <h3 className="text-[10px] text-center mb-2 text-purple-400 tracking-[0.3em] font-bold">TOP 5 RANKING</h3>
              {leaderboard.map((item, i) => (
                <div key={i} className="flex justify-between text-[11px] mb-1 px-2 border-b border-purple-900/30 last:border-0 pb-1">
                  <span className="text-zinc-400">{i+1}. {item.name}</span>
                  <span className="text-white font-bold">{item.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* İMZA */}
      <div className="mt-8 text-center">
        <p className="text-[10px] text-purple-900 font-bold tracking-[0.4em] uppercase">Purpleguy © 2026 - tablet power</p>
        <p className="text-[8px] text-zinc-700 mt-1 uppercase">Press Space to Jump</p>
      </div>

    </div>
  );
};

export default DinoGame;

