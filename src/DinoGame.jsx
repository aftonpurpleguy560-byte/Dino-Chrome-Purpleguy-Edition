import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase'; 
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";

const DinoGame = () => {
  const [gameState, setGameState] = useState('MENU'); 
  const [playerName, setPlayerName] = useState(localStorage.getItem('pName') || '');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(parseInt(localStorage.getItem('dinoHiScore')) || 0);
  const [leaderboard, setLeaderboard] = useState([]);
  const canvasRef = useRef(null);
  const gameRef = useRef({ dino: { x: 50, y: 150, w: 44, h: 47, dy: 0 }, obstacles: [], speed: 6, frame: 0 });
  const sprite = useRef(new Image());

  useEffect(() => {
    sprite.current.src = 'https://raw.githubusercontent.com/wayou/t-rex-runner/master/assets/default_100_percent/100-offline-sprite.png';
    sprite.current.crossOrigin = "anonymous";
    
    const q = query(collection(db, "dino_leaderboard"), orderBy("score", "desc"), limit(5));
    const unsubscribe = onSnapshot(q, (s) => {
      setLeaderboard(s.docs.map(d => d.data()));
    }, (err) => console.log("Firebase Sıralama Hatası:", err));
    return () => unsubscribe();
  }, []);

  const start = () => {
    if(!playerName) { alert("Önce ismini yazmalısın Purpleguy!"); return; }
    localStorage.setItem('pName', playerName);
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
      if (g.frame % 100 === 0) g.obstacles.push({ x: 800, y: 155, w: 34, h: 50 });

      ctx.clearRect(0, 0, 800, 200);
      ctx.drawImage(sprite.current, (Math.floor(g.frame/5)%2?1854:1942), 2, 88, 94, g.dino.x, g.dino.y, 44, 47);
      
      g.obstacles.forEach((o, i) => {
        o.x -= g.speed; ctx.drawImage(sprite.current, 446, 2, 90, 90, o.x, o.y, 34, 50);
        if (g.dino.x < o.x + 25 && g.dino.x + 35 > o.x && g.dino.y < o.y + 40 && g.dino.y + 40 > o.y) {
          setGameState('OVER');
          if (score > highScore) { setHighScore(score); localStorage.setItem('dinoHiScore', score); }
          // Skoru Firebase'e Gönder
          addDoc(collection(db, "dino_leaderboard"), { 
            name: playerName, 
            score, 
            timestamp: serverTimestamp() 
          }).catch(e => console.error("Skor kaydedilemedi:", e));
        }
        if (o.x < -50) g.obstacles.splice(i, 1);
      });
      setScore(s => s + 1); g.speed += 0.001;
      g.rid = requestAnimationFrame(loop);
    };
    loop(); return () => cancelAnimationFrame(gameRef.current.rid);
  }, [gameState, score, playerName]);

  return (
    <div className="game-container" onClick={() => gameState === 'PLAYING' && gameRef.current.dino.y === 150 && (gameRef.current.dino.dy = -12)}>
      <div className="score-board">
        <span className="text-zinc-500">HI {highScore.toString().padStart(5, '0')}</span>
        <span>{score.toString().padStart(5, '0')}</span>
      </div>

      <div className="canvas-wrapper">
        <canvas ref={canvasRef} width={800} height={200} />
        {gameState !== 'PLAYING' && (
          <div className="menu-overlay">
            <h1 className="menu-title">PURPLEGUY DINO</h1>
            
            {/* İsim Giriş Alanı */}
            <input 
              type="text" 
              placeholder="İSMİNİ YAZ..." 
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="bg-black border-2 border-purple-800 text-white p-2 rounded-lg my-4 text-center outline-none focus:border-purple-500"
            />

            <button onClick={(e) => { e.stopPropagation(); start(); }} className="neon-btn">
              {gameState === 'MENU' ? 'OYUNA BAŞLA' : 'REKORU TAZELE'}
            </button>

            <div className="leaderboard-card">
              <p className="leaderboard-title italic">DÜNYA SIRALAMASI</p>
              {leaderboard.length > 0 ? leaderboard.map((l, i) => (
                <div key={i} className="leaderboard-item">
                  <span>{i+1}. {l.name || 'Anonim'}</span>
                  <span className="text-white font-bold">{l.score}</span>
                </div>
              )) : <p className="text-[10px] text-center text-zinc-600">Yükleniyor...</p>}
            </div>
          </div>
        )}
      </div>
      <footer className="footer-sig">Purpleguy © 2026 - tablet power</footer>
    </div>
  );
};

export default DinoGame;
