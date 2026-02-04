import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GamePhase, Role, RoomData, RoomSettings } from './types';
import { ROLE_ICONS, ROLE_DESCRIPTIONS } from './constants';
import { supabase } from './services/supabaseClient';
import { confirmRole, joinRoom, resetGame, startGame, updateSettings } from './services/roomApi';

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

    const players = (playerRows || []).map((player: any) => ({
      id: player.id,
      clientId: player.client_id,
      name: player.name,
      role: player.role || undefined,
      hasConfirmed: !!player.has_confirmed,
      isHost: !!player.is_host,
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

  const handleResetGame = async () => {
    if (!roomCode) return;
    setErrorMessage('');
    setIsBusy(true);
    try {
      await resetGame({ roomCode, clientId });
    } catch (error: any) {
      setErrorMessage(error?.message || 'Neuspešno resetovanje.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleLeaveRoom = () => {
    localStorage.removeItem(SESSION_KEY);
    setRoom(null);
    setRoomId(null);
    setRoomCode(generateRoomCode());
    setPhase(GamePhase.JOIN);
    setEntryMode('create');
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

  if (!hasRestoredSession) {
    return (
      <div className="app-bg">
        <div className="app-shell flex min-h-screen items-center justify-center px-5 py-12">
          <div className="w-full max-w-md rounded-[28px] border border-black/10 bg-white/80 px-8 py-10 shadow-[0_30px_80px_rgba(15,15,15,0.18)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.4em] text-black/45">Priprema</p>
                <h1 className="title-font text-3xl text-black">MAFIJA</h1>
                <p className="mt-2 text-xs text-black/60">Podesavamo sobu i konekciju.</p>
              </div>
              <div className="h-11 w-11 rounded-2xl border border-black/10 bg-white text-red-600 flex items-center justify-center shadow-sm">
                <i className="fas fa-mask"></i>
              </div>
            </div>
            <div className="mt-8 rounded-2xl border border-black/10 bg-[#f9f6f2] p-4">
              <div className="flex justify-center space-x-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-bounce"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-bounce [animation-delay:0.2s]"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-bounce [animation-delay:0.4s]"></div>
              </div>
              <p className="mt-3 text-center text-[10px] uppercase tracking-[0.35em] text-black/45">Ucitavanje...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-bg">
      <div className="app-shell flex min-h-screen flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-5xl">
          <div className="relative">
            <div className="absolute -inset-1 rounded-[36px] bg-gradient-to-br from-red-600/25 via-amber-400/25 to-transparent blur-2xl"></div>
            <div className="relative overflow-hidden rounded-[32px] border border-black/10 bg-white/80 shadow-[0_35px_90px_rgba(12,12,12,0.18)] backdrop-blur">
              <div className="grid md:grid-cols-[280px,1fr]">
                <aside className="flex flex-col gap-6 bg-[#f9f6f1] p-6 md:p-8 border-b md:border-b-0 md:border-r border-black/10">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.4em] text-black/45">Nocna igra</p>
                      <h1 className="title-font text-4xl md:text-5xl text-black">MAFIJA</h1>
                      <p className="mt-2 text-sm text-black/60">Diskretan diler uloga za igru uzivo.</p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl border border-black/10 bg-white text-red-600 flex items-center justify-center shadow-sm">
                      <i className="fas fa-mask"></i>
                    </div>
                  </div>

                  {roomCode.length === 6 && (
                    <div className="rounded-2xl border border-black/10 bg-white/90 p-4 shadow-sm">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-black/45">Sifra sobe</p>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="font-mono text-xl tracking-[0.35em] text-black">{roomCode.toUpperCase()}</span>
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="rounded-xl border border-black/10 bg-white px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-black/70 hover:text-black transition"
                        >
                          {copyStatus === 'copied' ? 'Kopirano' : copyStatus === 'error' ? 'Greska' : 'Kopiraj'}
                        </button>
                      </div>
                    </div>
                  )}

                  {phase === GamePhase.JOIN && entryMode === 'create' && (
                    <button
                      type="button"
                      onClick={() => setRoomCode(generateRoomCode())}
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-[10px] uppercase tracking-[0.35em] text-black/70 hover:text-black transition"
                    >
                      Novi kod
                    </button>
                  )}

                  <div className="rounded-2xl border border-black/10 bg-white/80 p-4 text-xs text-black/60">
                    <div className="flex items-center gap-2 text-black/60">
                      <span className="h-2 w-2 rounded-full bg-red-500"></span>
                      <span>Privatno deljenje uloga</span>
                    </div>
                    <p className="mt-2 leading-relaxed">
                      Telefoni samo za uloge. Glasanje i eliminacije idu uzivo.
                    </p>
                  </div>
                </aside>

                <main className="p-6 md:p-10 bg-white/70">
                  {errorMessage && (
                    <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                      {errorMessage}
                    </div>
                  )}

                  {phase === GamePhase.JOIN && (
                    <div className="space-y-6">
                      <div className="rounded-2xl border border-black/10 bg-black/5 p-1 flex">
                        <button
                          type="button"
                          onClick={() => handleModeChange('create')}
                          className={`flex-1 py-2 rounded-xl text-[11px] uppercase tracking-[0.3em] font-semibold transition-colors ${
                            entryMode === 'create' ? 'bg-white text-black shadow-sm' : 'text-black/50'
                          }`}
                        >
                          Kreiraj
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModeChange('join')}
                          className={`flex-1 py-2 rounded-xl text-[11px] uppercase tracking-[0.3em] font-semibold transition-colors ${
                            entryMode === 'join' ? 'bg-white text-black shadow-sm' : 'text-black/50'
                          }`}
                        >
                          Pridruzi se
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] uppercase tracking-[0.3em] text-black/50">Ime igraca</label>
                        <input
                          className="w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-red-400/50"
                          placeholder="Tvoje ime"
                          value={playerName}
                          onChange={(event) => setPlayerName(event.target.value)}
                        />
                      </div>

                      {entryMode === 'join' ? (
                        <div className="space-y-2">
                          <label className="text-[11px] uppercase tracking-[0.3em] text-black/50">Sifra sobe</label>
                          <input
                            className="w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm uppercase font-mono tracking-[0.35em] text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-red-400/50"
                            placeholder="6 cifara"
                            value={roomCode}
                            onChange={(event) => setRoomCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                            inputMode="numeric"
                          />
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-black/10 bg-[#f9f6f1] p-4 space-y-4">
                          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.35em] text-black/50">
                            <span>Postavke sobe</span>
                            <span className="text-black/40">Host</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-black/70">Broj Mafijasa</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleDraftMafiaChange(-1)}
                                className="h-9 w-9 rounded-xl border border-black/10 bg-white text-sm font-semibold text-black/70 hover:text-black"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-semibold text-black">{draftSettings.mafiaCount}</span>
                              <button
                                type="button"
                                onClick={() => handleDraftMafiaChange(1)}
                                className="h-9 w-9 rounded-xl border border-black/10 bg-white text-sm font-semibold text-black/70 hover:text-black"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => toggleDraftSetting('doctor')}
                              className={`rounded-xl py-2 text-[10px] uppercase tracking-[0.3em] font-semibold ${
                                draftSettings.doctor
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white text-black/60 border border-black/10'
                              }`}
                            >
                              Doktor
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleDraftSetting('detective')}
                              className={`rounded-xl py-2 text-[10px] uppercase tracking-[0.3em] font-semibold ${
                                draftSettings.detective
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-white text-black/60 border border-black/10'
                              }`}
                            >
                              Inspektor
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={handleJoin}
                        disabled={isBusy}
                        className="w-full rounded-2xl bg-red-600 text-white font-semibold py-4 uppercase tracking-[0.3em] text-xs shadow-[0_15px_30px_rgba(185,28,28,0.25)] hover:bg-red-500 disabled:opacity-60 transition"
                      >
                        {entryMode === 'create' ? 'Kreiraj sobu' : 'Udji u sobu'}
                      </button>
                    </div>
                  )}

                  {phase === GamePhase.LOBBY && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-[11px] uppercase tracking-[0.35em] text-black/50">
                          Igraci ({players.length})
                        </h2>
                        {me?.isHost && (
                          <span className="rounded-full bg-black text-white text-[10px] px-3 py-1 uppercase tracking-[0.3em]">
                            Host
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {players.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/80 px-4 py-3"
                          >
                            <span className="text-sm font-medium text-black/80">
                              {player.name} {player.clientId === clientId && '(Ti)'}
                            </span>
                            <i className="fas fa-check-circle text-emerald-600 text-xs"></i>
                          </div>
                        ))}
                      </div>

                      {me?.isHost ? (
                        <div className="rounded-2xl border border-black/10 bg-[#f9f6f1] p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-black/70">Broj Mafijasa</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleMafiaCountChange(-1)}
                                disabled={isBusy}
                                className="h-9 w-9 rounded-xl border border-black/10 bg-white text-sm font-semibold text-black/70 hover:text-black disabled:opacity-60"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-semibold text-black">{settings.mafiaCount}</span>
                              <button
                                onClick={() => handleMafiaCountChange(1)}
                                disabled={isBusy}
                                className="h-9 w-9 rounded-xl border border-black/10 bg-white text-sm font-semibold text-black/70 hover:text-black disabled:opacity-60"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={handleStart}
                            disabled={isBusy}
                            className="w-full rounded-2xl bg-black py-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-white hover:bg-black/90 disabled:opacity-60"
                          >
                            Podeli uloge
                          </button>
                          <button
                            onClick={handleLeaveRoom}
                            className="w-full rounded-2xl border border-black/10 bg-white py-3 text-[10px] uppercase tracking-[0.35em] text-black/60 hover:text-black transition"
                          >
                            Napusti sobu
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-black/10 bg-white/80 p-4 text-center space-y-4">
                          <p className="text-xs text-black/60 italic">Cekamo da domacin podeli uloge...</p>
                          <button
                            onClick={handleLeaveRoom}
                            className="w-full rounded-2xl border border-black/10 bg-white py-3 text-[10px] uppercase tracking-[0.35em] text-black/60 hover:text-black transition"
                          >
                            Napusti sobu
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {phase === GamePhase.REVEAL && (
                    <div className="text-center space-y-8">
                      <p className="text-sm text-black/60 italic">Tvoja tajna uloga je...</p>

                      <div className="relative overflow-hidden rounded-[28px] border border-black/10 bg-white/90 px-6 py-12 shadow-sm group">
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 backdrop-blur-sm transition-opacity duration-300 group-active:opacity-0">
                          <span className="title-font text-base uppercase tracking-[0.4em] text-black/70">
                            Drzi za prikaz
                          </span>
                        </div>

                        <div className="relative flex flex-col items-center">
                          <div className="text-6xl mb-4">{ROLE_ICONS[me?.role || Role.VILLAGER]}</div>
                          <h3 className="title-font text-3xl text-black uppercase tracking-tight">{me?.role}</h3>
                          <p className="mt-3 text-xs text-black/55 px-4">
                            {ROLE_DESCRIPTIONS[me?.role || Role.VILLAGER]}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleConfirm}
                        disabled={isBusy}
                        className="w-full rounded-2xl bg-black text-white font-semibold py-4 uppercase tracking-[0.3em] text-xs shadow-[0_20px_40px_rgba(0,0,0,0.2)] disabled:opacity-60"
                      >
                        Video sam ulogu
                      </button>
                    </div>
                  )}

                  {phase === GamePhase.WAITING_FOR_OTHERS && (
                    <div className="text-center space-y-6 py-6">
                      <div className="flex justify-center space-x-2">
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-bounce"></div>
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      </div>
                      <h2 className="title-font text-2xl text-black">Cekamo ostale...</h2>
                      <div className="rounded-2xl border border-black/10 bg-white/80 p-4 space-y-2">
                        {players.map((player) => (
                          <div
                            key={player.id}
                            className="text-[10px] uppercase tracking-[0.35em] flex justify-between items-center"
                          >
                            <span className={player.hasConfirmed ? 'text-emerald-600' : 'text-black/40'}>
                              {player.name}
                            </span>
                            {player.hasConfirmed ? (
                              <i className="fas fa-check text-[10px]"></i>
                            ) : (
                              <i className="fas fa-clock text-[10px] text-black/40"></i>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={handleLeaveRoom}
                        className="w-full rounded-2xl border border-black/10 bg-white py-3 text-[10px] uppercase tracking-[0.35em] text-black/60 hover:text-black transition"
                      >
                        Napusti sobu
                      </button>
                    </div>
                  )}

                  {phase === GamePhase.READY_TO_PLAY && (
                    <div className="text-center space-y-6 py-4">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600 text-white shadow-[0_18px_40px_rgba(185,28,28,0.25)]">
                        <i className="fas fa-mask"></i>
                      </div>
                      <div>
                        <h2 className="title-font text-3xl text-black">Spremni!</h2>
                        <p className="mt-2 text-sm text-black/60">
                          Svi igraci su videli svoje uloge. Odlozite telefone i pocnite igru uzivo.
                        </p>
                      </div>
                      <div className="h-px bg-black/10 w-full"></div>
                      <div className="space-y-3">
                        {me?.isHost && (
                          <button
                            onClick={handleResetGame}
                            disabled={isBusy}
                            className="w-full rounded-2xl bg-black py-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-white hover:bg-black/90 disabled:opacity-60"
                          >
                            Nova podela uloga
                          </button>
                        )}
                        <button
                          onClick={handleLeaveRoom}
                          className="w-full rounded-2xl border border-black/10 bg-white py-3 text-[10px] uppercase tracking-[0.35em] text-black/60 hover:text-black transition"
                        >
                          Napusti sobu
                        </button>
                      </div>
                    </div>
                  )}
                </main>
              </div>
            </div>
          </div>

          <footer className="mt-8 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.4em] text-black/40">
            <i className="fas fa-fingerprint"></i>
            <span>Mafia Card Dealer</span>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default App;
