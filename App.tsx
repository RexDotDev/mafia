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

type EntryMode = 'join' | 'create';

const generateRoomCode = () => Math.floor(100000 + Math.random() * 900000).toString();
const SESSION_KEY = 'mafia_session_v1';

const App: React.FC = () => {
  const [entryMode, setEntryMode] = useState<EntryMode>('join');
  const [phase, setPhase] = useState<GamePhase>(GamePhase.JOIN);
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [draftSettings, setDraftSettings] = useState<RoomSettings>(DEFAULT_SETTINGS);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [hasRestoredSession, setHasRestoredSession] = useState(false);
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

  const joinWithPayload = async (code: string, name: string, settings?: RoomSettings) => {
    setErrorMessage('');
    setIsBusy(true);
    try {
      const { roomId: createdRoomId } = await joinRoom({
        roomCode: code,
        playerName: name,
        clientId,
        settings,
      });
      setRoomCode(code);
      setRoomId(createdRoomId);
      localStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode: code, playerName: name }));
      await loadRoomById(createdRoomId);
      setPhase(GamePhase.LOBBY);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Neuspešno pridruživanje.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleJoin = async () => {
    if (!playerName.trim() || !roomCode.trim()) return;
    const normalizedCode = roomCode.replace(/\D/g, '').slice(0, 6);
    if (normalizedCode.length !== 6) {
      setErrorMessage('Unesi šifru od 6 cifara.');
      return;
    }
    const settings = entryMode === 'create' ? draftSettings : undefined;
    await joinWithPayload(normalizedCode, playerName.trim(), settings);
  };

  const handleStart = async () => {
    if (!roomCode) return;
    setErrorMessage('');
    setIsBusy(true);
    try {
      await startGame({ roomCode, clientId });
    } catch (error: any) {
      setErrorMessage(error?.message || 'Neuspešan start.');
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
      setErrorMessage(error?.message || 'Neuspešna potvrda.');
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
      setErrorMessage(error?.message || 'Neuspešna promena podešavanja.');
    } finally {
      setIsBusy(false);
    }
  };

  const players = room?.players ?? [];
  const settings = room?.settings ?? DEFAULT_SETTINGS;

  const handleModeChange = (mode: EntryMode) => {
    setEntryMode(mode);
    setErrorMessage('');
    if (mode === 'create') {
      setRoomCode(generateRoomCode());
      setDraftSettings(DEFAULT_SETTINGS);
    } else {
      setRoomCode('');
    }
  };

  const handleCopyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    } finally {
      setTimeout(() => setCopyStatus('idle'), 1500);
    }
  };

  const handleDraftMafiaChange = (delta: number) => {
    setDraftSettings((prev) => ({
      ...prev,
      mafiaCount: Math.max(1, prev.mafiaCount + delta),
    }));
  };

  const toggleDraftSetting = (key: 'doctor' | 'detective') => {
    setDraftSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLeaveRoom = () => {
    localStorage.removeItem(SESSION_KEY);
    setRoom(null);
    setRoomId(null);
    setRoomCode('');
    setPhase(GamePhase.JOIN);
  };

  useEffect(() => {
    if (hasRestoredSession) return;
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      setHasRestoredSession(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as { roomCode?: string; playerName?: string };
      if (parsed?.roomCode && parsed?.playerName) {
        setEntryMode('join');
        setPlayerName(parsed.playerName);
        setRoomCode(parsed.roomCode);
        joinWithPayload(parsed.roomCode, parsed.playerName).finally(() => {
          setHasRestoredSession(true);
        });
        return;
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
    setHasRestoredSession(true);
  }, [hasRestoredSession]);

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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleModeChange('create')}
                className={`flex-1 py-2 rounded-xl text-xs uppercase tracking-widest font-bold transition-colors ${
                  entryMode === 'create' ? 'bg-red-700 text-white' : 'bg-[#1a1a1a] text-gray-400'
                }`}
              >
                Kreiraj
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('join')}
                className={`flex-1 py-2 rounded-xl text-xs uppercase tracking-widest font-bold transition-colors ${
                  entryMode === 'join' ? 'bg-red-700 text-white' : 'bg-[#1a1a1a] text-gray-400'
                }`}
              >
                Pridruži se
              </button>
            </div>
            <input
              className="w-full bg-[#1a1a1a] border border-[#333] p-4 rounded-2xl outline-none focus:border-red-700 transition-colors"
              placeholder="Tvoje ime"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            {entryMode === 'join' ? (
              <input
                className="w-full bg-[#1a1a1a] border border-[#333] p-4 rounded-2xl outline-none focus:border-red-700 transition-colors uppercase font-mono tracking-widest"
                placeholder="Šifra sobe (6 cifara)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
              />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    className="min-w-0 flex-1 bg-[#1a1a1a] border border-[#333] p-3 sm:p-4 rounded-2xl outline-none uppercase font-mono tracking-[0.2em] sm:tracking-[0.4em] text-center text-sm sm:text-base"
                    value={roomCode}
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => setRoomCode(generateRoomCode())}
                    className="px-2 sm:px-3 py-2 rounded-xl bg-[#1a1a1a] border border-[#333] text-[9px] sm:text-[10px] uppercase tracking-widest text-gray-400"
                  >
                    Novi kod
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#1a1a1a] border border-[#333] flex items-center justify-center"
                    aria-label="Kopiraj kod"
                    title={copyStatus === 'copied' ? 'Kopirano' : copyStatus === 'error' ? 'Greška' : 'Kopiraj'}
                  >
                    {copyStatus === 'copied' ? (
                      <i className="fas fa-check text-green-500 text-sm"></i>
                    ) : copyStatus === 'error' ? (
                      <i className="fas fa-times text-red-500 text-sm"></i>
                    ) : (
                      <img src="/copy-icon.png" alt="Kopiraj" className="w-4 h-4 opacity-80" />
                    )}
                  </button>
                </div>
                <div className="bg-[#0e0e0e] border border-[#222] rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Broj Mafijaša:</span>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => handleDraftMafiaChange(-1)}
                        className="w-8 h-8 bg-[#222] rounded-lg"
                      >
                        -
                      </button>
                      <span className="font-bold text-red-500">{draftSettings.mafiaCount}</span>
                      <button
                        type="button"
                        onClick={() => handleDraftMafiaChange(1)}
                        className="w-8 h-8 bg-[#222] rounded-lg"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleDraftSetting('doctor')}
                      className={`flex-1 py-2 rounded-xl text-[11px] uppercase tracking-widest font-bold ${
                        draftSettings.doctor ? 'bg-green-700 text-white' : 'bg-[#1a1a1a] text-gray-400'
                      }`}
                    >
                      Doktor
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleDraftSetting('detective')}
                      className={`flex-1 py-2 rounded-xl text-[11px] uppercase tracking-widest font-bold ${
                        draftSettings.detective ? 'bg-yellow-700 text-white' : 'bg-[#1a1a1a] text-gray-400'
                      }`}
                    >
                      Inspektor
                    </button>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={handleJoin}
              disabled={isBusy}
              className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-60 text-white font-bold py-4 rounded-2xl transition-transform active:scale-95 shadow-lg shadow-red-900/20"
            >
              {entryMode === 'create' ? 'Kreiraj sobu' : 'Uđi u sobu'}
            </button>
          </div>
        )}

        {/* PHASE: LOBBY */}
        {phase === GamePhase.LOBBY && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-[#222] pb-2">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                Igrači ({players.length})
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
                  <span className="text-xs text-gray-400">Broj Mafijaša:</span>
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
                <button
                  onClick={handleLeaveRoom}
                  className="w-full text-gray-400 text-[10px] uppercase tracking-widest hover:text-white transition-colors"
                >
                  Napusti sobu
                </button>
              </div>
            ) : (
              <p className="text-center text-xs text-gray-500 italic animate-pulse">
                Čekamo da domaćin podeli uloge...
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
                <span className="text-red-700 font-black tracking-widest uppercase select-none">DRŽI ZA PRIKAZ</span>
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
            <h2 className="text-xl font-bold uppercase tracking-tighter">Čekamo ostale...</h2>
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
            <button
              onClick={handleLeaveRoom}
              className="text-gray-500 text-[10px] uppercase tracking-widest hover:text-white transition-colors"
            >
              Napusti sobu
            </button>
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
                Svi igrači su videli svoje uloge. Odložite telefone i započnite igru uživo.
              </p>
            </div>
            <div className="h-px bg-[#222] w-full"></div>
            <button
              onClick={() => window.location.reload()}
              className="text-gray-500 text-[10px] uppercase tracking-widest hover:text-white transition-colors"
            >
              Nova podela uloga
            </button>
            <button
              onClick={handleLeaveRoom}
              className="text-gray-500 text-[10px] uppercase tracking-widest hover:text-white transition-colors"
            >
              Napusti sobu
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
