import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GamePhase, Role, RoomData, RoomSettings } from './types';
import { ROLE_ICONS, ROLE_DESCRIPTIONS } from './constants';
import { supabase } from './services/supabaseClient';
import { confirmRole, joinRoom, leaveRoom, pingRoom, resetGame, startGame, updateSettings } from './services/roomApi';

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
type ThemeMode = 'light' | 'dark';

const generateRoomCode = () => Math.floor(100000 + Math.random() * 900000).toString();
const SESSION_KEY = 'mafia_session_v1';
const THEME_KEY = 'mafia_theme_v1';

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
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });
  const [clientId] = useState(() => {
    const stored = localStorage.getItem('mafia_client_id');
    if (stored) return stored;
    const generated = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    localStorage.setItem('mafia_client_id', generated);
    return generated;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

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
      .select('id, client_id, name, role, has_confirmed, is_host, is_narrator')
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
      isNarrator: !!player.is_narrator,
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

  useEffect(() => {
    if (!roomId || !roomCode) return;
    let active = true;
    const sendPing = async () => {
      if (!active) return;
      try {
        await pingRoom({ roomCode, clientId });
      } catch (error) {
        console.warn('Heartbeat failed', error);
      }
    };

    sendPing();
    const interval = setInterval(sendPing, 45000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [roomId, roomCode, clientId]);

  const me = useMemo(
    () => room?.players.find((player) => player.clientId === clientId),
    [room, clientId],
  );

  const narrator = useMemo(
    () => room?.players.find((player) => player.isNarrator),
    [room],
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

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const themeToggleFloating = (
    <button
      type="button"
      onClick={handleThemeToggle}
      className="hidden md:flex fixed right-4 top-4 sm:right-6 sm:top-6 z-50 h-11 w-11 items-center justify-center rounded-full border border-[color:var(--line)] bg-[var(--surface-strong)] text-[color:var(--ink)] hover:opacity-80 transition"
      aria-label="Promeni temu"
      title={theme === 'light' ? 'Tamna tema' : 'Svetla tema'}
    >
      <i className={`fas ${theme === 'light' ? 'fa-moon' : 'fa-sun'}`}></i>
    </button>
  );

  const themeToggleInline = (
    <button
      type="button"
      onClick={handleThemeToggle}
      className="md:hidden h-10 w-10 rounded-full border border-[color:var(--line)] bg-[var(--surface-strong)] text-[color:var(--ink)] hover:opacity-80 transition"
      aria-label="Promeni temu"
      title={theme === 'light' ? 'Tamna tema' : 'Svetla tema'}
    >
      <i className={`fas ${theme === 'light' ? 'fa-moon' : 'fa-sun'}`}></i>
    </button>
  );

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

  const handleLeaveRoom = async () => {
    const code = roomCode;
    localStorage.removeItem(SESSION_KEY);
    setRoom(null);
    setRoomId(null);
    setRoomCode(generateRoomCode());
    setPhase(GamePhase.JOIN);
    setEntryMode('create');

    if (!code) return;
    try {
      await leaveRoom({ roomCode: code, clientId });
    } catch (error) {
      console.error('Failed to leave room', error);
    }
  };

  const narratorPanel = (
    <div className="text-center space-y-5 sm:space-y-6 py-2">
      <div>
        <h2 className="title-font text-3xl text-[color:var(--ink)]">Narator</h2>
        <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
          Ti vodis igru. Imas pregled svih uloga i ne ucestvujes u glasanjima.
        </p>
        {room?.status === 'finished' && (
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-emerald-600">Svi su videli uloge</p>
        )}
      </div>
      <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 space-y-3">
        <p className="text-[10px] uppercase tracking-[0.35em] text-[color:var(--ink-faint)]">Uloge igraca</p>
        {players
          .filter((player) => !player.isNarrator)
          .map((player) => (
            (() => {
              const role = player.role || Role.VILLAGER;
              const nameTone =
                role === Role.MAFIA
                  ? 'text-red-600'
                  : role === Role.DOCTOR
                    ? 'text-emerald-600'
                    : role === Role.DETECTIVE
                      ? 'text-amber-600'
                      : 'text-[color:var(--ink)]';

              return (
            <div
              key={player.id}
              className="flex items-center justify-between rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-3 py-2"
            >
              <span className={`text-sm font-bold ${nameTone}`}>{player.name}</span>
              <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em]">
                <span className="text-base leading-none text-[color:var(--ink)]">
                  {ROLE_ICONS[player.role || Role.VILLAGER]}
                </span>
                <span>{player.role || 'Uloga'}</span>
              </span>
            </div>
              );
            })()
          ))}
      </div>
      <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 space-y-2">
        <p className="text-[10px] uppercase tracking-[0.35em] text-[color:var(--ink-faint)]">Potvrde uloga</p>
        {players
          .filter((player) => !player.isNarrator)
          .map((player) => (
            <div
              key={player.id}
              className="text-[10px] uppercase tracking-[0.35em] flex justify-between items-center"
            >
              <span className={player.hasConfirmed ? 'text-emerald-600' : 'text-[color:var(--ink-soft)]'}>
                {player.name}
              </span>
              {player.hasConfirmed ? (
                <i className="fas fa-check text-[10px]"></i>
              ) : (
                <i className="fas fa-clock text-[10px] text-[color:var(--ink-soft)]"></i>
              )}
            </div>
          ))}
      </div>
      {me?.isHost && (
        <button
          onClick={handleResetGame}
          disabled={isBusy}
          className="w-full rounded-2xl bg-[var(--ink)] py-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-[color:var(--paper)] hover:opacity-90 disabled:opacity-60"
        >
          Nova podela uloga
        </button>
      )}
      <button
        onClick={handleLeaveRoom}
        className="w-full rounded-2xl border border-[color:var(--line)] bg-[var(--surface-strong)] py-3 text-[10px] uppercase tracking-[0.35em] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] transition"
      >
        Napusti sobu
      </button>
    </div>
  );

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
        {themeToggleFloating}
        <div className="app-shell flex min-h-screen items-center justify-center px-4 py-6 sm:px-5 sm:py-12">
          <div className="w-full max-w-md rounded-[28px] border border-[color:var(--line)] bg-[var(--surface)] px-6 py-8 sm:px-8 sm:py-10 relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.4em] text-[color:var(--ink-faint)]">Priprema</p>
                <h1 className="title-font text-3xl text-[color:var(--ink)]">MAFIJA</h1>
                <p className="mt-2 text-xs text-[color:var(--ink-muted)]">Podesavamo sobu i konekciju.</p>
              </div>
              {themeToggleInline}
            </div>
            <div className="mt-6 sm:mt-8 rounded-2xl border border-[color:var(--line)] bg-[var(--surface-soft)] p-4">
              <div className="flex justify-center space-x-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-bounce"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-bounce [animation-delay:0.2s]"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-bounce [animation-delay:0.4s]"></div>
              </div>
              <p className="mt-3 text-center text-[10px] uppercase tracking-[0.35em] text-[color:var(--ink-faint)]">Ucitavanje...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-bg">
      {themeToggleFloating}
      <div className="app-shell flex min-h-screen flex-col items-center justify-center px-4 py-6 sm:px-5 sm:py-12">
        <div className="w-full max-w-5xl">
          <div className="relative">
            <div className="absolute -inset-1 rounded-[36px] bg-gradient-to-br from-red-600/25 via-amber-400/25 to-transparent blur-2xl"></div>
            <div className="relative overflow-hidden rounded-[32px] border border-[color:var(--line)] bg-[var(--surface)]">
              <div className="grid md:grid-cols-[280px,1fr]">
                <aside className="flex flex-col gap-4 sm:gap-6 bg-[var(--surface-soft)] p-5 sm:p-6 md:p-8 border-b md:border-b-0 md:border-r border-[color:var(--line)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.4em] text-[color:var(--ink-faint)]">Nocna igra</p>
                      <h1 className="title-font text-4xl md:text-5xl text-[color:var(--ink)]">MAFIJA</h1>
                      <p className="mt-2 text-sm text-[color:var(--ink-muted)]">Diskretan diler uloga za igru uzivo.</p>
                    </div>
                    {themeToggleInline}
                  </div>

                  {roomCode.length === 6 && (
                    <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface-strong)] p-4">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-[color:var(--ink-faint)]">Sifra sobe</p>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="font-mono text-xl tracking-[0.35em] text-[color:var(--ink)]">{roomCode.toUpperCase()}</span>
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] transition"
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
                      className="w-full rounded-2xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-[10px] uppercase tracking-[0.35em] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] transition"
                    >
                      Novi kod
                    </button>
                  )}

                  <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 text-xs text-[color:var(--ink-muted)]">
                    <div className="flex items-center gap-2 text-[color:var(--ink-muted)]">
                      <span className="h-2 w-2 rounded-full bg-red-500"></span>
                      <span>Privatno deljenje uloga</span>
                    </div>
                    <p className="mt-2 leading-relaxed">
                      Telefoni samo za uloge. Glasanje i eliminacije idu uzivo.
                    </p>
                  </div>
                </aside>

                <main className="p-5 sm:p-6 md:p-10 bg-[var(--surface)]">
                  {errorMessage && (
                    <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                      {errorMessage}
                    </div>
                  )}

                  {room?.status !== 'waiting' && narrator && (
                    <div className="mb-5 rounded-2xl border border-[color:var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-xs text-[color:var(--ink-muted)]">
                      <span className="text-[10px] uppercase tracking-[0.35em] text-[color:var(--ink-faint)]">Narator</span>
                      <div className="mt-2 text-sm font-semibold text-[color:var(--ink)]">{narrator.name}</div>
                    </div>
                  )}

                  {phase === GamePhase.JOIN && (
                    <div className="space-y-4 sm:space-y-6">
                      <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface-muted)] p-1 flex">
                        <button
                          type="button"
                          onClick={() => handleModeChange('create')}
                          className={`flex-1 py-2 rounded-xl text-[11px] uppercase tracking-[0.3em] font-semibold transition-colors ${
                            entryMode === 'create' ? 'bg-[var(--surface-strong)] text-[color:var(--ink)]' : 'text-[color:var(--ink-faint)]'
                          }`}
                        >
                          Kreiraj
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModeChange('join')}
                          className={`flex-1 py-2 rounded-xl text-[11px] uppercase tracking-[0.3em] font-semibold transition-colors ${
                            entryMode === 'join' ? 'bg-[var(--surface-strong)] text-[color:var(--ink)]' : 'text-[color:var(--ink-faint)]'
                          }`}
                        >
                          Pridruzi se
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">Ime igraca</label>
                        <input
                          className="w-full rounded-2xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:ring-2 focus:ring-red-400/50"
                          placeholder="Tvoje ime"
                          value={playerName}
                          onChange={(event) => setPlayerName(event.target.value)}
                        />
                      </div>

                      {entryMode === 'join' ? (
                        <div className="space-y-2">
                          <label className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">Sifra sobe</label>
                          <input
                            className="w-full rounded-2xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm uppercase font-mono tracking-[0.35em] text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:ring-2 focus:ring-red-400/50"
                            placeholder="6 cifara"
                            value={roomCode}
                            onChange={(event) => setRoomCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                            inputMode="numeric"
                          />
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface-soft)] p-4 space-y-3 sm:space-y-4">
                          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.35em] text-[color:var(--ink-faint)]">
                            <span>Postavke sobe</span>
                            <span className="text-[color:var(--ink-soft)]">Host</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-[color:var(--ink-muted)]">Broj Mafijasa</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleDraftMafiaChange(-1)}
                                className="h-9 w-9 rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] text-sm font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-semibold text-[color:var(--ink)]">{draftSettings.mafiaCount}</span>
                              <button
                                type="button"
                                onClick={() => handleDraftMafiaChange(1)}
                                className="h-9 w-9 rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] text-sm font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
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
                                  : 'bg-[var(--surface-strong)] text-[color:var(--ink-muted)] border border-[color:var(--line)]'
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
                                  : 'bg-[var(--surface-strong)] text-[color:var(--ink-muted)] border border-[color:var(--line)]'
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
                        className="w-full rounded-2xl bg-red-600 text-white font-semibold py-4 uppercase tracking-[0.3em] text-xs hover:bg-red-500 disabled:opacity-60 transition"
                      >
                        {entryMode === 'create' ? 'Kreiraj sobu' : 'Udji u sobu'}
                      </button>
                    </div>
                  )}

                  {phase === GamePhase.LOBBY && (
                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-[11px] uppercase tracking-[0.35em] text-[color:var(--ink-faint)]">
                          Igraci ({players.length})
                        </h2>
                        {me?.isHost && (
                          <span className="rounded-full bg-[var(--ink)] text-[color:var(--paper)] text-[10px] px-3 py-1 uppercase tracking-[0.3em]">
                            Host
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {players.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center justify-between rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] px-4 py-3"
                          >
                            <span className="text-sm font-medium text-[color:var(--ink)]">
                              {player.name} {player.clientId === clientId && '(Ti)'}
                            </span>
                            <i className="fas fa-check-circle text-emerald-600 text-xs"></i>
                          </div>
                        ))}
                      </div>

                      {me?.isHost ? (
                        <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface-soft)] p-4 space-y-3 sm:space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-[color:var(--ink-muted)]">Broj Mafijasa</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleMafiaCountChange(-1)}
                                disabled={isBusy}
                                className="h-9 w-9 rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] text-sm font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] disabled:opacity-60"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-semibold text-[color:var(--ink)]">{settings.mafiaCount}</span>
                              <button
                                onClick={() => handleMafiaCountChange(1)}
                                disabled={isBusy}
                                className="h-9 w-9 rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] text-sm font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] disabled:opacity-60"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={handleStart}
                            disabled={isBusy}
                            className="w-full rounded-2xl bg-[var(--ink)] py-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-[color:var(--paper)] hover:opacity-90 disabled:opacity-60"
                          >
                            Podeli uloge
                          </button>
                          <button
                            onClick={handleLeaveRoom}
                            className="w-full rounded-2xl border border-[color:var(--line)] bg-[var(--surface-strong)] py-3 text-[10px] uppercase tracking-[0.35em] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] transition"
                          >
                            Napusti sobu
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 text-center space-y-3 sm:space-y-4">
                          <p className="text-xs text-[color:var(--ink-muted)] italic">Cekamo da domacin podeli uloge...</p>
                          <button
                            onClick={handleLeaveRoom}
                            className="w-full rounded-2xl border border-[color:var(--line)] bg-[var(--surface-strong)] py-3 text-[10px] uppercase tracking-[0.35em] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] transition"
                          >
                            Napusti sobu
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {phase === GamePhase.REVEAL && (me?.isNarrator ? (
                    narratorPanel
                  ) : (
                    <div className="text-center space-y-6 sm:space-y-8">
                      <p className="text-sm text-[color:var(--ink-muted)] italic">Tvoja tajna uloga je...</p>

                      <div className="relative overflow-hidden rounded-[28px] border border-[color:var(--line)] bg-[var(--surface-strong)] px-6 py-10 sm:py-12 group no-select">
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--surface-strong)] transition-opacity duration-300 group-active:opacity-0">
                          <span className="title-font text-base uppercase tracking-[0.4em] text-[color:var(--ink-muted)] select-none">
                            Drzi za prikaz
                          </span>
                        </div>

                        <div className="relative flex flex-col items-center">
                          <div className="text-6xl mb-4">{ROLE_ICONS[me?.role || Role.VILLAGER]}</div>
                          <h3 className="title-font text-3xl text-[color:var(--ink)] uppercase tracking-tight">{me?.role}</h3>
                          <p className="mt-3 text-xs text-[color:var(--ink-muted)] px-4">
                            {ROLE_DESCRIPTIONS[me?.role || Role.VILLAGER]}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleConfirm}
                        disabled={isBusy}
                        className="w-full rounded-2xl bg-[var(--ink)] text-[color:var(--paper)] font-semibold py-4 uppercase tracking-[0.3em] text-xs disabled:opacity-60"
                      >
                        Video sam ulogu
                      </button>
                    </div>
                  ))}

                  {phase === GamePhase.WAITING_FOR_OTHERS && (me?.isNarrator ? (
                    narratorPanel
                  ) : (
                    <div className="text-center space-y-5 sm:space-y-6 py-4 sm:py-6">
                      <div className="flex justify-center space-x-2">
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-bounce"></div>
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      </div>
                      <h2 className="title-font text-2xl text-[color:var(--ink)]">Cekamo ostale...</h2>
                      <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 space-y-2">
                        {players.map((player) => (
                          <div
                            key={player.id}
                            className="text-[10px] uppercase tracking-[0.35em] flex justify-between items-center"
                          >
                            <span className={player.hasConfirmed ? 'text-emerald-600' : 'text-[color:var(--ink-soft)]'}>
                              {player.name}
                            </span>
                            {player.hasConfirmed ? (
                              <i className="fas fa-check text-[10px]"></i>
                            ) : (
                              <i className="fas fa-clock text-[10px] text-[color:var(--ink-soft)]"></i>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={handleLeaveRoom}
                        className="w-full rounded-2xl border border-[color:var(--line)] bg-[var(--surface-strong)] py-3 text-[10px] uppercase tracking-[0.35em] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] transition"
                      >
                        Napusti sobu
                      </button>
                    </div>
                  ))}

                  {phase === GamePhase.READY_TO_PLAY && (me?.isNarrator ? (
                    narratorPanel
                  ) : (
                    <div className="text-center space-y-5 sm:space-y-6 py-4">
                      <div>
                        <h2 className="title-font text-3xl text-[color:var(--ink)]">Spremni!</h2>
                        <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
                          Svi igraci su videli svoje uloge. Odlozite telefone i pocnite igru uzivo.
                        </p>
                      </div>
                      <div className="h-px bg-[color:var(--line)] w-full"></div>
                      <div className="space-y-3">
                        {me?.isHost && (
                          <button
                            onClick={handleResetGame}
                            disabled={isBusy}
                            className="w-full rounded-2xl bg-[var(--ink)] py-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-[color:var(--paper)] hover:opacity-90 disabled:opacity-60"
                          >
                            Nova podela uloga
                          </button>
                        )}
                        <button
                          onClick={handleLeaveRoom}
                          className="w-full rounded-2xl border border-[color:var(--line)] bg-[var(--surface-strong)] py-3 text-[10px] uppercase tracking-[0.35em] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] transition"
                        >
                          Napusti sobu
                        </button>
                      </div>
                    </div>
                  ))}
                </main>
              </div>
            </div>
          </div>

          <footer className="mt-5 sm:mt-8 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.4em] text-[color:var(--ink-soft)]">
            <i className="fas fa-fingerprint"></i>
            <span>Mafia Card Dealer</span>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default App;
