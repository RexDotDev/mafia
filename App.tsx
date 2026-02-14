import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CustomRoleSetting,
  GamePhase,
  Role,
  RoomData,
  RoomSettings,
  RoundActionType,
  RoundState,
} from './types';
import { getRoleDescription, getRoleIcon } from './constants';
import { supabase } from './services/supabaseClient';
import {
  confirmRole,
  finishVoting,
  joinRoom,
  leaveRoom,
  pingRoom,
  resetGame,
  resolveRound,
  sendGraveyardMessage,
  startGame,
  startRound,
  submitRoundAction,
  updateSettings,
} from './services/roomApi';

const DEFAULT_SETTINGS: RoomSettings = {
  mafiaCount: 1,
  doctor: true,
  detective: true,
  lady: false,
  customRoles: [],
};

const normalizeSettings = (raw: any): RoomSettings => {
  const rawCustomRoles = Array.isArray(raw?.customRoles) ? raw.customRoles : [];
  const customRoles = rawCustomRoles
    .map((role: any) => ({
      name: typeof role?.name === 'string' ? role.name.trim() : '',
      count: typeof role?.count === 'number' ? Math.max(1, Math.min(10, role.count)) : 1,
    }))
    .filter((role: any) => role.name);

  return {
    mafiaCount: typeof raw?.mafiaCount === 'number' ? raw.mafiaCount : 1,
    doctor: true,
    detective: true,
    lady: typeof raw?.lady === 'boolean' ? raw.lady : false,
    customRoles,
  };
};

const normalizeRoundState = (raw: any): RoundState | null => {
  if (!raw || typeof raw !== 'object') return null;
  const actions = Array.isArray(raw?.actions)
    ? raw.actions
        .map((action: any) => ({
          actorId: typeof action?.actorId === 'string' ? action.actorId : '',
          actorName: typeof action?.actorName === 'string' ? action.actorName : '',
          role: typeof action?.role === 'string' ? action.role : '',
          type: action?.type as RoundActionType,
          targetId: typeof action?.targetId === 'string' ? action.targetId : '',
          targetName: typeof action?.targetName === 'string' ? action.targetName : '',
          createdAt: typeof action?.createdAt === 'string' ? action.createdAt : '',
        }))
        .filter((action: any) => action.actorId && action.targetId && action.type)
    : [];

  const events = Array.isArray(raw?.events)
    ? raw.events
        .map((event: any) => ({
          id: typeof event?.id === 'string' ? event.id : Math.random().toString(36).slice(2),
          round: typeof event?.round === 'number' ? event.round : 0,
          type: typeof event?.type === 'string' ? event.type : 'note',
          message: typeof event?.message === 'string' ? event.message : '',
          createdAt: typeof event?.createdAt === 'string' ? event.createdAt : '',
        }))
        .filter((event: any) => event.message)
    : [];

  const votes = Array.isArray(raw?.votes)
    ? raw.votes
        .map((vote: any) => ({
          voterId: typeof vote?.voterId === 'string' ? vote.voterId : '',
          voterName: typeof vote?.voterName === 'string' ? vote.voterName : '',
          targetId: typeof vote?.targetId === 'string' ? vote.targetId : '',
          targetName: typeof vote?.targetName === 'string' ? vote.targetName : '',
          createdAt: typeof vote?.createdAt === 'string' ? vote.createdAt : '',
        }))
        .filter((vote: any) => vote.voterId && vote.targetId)
    : [];

  const eliminatedPlayerIds = Array.isArray(raw?.eliminatedPlayerIds)
    ? raw.eliminatedPlayerIds.filter((value: any) => typeof value === 'string')
    : [];

  const graveyardMessages = Array.isArray(raw?.graveyardMessages)
    ? raw.graveyardMessages
        .map((message: any) => ({
          id: typeof message?.id === 'string' ? message.id : Math.random().toString(36).slice(2),
          senderId: typeof message?.senderId === 'string' ? message.senderId : '',
          senderName: typeof message?.senderName === 'string' ? message.senderName : '',
          message: typeof message?.message === 'string' ? message.message : '',
          createdAt: typeof message?.createdAt === 'string' ? message.createdAt : '',
        }))
        .filter((message: any) => message.senderId && message.senderName && message.message)
    : [];

  return {
    round: typeof raw?.round === 'number' ? raw.round : 0,
    phase: raw?.phase === 'night' || raw?.phase === 'voting' ? raw.phase : 'idle',
    actions,
    votes,
    events,
    eliminatedPlayerIds,
    graveyardMessages,
    lastResult: raw?.lastResult && typeof raw.lastResult === 'object'
      ? {
          mafiaTargetId: raw.lastResult.mafiaTargetId ?? null,
          killedPlayerId: raw.lastResult.killedPlayerId ?? null,
          doctorTargetId: raw.lastResult.doctorTargetId ?? null,
          doctorSaved: !!raw.lastResult.doctorSaved,
          ladyTargetId: raw.lastResult.ladyTargetId ?? null,
          inspectorTargetId: raw.lastResult.inspectorTargetId ?? null,
          inspectorIsMafia:
            typeof raw.lastResult.inspectorIsMafia === 'boolean'
              ? raw.lastResult.inspectorIsMafia
              : null,
          mutedPlayerId: raw.lastResult.mutedPlayerId ?? null,
        }
      : null,
    lastVoteSummary:
      raw?.lastVoteSummary && typeof raw.lastVoteSummary === 'object'
        ? {
            totalVoters:
              typeof raw.lastVoteSummary.totalVoters === 'number'
                ? Math.max(0, Math.floor(raw.lastVoteSummary.totalVoters))
                : 0,
            completedVoters:
              typeof raw.lastVoteSummary.completedVoters === 'number'
                ? Math.max(0, Math.floor(raw.lastVoteSummary.completedVoters))
                : 0,
            eliminatedPlayerId:
              typeof raw.lastVoteSummary.eliminatedPlayerId === 'string'
                ? raw.lastVoteSummary.eliminatedPlayerId
                : null,
            eliminatedPlayerName:
              typeof raw.lastVoteSummary.eliminatedPlayerName === 'string'
                ? raw.lastVoteSummary.eliminatedPlayerName
                : null,
            voteCounts: Array.isArray(raw.lastVoteSummary.voteCounts)
              ? raw.lastVoteSummary.voteCounts
                  .map((entry: any) => ({
                    playerId: typeof entry?.playerId === 'string' ? entry.playerId : '',
                    playerName: typeof entry?.playerName === 'string' ? entry.playerName : '',
                    votes:
                      typeof entry?.votes === 'number'
                        ? Math.max(0, Math.floor(entry.votes))
                        : 0,
                  }))
                  .filter((entry: any) => entry.playerId)
              : [],
          }
        : null,
  };
};

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
  const [draftCustomRoleName, setDraftCustomRoleName] = useState('');
  const [draftCustomRoleCount, setDraftCustomRoleCount] = useState(1);
  const [showDraftCustomRoles, setShowDraftCustomRoles] = useState(false);
  const [customRoleName, setCustomRoleName] = useState('');
  const [customRoleCount, setCustomRoleCount] = useState(1);
  const [nightTargetId, setNightTargetId] = useState('');
  const [voteTargetId, setVoteTargetId] = useState('');
  const [graveyardDraftMessage, setGraveyardDraftMessage] = useState('');
  const [showVoteSummaryModal, setShowVoteSummaryModal] = useState(false);
  const [dismissedVoteSummaryKey, setDismissedVoteSummaryKey] = useState('');
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

    const normalizedRoundState = normalizeRoundState(roomRow.settings?.roundState);
    const currentPlayer = players.find((player) => player.clientId === clientId);
    const canSeeGraveyard =
      !!currentPlayer &&
      (currentPlayer.isNarrator ||
        (!!normalizedRoundState && normalizedRoundState.eliminatedPlayerIds.includes(currentPlayer.id)));

    setRoom({
      id: roomRow.id,
      status: roomRow.status,
      settings: normalizeSettings(roomRow.settings),
      players,
      roundState:
        normalizedRoundState && !canSeeGraveyard
          ? { ...normalizedRoundState, graveyardMessages: [] }
          : normalizedRoundState,
    });
  }, [clientId]);

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

  useEffect(() => {
    setNightTargetId('');
    if (room?.roundState?.phase !== 'voting') {
      setVoteTargetId('');
    }
  }, [room?.roundState?.round, room?.roundState?.phase]);

  const joinWithPayload = async (
    code: string,
    name: string,
    settings?: RoomSettings,
    options?: { silent?: boolean },
  ) => {
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
      if (options?.silent) {
        throw error;
      }
      setErrorMessage(error?.message || 'NeuspeÅ¡no pridruÅ¾ivanje.');
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

  const handleStartRound = async () => {
    if (!roomCode) return;
    setErrorMessage('');
    setIsBusy(true);
    try {
      await startRound({ roomCode, clientId });
      setVoteTargetId('');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Neuspesno pokretanje runde.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubmitNightAction = async () => {
    if (!roomCode || !nightTargetId) return;
    setErrorMessage('');
    setIsBusy(true);
    try {
      await submitRoundAction({ roomCode, clientId, targetId: nightTargetId });
    } catch (error: any) {
      setErrorMessage(error?.message || 'Neuspesno slanje akcije.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleResolveRound = async () => {
    if (!roomCode) return;
    setErrorMessage('');
    setIsBusy(true);
    try {
      await resolveRound({ roomCode, clientId });
    } catch (error: any) {
      setErrorMessage(error?.message || 'Neuspesno zakljucivanje noci.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleFinishVoting = async () => {
    if (!roomCode || !voteTargetId) return;
    setErrorMessage('');
    setIsBusy(true);
    try {
      await finishVoting({
        roomCode,
        clientId,
        targetId: voteTargetId,
      });
    } catch (error: any) {
      setErrorMessage(error?.message || 'Neuspesno slanje glasa.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSendGraveyardMessage = async () => {
    if (!roomCode || !graveyardDraftMessage.trim()) return;
    setErrorMessage('');
    setIsBusy(true);
    try {
      await sendGraveyardMessage({
        roomCode,
        clientId,
        message: graveyardDraftMessage.trim(),
      });
      setGraveyardDraftMessage('');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Neuspesno slanje poruke u groblje.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleLadyToggle = async () => {
    if (!roomCode || !room) return;
    const next = !settings.lady;
    setErrorMessage('');
    setIsBusy(true);
    try {
      await updateSettings({
        roomCode,
        clientId,
        settings: {
          ...settings,
          lady: next,
        },
      });
    } catch (error: any) {
      setErrorMessage(error?.message || 'NeuspeÅ¡na promena podeÅ¡avanja.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleAddCustomRole = async () => {
    if (!roomCode || !room) return;
    const trimmed = customRoleName.trim();
    if (!trimmed) return;
    const nextRoles = mergeCustomRole(settings.customRoles, trimmed, clampCustomRoleCount(customRoleCount));
    setErrorMessage('');
    setIsBusy(true);
    try {
      await updateSettings({
        roomCode,
        clientId,
        settings: {
          ...settings,
          customRoles: nextRoles,
        },
      });
      setCustomRoleName('');
      setCustomRoleCount(1);
    } catch (error: any) {
      setErrorMessage(error?.message || 'NeuspeÅ¡na promena podeÅ¡avanja.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleCustomRoleCountChange = async (index: number, delta: number) => {
    if (!roomCode || !room) return;
    if (!settings.customRoles[index]) return;
    const nextRoles = settings.customRoles.map((role, roleIndex) =>
      roleIndex === index ? { ...role, count: clampCustomRoleCount(role.count + delta) } : role,
    );
    setErrorMessage('');
    setIsBusy(true);
    try {
      await updateSettings({
        roomCode,
        clientId,
        settings: {
          ...settings,
          customRoles: nextRoles,
        },
      });
    } catch (error: any) {
      setErrorMessage(error?.message || 'NeuspeÅ¡na promena podeÅ¡avanja.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemoveCustomRole = async (index: number) => {
    if (!roomCode || !room) return;
    const nextRoles = settings.customRoles.filter((_, roleIndex) => roleIndex !== index);
    setErrorMessage('');
    setIsBusy(true);
    try {
      await updateSettings({
        roomCode,
        clientId,
        settings: {
          ...settings,
          customRoles: nextRoles,
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
  const roundState = room?.roundState;

  const eliminatedPlayerIds = useMemo(
    () => new Set(roundState?.eliminatedPlayerIds ?? []),
    [roundState?.eliminatedPlayerIds],
  );

  const alivePlayers = useMemo(
    () => players.filter((player) => !player.isNarrator && !eliminatedPlayerIds.has(player.id)),
    [players, eliminatedPlayerIds],
  );

  const graveyardMessages = useMemo(
    () => (roundState?.graveyardMessages ?? []).slice(-120),
    [roundState?.graveyardMessages],
  );

  const playerNameById = useMemo(
    () => new Map(players.map((player) => [player.id, player.name])),
    [players],
  );

  const myNightActionType = useMemo(() => {
    if (me?.role === Role.MAFIA) return 'mafia_kill';
    if (me?.role === Role.DOCTOR) return 'doctor_heal';
    if (me?.role === Role.DETECTIVE) return 'detective_check';
    if (me?.role === Role.LADY) return 'lady_silence';
    return null;
  }, [me?.role]);

  const mySubmittedAction = useMemo(
    () => roundState?.actions.find((action) => action.actorId === me?.id),
    [roundState?.actions, me?.id],
  );

  const currentVotes = roundState?.votes ?? [];

  const mySubmittedVote = useMemo(
    () => currentVotes.find((vote) => vote.voterId === me?.id) ?? null,
    [currentVotes, me?.id],
  );

  const votedPlayerIds = useMemo(
    () => new Set(currentVotes.map((vote) => vote.voterId)),
    [currentVotes],
  );

  const votedPlayers = useMemo(
    () => alivePlayers.filter((player) => votedPlayerIds.has(player.id)),
    [alivePlayers, votedPlayerIds],
  );

  const pendingVoters = useMemo(
    () => alivePlayers.filter((player) => !votedPlayerIds.has(player.id)),
    [alivePlayers, votedPlayerIds],
  );

  const lastVoteSummary = roundState?.lastVoteSummary ?? null;
  const voteSummaryModalKey = useMemo(() => {
    if (!roundState || !lastVoteSummary) return '';
    const countsKey = lastVoteSummary.voteCounts
      .map((entry) => `${entry.playerId}:${entry.votes}`)
      .join('|');
    return `${roundState.round}:${lastVoteSummary.completedVoters}:${lastVoteSummary.totalVoters}:${lastVoteSummary.eliminatedPlayerId || 'none'}:${countsKey}`;
  }, [roundState, lastVoteSummary]);

  const availableNightTargets = useMemo(() => {
    if (!me || !myNightActionType) return [];
    return alivePlayers.filter(
      (player) => player.id !== me.id || myNightActionType === 'doctor_heal',
    );
  }, [alivePlayers, me, myNightActionType]);

  const isMeEliminated = me ? eliminatedPlayerIds.has(me.id) : false;

  useEffect(() => {
    if (!isMeEliminated) {
      setGraveyardDraftMessage('');
    }
  }, [isMeEliminated]);

  useEffect(() => {
    if (roundState?.phase !== 'voting' || !mySubmittedVote?.targetId) return;
    setVoteTargetId((prev) => prev || mySubmittedVote.targetId);
  }, [roundState?.phase, mySubmittedVote?.targetId]);

  useEffect(() => {
    if (!voteSummaryModalKey) {
      setShowVoteSummaryModal(false);
      return;
    }
    if (roundState?.phase === 'voting') return;
    if (dismissedVoteSummaryKey !== voteSummaryModalKey) {
      setShowVoteSummaryModal(true);
    }
  }, [voteSummaryModalKey, dismissedVoteSummaryKey, roundState?.phase]);

  const roundInspectorPreview = useMemo(() => {
    const action = roundState?.actions.find((item) => item.type === 'detective_check');
    if (!action) return null;
    const inspected = players.find((player) => player.id === action.targetId);
    if (!inspected) return null;
    const isMafia = inspected.role === Role.LADY ? false : inspected.role === Role.MAFIA;
    return {
      targetName: action.targetName,
      isMafia,
    };
  }, [roundState?.actions, players]);

  const roundActionSummary = useMemo(() => {
    const mafia = roundState?.actions.filter((action) => action.type === 'mafia_kill') ?? [];
    const doctor = roundState?.actions.find((action) => action.type === 'doctor_heal') ?? null;
    const detective = roundState?.actions.find((action) => action.type === 'detective_check') ?? null;
    const lady = roundState?.actions.find((action) => action.type === 'lady_silence') ?? null;
    return { mafia, doctor, detective, lady };
  }, [roundState?.actions]);


  const handleModeChange = (mode: EntryMode) => {
    setEntryMode(mode);
    setErrorMessage('');
    setShowDraftCustomRoles(false);
    if (mode === 'create') {
      setRoomCode(generateRoomCode());
      setDraftSettings(DEFAULT_SETTINGS);
      setDraftCustomRoleName('');
      setDraftCustomRoleCount(1);
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

  const clampCustomRoleCount = (value: number) => Math.max(1, Math.min(10, value));

  const mergeCustomRole = (roles: CustomRoleSetting[], name: string, count: number) => {
    const trimmed = name.trim();
    if (!trimmed) return roles;
    const normalized = trimmed.toLowerCase();
    const existingIndex = roles.findIndex((role) => role.name.toLowerCase() === normalized);
    if (existingIndex < 0) return [...roles, { name: trimmed, count }];
    return roles.map((role, index) =>
      index === existingIndex ? { ...role, count: clampCustomRoleCount(role.count + count) } : role,
    );
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

  const toggleDraftLady = () => {
    setDraftSettings((prev) => ({ ...prev, lady: !prev.lady }));
  };

  const handleAddDraftCustomRole = () => {
    const trimmed = draftCustomRoleName.trim();
    if (!trimmed) return;
    setDraftSettings((prev) => ({
      ...prev,
      customRoles: mergeCustomRole(prev.customRoles, trimmed, clampCustomRoleCount(draftCustomRoleCount)),
    }));
    setDraftCustomRoleName('');
    setDraftCustomRoleCount(1);
  };

  const handleDraftCustomRoleCountChange = (index: number, delta: number) => {
    setDraftSettings((prev) => ({
      ...prev,
      customRoles: prev.customRoles.map((role, roleIndex) =>
        roleIndex === index
          ? { ...role, count: clampCustomRoleCount(role.count + delta) }
          : role,
      ),
    }));
  };

  const handleRemoveDraftCustomRole = (index: number) => {
    setDraftSettings((prev) => ({
      ...prev,
      customRoles: prev.customRoles.filter((_, roleIndex) => roleIndex !== index),
    }));
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
    setDraftSettings(DEFAULT_SETTINGS);
    setDraftCustomRoleName('');
    setDraftCustomRoleCount(1);
    setShowDraftCustomRoles(false);
    setCustomRoleName('');
    setCustomRoleCount(1);
    setGraveyardDraftMessage('');
    setShowVoteSummaryModal(false);
    setDismissedVoteSummaryKey('');

    if (!code) return;
    try {
      await leaveRoom({ roomCode: code, clientId });
    } catch (error) {
      console.error('Failed to leave room', error);
    }
  };

  const closeVoteSummaryModal = () => {
    if (voteSummaryModalKey) {
      setDismissedVoteSummaryKey(voteSummaryModalKey);
    }
    setShowVoteSummaryModal(false);
  };

  const renderVoteSummaryModal = () => {
    if (room?.status !== 'finished' || !lastVoteSummary || !showVoteSummaryModal) return null;

    return (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4 py-6"
        onClick={closeVoteSummaryModal}
      >
        <div
          className="w-full max-w-md rounded-3xl border border-[color:var(--line)] bg-[var(--surface)] p-5 space-y-3 text-left shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Rezultat glasanja
            </p>
            <h3 className="mt-1 title-font text-2xl text-[color:var(--ink)]">
              {lastVoteSummary.eliminatedPlayerName
                ? `Izbacen je ${lastVoteSummary.eliminatedPlayerName}`
                : 'Niko nije izbacen'}
            </h3>
          </div>
          <div className="text-xs text-[color:var(--ink-muted)]">
            Glasalo: {lastVoteSummary.completedVoters}/{lastVoteSummary.totalVoters}
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
            {lastVoteSummary.voteCounts.map((entry) => (
              <div
                key={entry.playerId}
                className="flex items-center justify-between rounded-lg border border-[color:var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[color:var(--ink-muted)]"
              >
                <span>{entry.playerName}</span>
                <span className="font-semibold text-[color:var(--ink)]">{entry.votes}</span>
              </div>
            ))}
          </div>
          <button
            onClick={closeVoteSummaryModal}
            className="w-full rounded-xl bg-[var(--ink)] py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)] hover:opacity-90"
          >
            U redu
          </button>
        </div>
      </div>
    );
  };

  const narratorPanel = (
    <div className="text-center space-y-5 sm:space-y-6 py-2">
      <div>
        <h2 className="title-font text-3xl text-[color:var(--ink)]">Narator</h2>
        <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
          Ti vodis igru. Imas pregled svih uloga i ne ucestvujes u glasanjima.
        </p>
        {room?.status === 'finished' && (
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-emerald-600">
            Svi su videli uloge. Runda {roundState?.round || 0}
          </p>
        )}
      </div>

      {room?.status === 'finished' && (
        <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 space-y-3 text-left">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Kontrola runde</p>
            <span className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">
              Faza: {roundState?.phase || 'idle'}
            </span>
          </div>

          <div className="text-xs text-[color:var(--ink-muted)]">
            Aktivnih igraca: {alivePlayers.length}
          </div>
          <div className="text-xs text-[color:var(--ink-muted)]">
            Zivi: {alivePlayers.length ? alivePlayers.map((player) => player.name).join(', ') : 'nema'}
          </div>

          {(roundState?.phase === 'idle' || !roundState) && (
            <button
              onClick={handleStartRound}
              disabled={isBusy}
              className="w-full rounded-xl bg-[var(--ink)] py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)] hover:opacity-90 disabled:opacity-60"
            >
              Pokreni nocnu rundu
            </button>
          )}

          {roundState?.phase === 'night' && (
            <button
              onClick={handleResolveRound}
              disabled={isBusy}
              className="w-full rounded-xl bg-[var(--ink)] py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)] hover:opacity-90 disabled:opacity-60"
            >
              Zakljuci noc
            </button>
          )}

          {roundState?.phase === 'voting' && (
            <div className="space-y-2">
              <div className="text-xs text-[color:var(--ink-muted)]">
                Glasalo: {votedPlayers.length}/{alivePlayers.length}
              </div>
              <div className="text-xs text-[color:var(--ink-muted)]">
                Potvrdili glas: {votedPlayers.length ? votedPlayers.map((player) => player.name).join(', ') : 'niko'}
              </div>
              <div className="text-xs text-[color:var(--ink-muted)]">
                Cekamo: {pendingVoters.length ? pendingVoters.map((player) => player.name).join(', ') : 'svi su glasali'}
              </div>
              <p className="text-[11px] text-[color:var(--ink-soft)]">
                Kada svi zivi igraci potvrde glas, rezultat se automatski prikazuje svima.
              </p>
            </div>
          )}
        </div>
      )}

      {room?.status === 'finished' && roundState?.phase === 'night' && (
        <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 space-y-2 text-left">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Akcije ove noci</p>
          <div className="text-xs text-[color:var(--ink-muted)]">
            Mafija cilja:{' '}
            {roundActionSummary.mafia.length
              ? roundActionSummary.mafia.map((item) => item.targetName).join(', ')
              : 'nema odabira'}
          </div>
          <div className="text-xs text-[color:var(--ink-muted)]">
            Dama ucutkava: {roundActionSummary.lady?.targetName || 'nema odabira'}
          </div>
          <div className="text-xs text-[color:var(--ink-muted)]">
            Lekar leci: {roundActionSummary.doctor?.targetName || 'nema odabira'}
          </div>
          <div className="text-xs text-[color:var(--ink-muted)]">
            Inspektor proverava: {roundInspectorPreview?.targetName || roundActionSummary.detective?.targetName || 'nema odabira'}
            {roundInspectorPreview && ` (${roundInspectorPreview.isMafia ? 'mafijas' : 'nije mafijas'})`}
          </div>
        </div>
      )}

      {room?.status === 'finished' && roundState?.lastResult && (
        <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 space-y-2 text-left">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Ishod prethodne noci</p>
          <div className="text-xs text-[color:var(--ink-muted)]">
            Mafija je ubila: {roundState.lastResult.killedPlayerId ? playerNameById.get(roundState.lastResult.killedPlayerId) : 'nikog'}
          </div>
          <div className="text-xs text-[color:var(--ink-muted)]">
            Inspektor je proverio: {roundState.lastResult.inspectorTargetId ? playerNameById.get(roundState.lastResult.inspectorTargetId) : 'nikog'}
            {roundState.lastResult.inspectorTargetId &&
              ` - ${roundState.lastResult.inspectorIsMafia ? 'mafijas' : 'nije mafijas'}`}
          </div>
          <div className="text-xs text-[color:var(--ink-muted)]">
            Lekar je lecio: {roundState.lastResult.doctorTargetId ? playerNameById.get(roundState.lastResult.doctorTargetId) : 'nikog'}
            {roundState.lastResult.doctorSaved ? ' (uspesno spasavanje)' : ''}
          </div>
          <div className="text-xs text-[color:var(--ink-muted)]">
            Dama je ucutkala: {roundState.lastResult.ladyTargetId ? playerNameById.get(roundState.lastResult.ladyTargetId) : 'nikog'}
          </div>
        </div>
      )}

      {room?.status === 'finished' && roundState?.events?.length ? (
        <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 space-y-2 text-left">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Dogadjaji rundi</p>
          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
            {[...roundState.events].slice(-14).reverse().map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-[color:var(--line)] bg-[var(--surface-strong)] px-2.5 py-2 text-xs text-[color:var(--ink-muted)]"
              >
                <span className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">
                  Runda {event.round}
                </span>
                <div className="mt-1">{event.message}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {room?.status === 'finished' && (
        <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 space-y-3 text-left">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Groblje chat</p>
          <div className="h-72 overflow-y-auto space-y-1.5 pr-1 rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] p-2.5">
            {graveyardMessages.length ? (
              [...graveyardMessages].reverse().map((message) => (
                <div
                  key={message.id}
                  className="rounded-lg border border-[color:var(--line)] bg-[var(--surface)] px-2.5 py-2 text-xs text-[color:var(--ink-muted)]"
                >
                  <span className="font-semibold text-[color:var(--ink)]">{message.senderName}:</span>{' '}
                  {message.message}
                </div>
              ))
            ) : (
              <p className="text-xs text-[color:var(--ink-soft)]">Nema poruka u groblju.</p>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 space-y-3">
        <p className="text-[10px] uppercase tracking-[0.22em] sm:tracking-[0.35em] text-[color:var(--ink-faint)]">Uloge igraca</p>
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
                      : role === Role.LADY
                        ? 'text-red-500'
                        : 'text-[color:var(--ink)]';

              return (
            <div
              key={player.id}
              className="flex min-w-0 flex-col items-start gap-2 rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className={`w-full min-w-0 break-words text-left text-sm font-bold ${nameTone}`}>
                {player.name} {eliminatedPlayerIds.has(player.id) ? '(eliminisan)' : ''}
              </span>
              <span className="flex w-full items-center gap-2 text-[10px] uppercase tracking-[0.2em] sm:w-auto sm:tracking-[0.3em]">
                <span className="text-base leading-none text-[color:var(--ink)]">
                  {getRoleIcon(player.role || Role.VILLAGER)}
                </span>
                <span className="break-words">{player.role || 'Uloga'}</span>
              </span>
            </div>
              );
            })()
          ))}
      </div>
      <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 space-y-2">
        <p className="text-[10px] uppercase tracking-[0.22em] sm:tracking-[0.35em] text-[color:var(--ink-faint)]">Potvrde uloga</p>
        {players
          .filter((player) => !player.isNarrator)
          .map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.35em]"
            >
              <span className={`min-w-0 flex-1 break-words text-left font-semibold ${player.hasConfirmed ? 'text-emerald-600' : 'text-[color:var(--ink-soft)]'}`}>
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
          className="w-full rounded-2xl bg-[var(--ink)] py-3 text-[11px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.35em] text-[color:var(--paper)] hover:opacity-90 disabled:opacity-60"
        >
          Nova podela uloga
        </button>
      )}
      <button
        onClick={handleLeaveRoom}
        className="w-full rounded-2xl border border-red-500/40 bg-red-600 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.35em] text-white hover:bg-red-500 transition"
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
        joinWithPayload(parsed.roomCode, parsed.playerName, undefined, { silent: true })
          .catch(() => {
            localStorage.removeItem(SESSION_KEY);
            setRoom(null);
            setRoomId(null);
            setRoomCode(generateRoomCode());
            setEntryMode('create');
            setErrorMessage('');
          })
          .finally(() => {
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
                <p className="text-[11px] uppercase tracking-[0.24em] sm:tracking-[0.4em] text-[color:var(--ink-faint)]">Priprema</p>
                  <div className="flex items-center gap-2">
                    <img src="/favicon.png" alt="Mafija" className="h-7 w-7 rounded-md" />
                    <h1 className="title-font text-3xl text-[color:var(--ink)]">MAFIJA</h1>
                  </div>
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
              <p className="mt-3 text-center text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.35em] text-[color:var(--ink-faint)]">Ucitavanje...</p>
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
            <div className="absolute -inset-1 rounded-[36px] bg-gradient-to-br from-red-500/50 via-red-400/25 to-transparent blur-2xl"></div>
            <div className="relative overflow-hidden rounded-[32px] border border-[color:var(--line)] bg-[var(--surface)]">
              <div className="grid md:grid-cols-[280px,1fr]">
                <aside className="flex flex-col gap-4 sm:gap-6 bg-[var(--surface-soft)] p-5 sm:p-6 md:p-8 border-b md:border-b-0 md:border-r border-[color:var(--line)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] sm:tracking-[0.4em] text-[color:var(--ink-faint)]">Nocna igra</p>
                      <div className="flex items-center gap-3">
                        <img src="/favicon.png" alt="Mafija" className="h-8 w-8 md:h-9 md:w-9 rounded-md" />
                        <h1 className="title-font text-3xl sm:text-4xl md:text-5xl text-[color:var(--ink)]">MAFIJA</h1>
                      </div>
                      <p className="mt-2 text-sm text-[color:var(--ink-muted)]">Diskretan diler uloga za igru uzivo.</p>
                    </div>
                    {themeToggleInline}
                  </div>

                  {roomCode.length === 6 && (
                    <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface-strong)] p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.35em] text-[color:var(--ink-faint)]">Sifra sobe</p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-base font-semibold tracking-[0.2em] text-[color:var(--ink)] sm:text-xl sm:tracking-[0.35em]">{roomCode.toUpperCase()}</span>
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="w-full rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] transition sm:w-auto sm:tracking-[0.3em]"
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
                      className="w-full rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-[9px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] transition"
                    >
                      Novi kod
                    </button>
                  )}

                  {!(phase === GamePhase.JOIN && entryMode === 'create') && (
                    <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 text-xs text-[color:var(--ink-muted)]">
                      <div className="flex items-center gap-2 text-[color:var(--ink-muted)]">
                        <span className="h-2 w-2 rounded-full bg-red-500"></span>
                        <span>Privatno deljenje uloga</span>
                      </div>
                      <p className="mt-2 leading-relaxed">
                        Telefoni samo za uloge. Glasanje i eliminacije idu uzivo.
                      </p>
                    </div>
                  )}
                </aside>

                <main className="p-5 sm:p-6 md:p-10 bg-[var(--surface)]">
                  {errorMessage && (
                    <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                      {errorMessage}
                    </div>
                  )}

                  {room?.status !== 'waiting' && narrator && (
                    <div className="mb-5 rounded-2xl border border-[color:var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-xs text-[color:var(--ink-muted)]">
                      <span className="text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.35em] text-[color:var(--ink-faint)]">Narator</span>
                      <div className="mt-2 text-sm font-semibold text-[color:var(--ink)]">{narrator.name}</div>
                    </div>
                  )}

                  {phase === GamePhase.JOIN && (
                    <div className={entryMode === 'create' ? 'space-y-3 sm:space-y-4' : 'space-y-4 sm:space-y-6'}>
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
                            className="w-full rounded-2xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm uppercase font-mono tracking-[0.22em] sm:tracking-[0.35em] text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:ring-2 focus:ring-red-400/50"
                            placeholder="6 cifara"
                            value={roomCode}
                            onChange={(event) => setRoomCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                            inputMode="numeric"
                          />
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface-soft)] p-3 space-y-3">
                          <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[color:var(--ink-faint)]">
                            <span>Postavke sobe</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[color:var(--ink-soft)]">Host</span>
                              <button
                                type="button"
                                onClick={() => setShowDraftCustomRoles((prev) => !prev)}
                                className="rounded-lg border border-[color:var(--line)] bg-[var(--surface-strong)] px-2 py-1 text-[9px] tracking-[0.16em] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                              >
                                {showDraftCustomRoles
                                  ? 'Sakrij uloge'
                                  : `Uloge${draftSettings.customRoles.length ? ` (${draftSettings.customRoles.length})` : ''}`}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] p-2.5">
                              <p className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">Mafijasi</p>
                              <div className="mt-2 flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => handleDraftMafiaChange(-1)}
                                  className="h-8 w-8 rounded-lg border border-[color:var(--line)] bg-[var(--surface)] text-xs font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                                >
                                  -
                                </button>
                                <span className="w-7 text-center text-sm font-semibold text-[color:var(--ink)]">{draftSettings.mafiaCount}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDraftMafiaChange(1)}
                                  className="h-8 w-8 rounded-lg border border-[color:var(--line)] bg-[var(--surface)] text-xs font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] p-2.5">
                              <div className="flex items-center justify-between">
                                <p className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">Dama</p>
                                <button
                                  type="button"
                                  onClick={toggleDraftLady}
                                  aria-pressed={draftSettings.lady}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                    draftSettings.lady
                                      ? 'bg-red-600'
                                      : 'bg-[var(--surface)] border border-[color:var(--line)]'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition ${
                                      draftSettings.lady ? 'translate-x-[22px]' : 'translate-x-1'
                                    }`}
                                  ></span>
                                </button>
                              </div>
                              <p className="mt-2 text-[9px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
                                {draftSettings.lady ? 'U igri' : 'Iskljucena'}
                              </p>
                            </div>
                          </div>

                          {showDraftCustomRoles && (
                            <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] p-2.5 space-y-2.5">
                              <p className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">Dodatne uloge</p>
                              <div className="grid grid-cols-[1fr,auto] gap-2">
                                <input
                                  className="min-w-0 rounded-lg border border-[color:var(--line)] bg-[var(--surface)] px-2.5 py-2 text-xs text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:ring-2 focus:ring-red-400/50"
                                  placeholder="Naziv uloge"
                                  value={draftCustomRoleName}
                                  onChange={(event) => setDraftCustomRoleName(event.target.value)}
                                />
                                <button
                                  type="button"
                                  onClick={handleAddDraftCustomRole}
                                  className="rounded-lg border border-[color:var(--line)] bg-[var(--surface)] px-2.5 py-2 text-[9px] uppercase tracking-[0.16em] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                                >
                                  Dodaj
                                </button>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setDraftCustomRoleCount((prev) => clampCustomRoleCount(prev - 1))}
                                  className="h-7 w-7 rounded-lg border border-[color:var(--line)] bg-[var(--surface)] text-[10px] font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                                >
                                  -
                                </button>
                                <span className="w-6 text-center text-[10px] font-semibold text-[color:var(--ink)]">{draftCustomRoleCount}</span>
                                <button
                                  type="button"
                                  onClick={() => setDraftCustomRoleCount((prev) => clampCustomRoleCount(prev + 1))}
                                  className="h-7 w-7 rounded-lg border border-[color:var(--line)] bg-[var(--surface)] text-[10px] font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                                >
                                  +
                                </button>
                              </div>

                              {draftSettings.customRoles.length > 0 && (
                                <div className="space-y-1.5">
                                  {draftSettings.customRoles.map((role, index) => (
                                    <div
                                      key={`${role.name}-${index}`}
                                      className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-[color:var(--line)] bg-[var(--surface)] px-2 py-1.5"
                                    >
                                      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[color:var(--ink)]">{role.name}</span>
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleDraftCustomRoleCountChange(index, -1)}
                                          className="h-6 w-6 rounded-md border border-[color:var(--line)] bg-[var(--surface)] text-[10px] font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                                        >
                                          -
                                        </button>
                                        <span className="w-4 text-center text-[10px] font-semibold text-[color:var(--ink)]">{role.count}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleDraftCustomRoleCountChange(index, 1)}
                                          className="h-6 w-6 rounded-md border border-[color:var(--line)] bg-[var(--surface)] text-[10px] font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                                        >
                                          +
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveDraftCustomRole(index)}
                                          className="rounded-md border border-[color:var(--line)] bg-[var(--surface)] px-1.5 py-1 text-[8px] uppercase tracking-[0.16em] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                                        >
                                          X
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        onClick={handleJoin}
                        disabled={isBusy}
                        className="w-full rounded-2xl bg-red-600 text-white font-semibold py-4 uppercase tracking-[0.2em] sm:tracking-[0.3em] text-xs hover:bg-red-500 disabled:opacity-60 transition"
                      >
                        {entryMode === 'create' ? 'Kreiraj sobu' : 'Udji u sobu'}
                      </button>
                    </div>
                  )}

                  {phase === GamePhase.LOBBY && (
                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.35em] text-[color:var(--ink-faint)]">
                          Igraci ({players.length})
                        </h2>
                        {me?.isHost && (
                          <span className="rounded-full bg-[var(--ink)] text-[color:var(--paper)] text-[10px] px-3 py-1 uppercase tracking-[0.2em] sm:tracking-[0.3em]">
                            Host
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {players.map((player) => (
                          <div
                            key={player.id}
                            className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] px-4 py-3"
                          >
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[color:var(--ink)]">
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
                          <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface)] p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-[color:var(--ink-muted)]">Dama</span>
                              <button
                                type="button"
                                onClick={handleLadyToggle}
                                disabled={isBusy}
                                aria-pressed={settings.lady}
                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                                  settings.lady
                                    ? 'bg-red-600'
                                    : 'bg-[var(--surface-strong)] border border-[color:var(--line)]'
                                } ${isBusy ? 'opacity-60' : ''}`}
                              >
                                <span
                                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                                    settings.lady ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                ></span>
                              </button>
                            </div>
                            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
                              {settings.lady ? 'U igri' : 'Iskljucena'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface)] p-3 space-y-3">
                            <p className="text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.35em] text-[color:var(--ink-faint)]">Dodatne uloge</p>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <input
                                className="flex-1 rounded-xl border border-[color:var(--line)] bg-[var(--surface)] px-3 py-2 text-xs text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:ring-2 focus:ring-red-400/50"
                                placeholder="Naziv uloge"
                                value={customRoleName}
                                onChange={(event) => setCustomRoleName(event.target.value)}
                              />
                              <div className="flex items-center gap-1 self-start sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => setCustomRoleCount((prev) => clampCustomRoleCount(prev - 1))}
                                  disabled={isBusy}
                                  className="h-8 w-8 rounded-lg border border-[color:var(--line)] bg-[var(--surface)] text-xs font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] disabled:opacity-60"
                                >
                                  -
                                </button>
                                <span className="w-6 text-center text-xs font-semibold text-[color:var(--ink)]">{customRoleCount}</span>
                                <button
                                  type="button"
                                  onClick={() => setCustomRoleCount((prev) => clampCustomRoleCount(prev + 1))}
                                  disabled={isBusy}
                                  className="h-8 w-8 rounded-lg border border-[color:var(--line)] bg-[var(--surface)] text-xs font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] disabled:opacity-60"
                                >
                                  +
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={handleAddCustomRole}
                                disabled={isBusy}
                                className="w-full rounded-lg border border-[color:var(--line)] bg-[var(--surface)] px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] disabled:opacity-60 sm:w-auto sm:tracking-[0.3em]"
                              >
                                Dodaj
                              </button>
                            </div>
                            {settings.customRoles.length > 0 && (
                              <div className="space-y-2">
                                {settings.customRoles.map((role, index) => (
                                  <div
                                    key={`${role.name}-${index}`}
                                    className="flex min-w-0 flex-col gap-2 rounded-xl border border-[color:var(--line)] bg-[var(--surface)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <span className="min-w-0 break-words text-sm font-semibold text-[color:var(--ink)]">{role.name}</span>
                                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                      <button
                                        type="button"
                                        onClick={() => handleCustomRoleCountChange(index, -1)}
                                        disabled={isBusy}
                                        className="h-7 w-7 rounded-lg border border-[color:var(--line)] bg-[var(--surface)] text-[10px] font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] disabled:opacity-60"
                                      >
                                        -
                                      </button>
                                      <span className="w-5 text-center text-[10px] font-semibold text-[color:var(--ink)]">{role.count}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCustomRoleCountChange(index, 1)}
                                        disabled={isBusy}
                                        className="h-7 w-7 rounded-lg border border-[color:var(--line)] bg-[var(--surface)] text-[10px] font-semibold text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] disabled:opacity-60"
                                      >
                                        +
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveCustomRole(index)}
                                        disabled={isBusy}
                                        className="rounded-lg border border-[color:var(--line)] bg-[var(--surface)] px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] disabled:opacity-60 sm:tracking-[0.3em]"
                                      >
                                        Ukloni
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={handleStart}
                            disabled={isBusy}
                            className="w-full rounded-2xl bg-[var(--ink)] py-3 text-[11px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.35em] text-[color:var(--paper)] hover:opacity-90 disabled:opacity-60"
                          >
                            Podeli uloge
                          </button>
                          <button
                            onClick={handleLeaveRoom}
                            className="w-full rounded-2xl border border-red-500/40 bg-red-600 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.35em] text-white hover:bg-red-500 transition"
                          >
                            Napusti sobu
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 text-center space-y-3 sm:space-y-4">
                          <p className="text-xs text-[color:var(--ink-muted)] italic">Cekamo da domacin podeli uloge...</p>
                          <button
                            onClick={handleLeaveRoom}
                            className="w-full rounded-2xl border border-red-500/40 bg-red-600 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.35em] text-white hover:bg-red-500 transition"
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
                          <span className="title-font text-base uppercase tracking-[0.24em] sm:tracking-[0.4em] text-[color:var(--ink-muted)] select-none">
                            Drzi za prikaz
                          </span>
                        </div>

                        <div className="relative flex flex-col items-center">
                          <div className="text-6xl mb-4">{getRoleIcon(me?.role || Role.VILLAGER)}</div>
                          <h3 className="title-font break-words text-center text-3xl text-[color:var(--ink)] uppercase tracking-tight">{me?.role}</h3>
                          <p className="mt-3 text-xs text-[color:var(--ink-muted)] px-4">
                            {getRoleDescription(me?.role || Role.VILLAGER)}
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
                            className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.35em]"
                          >
                            <span className={`min-w-0 flex-1 break-words text-left font-semibold ${player.hasConfirmed ? 'text-emerald-600' : 'text-[color:var(--ink-soft)]'}`}>
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
                        className="w-full rounded-2xl border border-red-500/40 bg-red-600 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.35em] text-white hover:bg-red-500 transition"
                      >
                        Napusti sobu
                      </button>
                    </div>
                  ))}

                  {phase === GamePhase.READY_TO_PLAY && (me?.isNarrator ? (
                    narratorPanel
                  ) : (
                    <div className="text-center space-y-5 sm:space-y-6 py-4">
                      {isMeEliminated ? (
                        <div className="space-y-4">
                          <div>
                            <h2 className="title-font text-3xl text-[color:var(--ink)]">Groblje</h2>
                            <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
                              Chat soba za eliminisane igrace.
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 text-left space-y-3">
                            <div className="h-[50vh] min-h-[300px] max-h-[560px] overflow-y-auto space-y-1.5 rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] p-2.5">
                              {graveyardMessages.length ? (
                                [...graveyardMessages].reverse().map((message) => (
                                  <div
                                    key={message.id}
                                    className="rounded-lg border border-[color:var(--line)] bg-[var(--surface)] px-2.5 py-2 text-xs text-[color:var(--ink-muted)]"
                                  >
                                    <span className="font-semibold text-[color:var(--ink)]">{message.senderName}:</span>{' '}
                                    {message.message}
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-[color:var(--ink-soft)]">Nema poruka.</p>
                              )}
                            </div>
                            <div className="grid gap-2 sm:grid-cols-[1fr,auto] sm:items-end">
                              <textarea
                                value={graveyardDraftMessage}
                                onChange={(event) => setGraveyardDraftMessage(event.target.value)}
                                placeholder="Poruka za groblje..."
                                className="min-h-[86px] w-full resize-y rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:ring-2 focus:ring-red-400/50"
                              />
                              <button
                                onClick={handleSendGraveyardMessage}
                                disabled={isBusy || !graveyardDraftMessage.trim()}
                                className="w-full rounded-xl bg-[var(--ink)] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)] hover:opacity-90 disabled:opacity-60 sm:w-auto sm:min-h-[86px]"
                              >
                                Posalji
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : roundState?.phase === 'night' && myNightActionType ? (
                        <div className="space-y-4">
                          <div>
                            <h2 className="title-font text-3xl text-[color:var(--ink)]">Nocna akcija</h2>
                            <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
                              Izaberi igraca za svoju akciju i potvrdi slanje.
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 text-left space-y-3">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                              Tvoja uloga: {me?.role}
                            </p>
                            <select
                              value={nightTargetId}
                              onChange={(event) => setNightTargetId(event.target.value)}
                              className="w-full rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[color:var(--ink)] focus:outline-none focus:ring-2 focus:ring-red-400/50"
                            >
                              <option value="">Izaberi igraca</option>
                              {availableNightTargets.map((player) => (
                                <option key={player.id} value={player.id}>
                                  {player.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={handleSubmitNightAction}
                              disabled={isBusy || !nightTargetId}
                              className="w-full rounded-xl bg-[var(--ink)] py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)] hover:opacity-90 disabled:opacity-60"
                            >
                              Posalji akciju
                            </button>
                            {mySubmittedAction && (
                              <p className="text-xs text-[color:var(--ink-muted)]">
                                Poslednji izbor: {mySubmittedAction.targetName}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : roundState?.phase === 'night' ? (
                        <div>
                          <h2 className="title-font text-3xl text-[color:var(--ink)]">Noc je u toku</h2>
                          <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
                            Tvoja uloga nema nocnu akciju. Cekamo ostale igrace i naratora.
                          </p>
                        </div>
                      ) : roundState?.phase === 'voting' ? (
                        <div className="space-y-4">
                          <div>
                            <h2 className="title-font text-3xl text-[color:var(--ink)]">Glasanje je u toku</h2>
                            <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
                              Izaberi igraca i potvrdi glas. Rezultat izlazi kada svi zivi glasaju.
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-4 text-left space-y-3">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                              Glasanje
                            </p>
                            <select
                              value={voteTargetId}
                              onChange={(event) => setVoteTargetId(event.target.value)}
                              className="w-full rounded-xl border border-[color:var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[color:var(--ink)] focus:outline-none focus:ring-2 focus:ring-red-400/50"
                            >
                              <option value="">Izaberi igraca</option>
                              {alivePlayers.map((player) => (
                                <option key={player.id} value={player.id}>
                                  {player.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={handleFinishVoting}
                              disabled={isBusy || !voteTargetId}
                              className="w-full rounded-xl bg-[var(--ink)] py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)] hover:opacity-90 disabled:opacity-60"
                            >
                              Potvrdi glas
                            </button>
                            {mySubmittedVote && (
                              <p className="text-xs text-[color:var(--ink-muted)]">
                                Tvoj poslednji glas: {mySubmittedVote.targetName}
                              </p>
                            )}
                            <div className="text-xs text-[color:var(--ink-muted)]">
                              Glasalo: {votedPlayers.length}/{alivePlayers.length}
                            </div>
                            <div className="text-xs text-[color:var(--ink-muted)]">
                              Cekamo: {pendingVoters.length ? pendingVoters.map((player) => player.name).join(', ') : 'svi su glasali'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h2 className="title-font text-3xl text-[color:var(--ink)]">Spremni!</h2>
                          <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
                            Cekamo da narator pokrene sledecu nocnu rundu.
                          </p>
                        </div>
                      )}

                      <div className="h-px bg-[color:var(--line)] w-full"></div>
                      <div className="space-y-3">
                        {me?.isHost && (
                          <button
                            onClick={handleResetGame}
                            disabled={isBusy}
                            className="w-full rounded-2xl bg-[var(--ink)] py-3 text-[11px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.35em] text-[color:var(--paper)] hover:opacity-90 disabled:opacity-60"
                          >
                            Nova podela uloga
                          </button>
                        )}
                        <button
                          onClick={handleLeaveRoom}
                          className="w-full rounded-2xl border border-red-500/40 bg-red-600 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.35em] text-white hover:bg-red-500 transition"
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

          {renderVoteSummaryModal()}

          <footer className="mt-5 sm:mt-8 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.4em] text-[color:var(--ink-soft)]">
            <i className="fas fa-fingerprint"></i>
            <span>Mafia Card Dealer</span>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default App;



