import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GamePhase, Role, RoomData, RoomSettings } from './types';
import { ROLE_ICONS, ROLE_DESCRIPTIONS } from './constants';
import { supabase } from './services/supabaseClient';
import { confirmRole, joinRoom, startGame, updateSettings } from './services/roomApi';

const DEFAULT_SETTINGS: RoomSettings = {
  mafiaCount: 1,
  doctor: true,
  detective: true,
};

const normalizeSettings = (raw: any): RoomSettings => ({
  mafiaCount: typeof raw?.mafiaCount === 'number' ? raw.mafiaCount : 1,
  doctor: typeof raw?.doctor === 'boolean' ? raw.doctor : true,
  detective: typeof raw?.detective === 'boolean' ? raw.detective : true,
});

const App: React.FC = () => {
  const [phase, setPhase] = useState<GamePhase>(GamePhase.JOIN);
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [clientId] = useState(() => {
    const stored = localStorage.getItem('mafia_client_id');
    if (stored) return stored;
    const generated = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    localStorage.setItem('mafia_client_id', generated);
    return generated;
  });

  const loadRoomById = useCallback(async (id: string) => {
    const { data: roomRow, error: roomError } = await supabase
      .from('rooms')
      .select('id, status, settings')
      .eq('id', id)
      .single();

    if (roomError || !roomRow) {
      console.error('Failed to load room', roomError);
      return;
    }

    const { data: playerRows, error: playerError } = await supabase
      .from('players')
      .select('id, client_id, name, role, has_confirmed, is_host')
      .eq('room_id', id)
      .order('created_at', { ascending: true });

    if (playerError) {
      console.error('Failed to load players', playerError);
      return;
    }

    const players = (playerRows || []).map((p: any) => ({
      id: p.id,
      clientId: p.client_id,
      name: p.name,
      role: p.role || undefined,
      hasConfirmed: !!p.has_confirmed,
      isHost: !!p.is_host,
    }));

    setRoom({
      id: roomRow.id,
      status: roomRow.status,
      settings: normalizeSettings(roomRow.settings),
      players,
    });
  }, []);

  useEffect(() => {
    if (!roomId) return;

    let active = true;
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        () => {
          if (active) loadRoomById(roomId);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        () => {
          if (active) loadRoomById(roomId);
        },
      )
      .subscribe();

    loadRoomById(roomId);

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [roomId, loadRoomById]);

  const me = useMemo(
    () => room?.players.find((player) => player.clientId === clientId),
    [room, clientId],
  );

  useEffect(() => {
    if (!room) return;
    if (room.status === 'waiting') {
      setPhase(GamePhase.LOBBY);
      return;
    }
    if (room.status === 'started') {
      setPhase(me?.hasConfirmed ? GamePhase.WAITING_FOR_OTHERS : GamePhase.REVEAL);
      return;
    }
    if (room.status === 'finished') {
      setPhase(GamePhase.READY_TO_PLAY);
    }
  }, [room, me?.hasConfirmed]);

  const handleJoin = async () => {
    if (!playerName.trim() || !roomCode.trim()) return;
    setErrorMessage('');
    setIsBusy(true);
    const normalizedCode = roomCode.trim().toUpperCase();

    try {
      const { roomId: createdRoomId } = await joinRoom({
        roomCode: normalizedCode,
        playerName: playerName.trim(),
        clientId,
      });
      setRoomCode(normalizedCode);
      setRoomId(createdRoomId);
      await loadRoomById(createdRoomId);
      setPhase(GamePhase.LOBBY);
    } catch (error: any) {
      setErrorMessage(error?.message || 'NeuspeÅ¡no pridruÅ¾ivanje.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleStart = async () => {
    if (!roomCode) return;
    setErrorMessage('');
    setIsBusy(true);
    try {
      await startGame({ roomCode, clientId });
    } catch (error: any) {
      setErrorMessage(error?.message || 'NeuspeÅ¡an start.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!roomCode) return;
    setErrorMessage('');
    setIsBusy(true);
    try {
      await confirmRole({ roomCode, clientId });
    } catch (error: any) {
      setErrorMessage(error?.message || 'NeuspeÅ¡na potvrda.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleMafiaCountChange = async (delta: number) => {
    if (!roomCode || !room) return;
    const next = Math.max(1, (room.settings?.mafiaCount || 1) + delta);
    setErrorMessage('');
    setIsBusy(true);
    try {
      await updateSettings({
        roomCode,
        clientId,
        settings: {
          ...room.settings,
          mafiaCount: next,
        },
      });
    } catch (error: any) {
      setErrorMessage(error?.message || 'NeuspeÅ¡na promena podeÅ¡avanja.');
    } finally {
      setIsBusy(false);
    }
  };

  const players = room?.players ?? [];
  const settings = room?.settings ?? DEFAULT_SETTINGS;

  return (
    <div className="min-h-screen bg-[#050505] text-[#eee] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm bg-[#111] border border-[#222] rounded-3xl p-8 shadow-2xl">
        {/* HEADER */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-red-700 tracking-tighter uppercase mb-1">Mafia Card</h1>
          <p className="text-[10px] text-gray-500 tracking-[0.3em] uppercase">Digitalni delilac uloga</p>
          {roomCode && (
            <div className="mt-4 inline-block bg-red-900/20 border border-red-900/40 px-4 py-1 rounded-full text-red-500 font-mono text-sm tracking-widest font-bold">
              KOD: {roomCode.toUpperCase()}
            </div>
          )}
          {errorMessage && (
            <div className="mt-3 text-[11px] text-red-400">{errorMessage}</div>
          )}
        </div>

        {/* PHASE: JOIN */}
        {phase === GamePhase.JOIN && (
          <div className="space-y-4">
            <input
              className="w-full bg-[#1a1a1a] border border-[#333] p-4 rounded-2xl outline-none focus:border-red-700 transition-colors"
              placeholder="Tvoje ime"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            <input
              className="w-full bg-[#1a1a1a] border border-[#333] p-4 rounded-2xl outline-none focus:border-red-700 transition-colors uppercase font-mono"
              placeholder="Å ifra sobe"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
            />
            <button
              onClick={handleJoin}
              disabled={isBusy}
              className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-60 text-white font-bold py-4 rounded-2xl transition-transform active:scale-95 shadow-lg shadow-red-900/20"
            >
              UÄ‘i u sobu
            </button>
          </div>
        )}

        {/* PHASE: LOBBY */}
        {phase === GamePhase.LOBBY && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-[#222] pb-2">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                IgraÄi ({players.length})
              </h2>
              {me?.isHost && <span className="text-[10px] bg-red-900 text-white px-2 rounded">Ti si Host</span>}
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {players.map((player) => (
                <div key={player.id} className="flex justify-between items-center bg-[#1a1a1a] p-3 rounded-xl border border-[#222]">
                  <span className="text-sm font-medium">
                    {player.name} {player.clientId === clientId && "(Ti)"}
                  </span>
                  <i className="fas fa-check-circle text-green-800 text-xs"></i>
                </div>
              ))}
            </div>

            {me?.isHost ? (
              <div className="space-y-4 pt-4 border-t border-[#222]">
                <div className="flex justify-between items-center px-2">
                  <span className="text-xs text-gray-400">Broj MafijaÅ¡a:</span>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleMafiaCountChange(-1)}
                      disabled={isBusy}
                      className="w-8 h-8 bg-[#222] rounded-lg disabled:opacity-60"
                    >
                      -
                    </button>
                    <span className="font-bold text-red-500">{settings.mafiaCount}</span>
                    <button
                      onClick={() => handleMafiaCountChange(1)}
                      disabled={isBusy}
                      className="w-8 h-8 bg-[#222] rounded-lg disabled:opacity-60"
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleStart}
                  disabled={isBusy}
                  className="w-full bg-red-700 py-4 rounded-2xl font-bold uppercase tracking-widest text-sm disabled:opacity-60"
                >
                  Podeli uloge
                </button>
              </div>
            ) : (
              <p className="text-center text-xs text-gray-500 italic animate-pulse">
                ÄŒekamo da domaÄ‡in podeli uloge...
              </p>
            )}
          </div>
        )}

        {/* PHASE: REVEAL */}
        {phase === GamePhase.REVEAL && (
          <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
            <p className="text-gray-400 text-sm italic">Tvoja tajna uloga je...</p>

            <div className="bg-[#1a1a1a] py-12 rounded-3xl border-2 border-red-900/30 shadow-inner relative group cursor-pointer overflow-hidden">
              {/* Overlay da se uloga ne vidi odmah */}
              <div className="absolute inset-0 bg-[#111] border border-[#333] rounded-3xl flex items-center justify-center z-10 group-active:opacity-0 transition-opacity duration-300">
                <span className="text-red-700 font-black tracking-widest uppercase">DRÅ½I ZA PRIKAZ</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="text-7xl mb-4">{ROLE_ICONS[me?.role || Role.VILLAGER]}</div>
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{me?.role}</h3>
                <p className="text-[10px] text-gray-500 mt-2 px-6">
                  {ROLE_DESCRIPTIONS[me?.role || Role.VILLAGER]}
                </p>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={isBusy}
              className="w-full bg-white text-black font-black py-4 rounded-2xl uppercase tracking-widest text-sm shadow-xl disabled:opacity-60"
            >
              Video sam ulogu
            </button>
          </div>
        )}

        {/* PHASE: WAITING FOR OTHERS */}
        {phase === GamePhase.WAITING_FOR_OTHERS && (
          <div className="text-center space-y-6 py-8">
            <div className="flex justify-center space-x-2">
              <div className="w-2 h-2 bg-red-700 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-red-700 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-2 h-2 bg-red-700 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
            <h2 className="text-xl font-bold uppercase tracking-tighter">ÄŒekamo ostale...</h2>
            <div className="space-y-2">
              {players.map((player) => (
                <div key={player.id} className="text-[10px] uppercase tracking-widest flex justify-center items-center space-x-2">
                  <span className={player.hasConfirmed ? 'text-green-500' : 'text-gray-600'}>{player.name}</span>
                  {player.hasConfirmed ? (
                    <i className="fas fa-check text-[8px]"></i>
                  ) : (
                    <i className="fas fa-clock text-[8px]"></i>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PHASE: READY TO PLAY */}
        {phase === GamePhase.READY_TO_PLAY && (
          <div className="text-center space-y-8 py-4 animate-in slide-in-from-bottom duration-700">
            <div className="text-6xl text-red-700">
              <i className="fas fa-mask"></i>
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Spremni!</h2>
              <p className="text-gray-500 text-sm mt-2 italic">
                Svi igraÄi su videli svoje uloge. OdloÅ¾ite telefone i zapoÄnite igru uÅ¾ivo.
              </p>
            </div>
            <div className="h-px bg-[#222] w-full"></div>
            <button
              onClick={() => window.location.reload()}
              className="text-gray-500 text-[10px] uppercase tracking-widest hover:text-white transition-colors"
            >
              Nova podela uloga
            </button>
          </div>
        )}
      </div>

      <footer className="mt-12 text-[10px] text-gray-700 tracking-[0.5em] uppercase flex items-center space-x-2">
        <i className="fas fa-fingerprint"></i>
        <span>Mafia Card Dealer</span>
      </footer>
    </div>
  );
};

export default App;
