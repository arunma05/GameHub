import React from 'react';
import { socket } from '../socket';
import type { Room, Player } from '../types';
import { Play, Copy, Users } from 'lucide-react';

interface LobbyProps {
  room: Room;
  me: Player;
}

export const Lobby: React.FC<LobbyProps> = ({ room, me }) => {
  const isHost = room.hostId === me.id;
  const isSinglePlayer = room.type === 'flappy' || room.type === 'sudoku' || room.type === 'kakuro' || room.type === 'quiz' || room.type === 'typeracer' || room.type === 'gridorder' || room.type === 'memory';
  const canStart = isSinglePlayer ? room.players.length >= 1 : room.players.length >= 2;

  const handleCopyCode = async () => {
    const text = room.id;
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Copy fallback failed', err);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleStartGame = () => {
    if (canStart) socket.emit('start-game', { roomId: room.id });
  };

  return (
    <div className="container animate-fade-in" style={{ alignItems: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Room Code */}
        <div style={{ textAlign: 'center', borderBottom: '1px solid var(--item-border)', paddingBottom: '2rem' }}>
          <div style={{ marginBottom: '1rem', color: 'var(--accent)', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
             {room.type === 'typeracer' ? '🏎️ TYPERACER LOBBY' : 
              room.type === 'chess' ? '♘ CHESS LOBBY' : 
              room.type === 'flappy' ? '🐦 FLAPPY LOBBY' :
              room.type === 'quiz' ? '🧠 TRIVIA LOBBY' :
              room.type === 'cssbattle' ? '🎨 CSS BATTLE LOBBY' :
              room.type === 'sudoku' ? '🧩 SUDOKU LOBBY' :
              room.type === 'kakuro' ? '🧩 KAKURO LOBBY' : 
              room.type === 'sixteencoins' ? '⚔️ 16 COINS LOBBY' : 
              room.type === 'gridorder' ? '🔢 GRID ORDER LOBBY' :
              room.type === 'memory' ? '🧠 REMEMBER ME LOBBY' :
              '🎱 BINGO LOBBY'}
          </div>
          <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Room Code
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
            <h1 className="responsive-title" style={{ margin: 0, letterSpacing: '0.25em' }}>{room.id}</h1>
            <button className="btn btn-outline" onClick={handleCopyCode} style={{ padding: '0.75rem' }} title="Copy Code">
              <Copy size={22} />
            </button>
          </div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Share this code with others to join</p>
        </div>

        {/* Player List */}
        <div>
          <h3 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
            <Users size={20} />
            Players ({room.players.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: 'var(--item-bg)', borderRadius: '16px', border: '1px solid var(--item-border)' }}>
            {room.players.map(p => (
              <div key={p.id} style={{
                padding: '0.85rem 1.25rem',
                background: 'var(--card-bg)',
                borderRadius: '12px',
                border: '1px solid var(--item-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}>
                <span style={{ fontWeight: p.id === me.id ? 800 : 600, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  {p.name}
                  {p.id === me.id && <span style={{ color: 'var(--accent)', fontSize: '0.85rem', marginLeft: '0.5rem', fontWeight: 800 }}>(You)</span>}
                </span>
                {p.id === room.hostId && (
                  <span style={{ background: 'var(--accent)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 900, boxShadow: '0 4px 10px var(--accent-glow)' }}>
                    HOST
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Start / Wait */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          {isHost ? (
            <>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleStartGame}
                disabled={!canStart}
                style={{ width: '100%', opacity: canStart ? 1 : 0.5 }}
              >
                <Play size={22} fill="currentColor" />
                Start Game
              </button>
              {!canStart && !isSinglePlayer && (
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  Waiting for at least 1 more player to join…
                </p>
              )}
            </>
          ) : (
            <div style={{
              padding: '1.25rem 2rem', background: 'var(--item-bg)', border: '1px solid var(--item-border)',
              borderRadius: '16px', color: 'var(--text-secondary)', textAlign: 'center', width: '100%'
            }}>
              Waiting for <strong style={{ color: 'var(--accent)' }}>
                {room.players.find(p => p.id === room.hostId)?.name}
              </strong> to start the game…
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
