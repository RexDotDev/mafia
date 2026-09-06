import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GamePhase,
  Role,
  RoomData,
  RoomSettings,
  RoundActionType,
  RoundState,
} from './types';
import {
  confirmRole,
  finishVoting,
  getRoomState,
  joinRoom,
  leaveRoom,
  resetGame,
  resolveRound,
  sendGraveyardMessage,
  sendMafiaMessage,
  startGame,
  startRound,
  submitRoundAction,
  updateSettings,
} from './services/roomApi';
import { clampCustomRoleCount, mergeCustomRole } from './utils/gameUtils';
import { useTheme } from './hooks/useTheme';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { EntryScreen } from './components/EntryScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { RoleRevealScreen } from './components/RoleRevealScreen';
import { NarratorScreen } from './components/NarratorScreen';
import { GraveyardScreen } from './components/GraveyardScreen';
import { NightActionCard } from './components/NightActionCard';
import { VotingCard } from './components/VotingCard';
import { GameResultModal } from './components/Modals/GameResultModal';
import { VoteSummaryModal } from './components/Modals/VoteSummaryModal';
import { MafiaChatModal } from './components/Modals/MafiaChatModal';

const DEFAULT_SETTINGS: RoomSettings = {
  mafiaCount: 1,
  doctor: true,
  detective: true,
  lady: false,
  casualMode: false,
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
    casualMode: typeof raw?.casualMode === 'boolean' ? raw.casualMode : false,
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

  const mafiaMessages = Array.isArray(raw?.mafiaMessages)
    ? raw.mafiaMessages
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
    mafiaMessages,
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
    gameResult:
      raw?.gameResult &&
      typeof raw.gameResult === 'object' &&
      (raw.gameResult.winner === 'city' || raw.gameResult.winner === 'mafia')
        ? {
            winner: raw.gameResult.winner,
            message: typeof raw.gameResult.message === 'string' ? raw.gameResult.message : '',
            round:
              typeof raw.gameResult.round === 'number'
                ? Math.max(0, Math.floor(raw.gameResult.round))
                : 0,
            createdAt:
              typeof raw.gameResult.createdAt === 'string'
                ? raw.gameResult.createdAt
                : '',
          }
        : null,
  };
};

type EntryMode = 'join' | 'create';

const generateRoomCode = () => Math.floor(100000 + Math.random() * 900000).toString();
const SESSION_KEY = 'mafia_session_v2';

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
  const [mafiaDraftMessage, setMafiaDraftMessage] = useState('');
  const [showVoteSummaryModal, setShowVoteSummaryModal] = useState(false);
  const [dismissedVoteSummaryKey, setDismissedVoteSummaryKey] = useState('');
  const [showGameResultModal, setShowGameResultModal] = useState(false);
  const [dismissedGameResultKey, setDismissedGameResultKey] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [hasRestoredSession, setHasRestoredSession] = useState(false);

  const { theme, toggleTheme } = useTheme();

  const [clientId] = useState(() => {
    const stored = localStorage.getItem('mafia_client_id');
    if (stored) return stored;
    const generated = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    localStorage.setItem('mafia_client_id', generated);
    return generated;
  });

  const graveyardChatRef = useRef<HTMLDivElement | null>(null);

  const loadRoomById = useCallback(async (id: string) => {
    if (!roomCode) return;
    try {
      const snapshot = await getRoomState({ roomId: id, roomCode, clientId });
      setRoom({
        id: snapshot.id,
        status: snapshot.status,
        settings: normalizeSettings(snapshot.settings),
        players: snapshot.players,
        roundState: normalizeRoundState(snapshot.roundState),
      });
    } catch (error) {
      console.error('Failed to load room state', error);
    }
  }, [clientId, roomCode]);

  useEffect(() => {
    if (!roomId) return;

    let active = true;
    let inFlight = false;
    const refresh = async () => {
      if (!active || inFlight) return;
      inFlight = true;
      try {
        await loadRoomById(roomId);
      } finally {
        inFlight = false;
      }
    };

    refresh();
    const interval = window.setInterval(refresh, 2000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [roomId, loadRoomById]);

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
      setErrorMessage(error?.message || 'Could not join the room.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleJoin = async () => {
    if (!playerName.trim() || !roomCode.trim()) return;
    const normalizedCode = roomCode.replace(/\D/g, '').slice(0, 6);
    if (normalizedCode.length !== 6) {
      setErrorMessage('Enter a 6-digit room code.');
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
      setErrorMessage(error?.message || 'Could not start the game.');
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
      setErrorMessage(error?.message || 'Could not confirm your role.');
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
      setErrorMessage(error?.message || 'Could not update the room settings.');
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
      setErrorMessage(error?.message || 'Could not start the round.');
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
      setErrorMessage(error?.message || 'Could not submit the action.');
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
      setErrorMessage(error?.message || 'Could not resolve the night.');
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
      setErrorMessage(error?.message || 'Could not submit the vote.');
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
      setErrorMessage(error?.message || 'Could not send the graveyard message.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSendMafiaMessage = async () => {
    if (!roomCode || !mafiaDraftMessage.trim()) return;
    setErrorMessage('');
    setIsBusy(true);
    try {
      await sendMafiaMessage({
        roomCode,
        clientId,
        message: mafiaDraftMessage.trim(),
      });
      setMafiaDraftMessage('');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Could not send the Mafia message.');
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
      setErrorMessage(error?.message || 'Could not update the room settings.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleCasualModeToggle = async () => {
    if (!roomCode || !room) return;
    const next = !settings.casualMode;
    setErrorMessage('');
    setIsBusy(true);
    try {
      await updateSettings({
        roomCode,
        clientId,
        settings: {
          ...settings,
          casualMode: next,
        },
      });
    } catch (error: any) {
      setErrorMessage(error?.message || 'Could not change the game mode.');
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
      setErrorMessage(error?.message || 'Could not update the room settings.');
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
      setErrorMessage(error?.message || 'Could not update the room settings.');
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
      setErrorMessage(error?.message || 'Could not update the room settings.');
    } finally {
      setIsBusy(false);
    }
  };

  const players = room?.players ?? [];
  const settings = room?.settings ?? DEFAULT_SETTINGS;
  const roundState = room?.roundState;
  const isCasualMode = !!settings.casualMode;

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

  const mafiaMessages = useMemo(
    () => (roundState?.mafiaMessages ?? []).slice(-200),
    [roundState?.mafiaMessages],
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
  const gameResult = roundState?.gameResult ?? null;

  const voteSummaryModalKey = useMemo(() => {
    if (!roundState || !lastVoteSummary) return '';
    const countsKey = lastVoteSummary.voteCounts
      .map((entry) => `${entry.playerId}:${entry.votes}`)
      .join('|');
    return `${roundState.round}:${lastVoteSummary.completedVoters}:${lastVoteSummary.totalVoters}:${lastVoteSummary.eliminatedPlayerId || 'none'}:${countsKey}`;
  }, [roundState, lastVoteSummary]);

  const gameResultModalKey = useMemo(() => {
    if (!gameResult) return '';
    return `${gameResult.winner}:${gameResult.round}:${gameResult.createdAt}:${gameResult.message}`;
  }, [gameResult]);

  const availableNightTargets = useMemo(() => {
    if (!me || !myNightActionType) return [];
    return alivePlayers.filter(
      (player) => player.id !== me.id || myNightActionType === 'doctor_heal',
    );
  }, [alivePlayers, me, myNightActionType]);

  const isMeEliminated = me ? eliminatedPlayerIds.has(me.id) : false;
  const isMafiaNightChatOpen =
    phase === GamePhase.READY_TO_PLAY &&
    !isCasualMode &&
    !!me &&
    !me.isNarrator &&
    !isMeEliminated &&
    me.role === Role.MAFIA &&
    roundState?.phase === 'night' &&
    !gameResult;

  useEffect(() => {
    if (!isMeEliminated) {
      setGraveyardDraftMessage('');
    }
  }, [isMeEliminated]);

  useEffect(() => {
    if (!isMafiaNightChatOpen) {
      setMafiaDraftMessage('');
    }
  }, [isMafiaNightChatOpen]);

  useEffect(() => {
    if (!isMeEliminated) return;
    const chatEl = graveyardChatRef.current;
    if (!chatEl) return;
    chatEl.scrollTop = chatEl.scrollHeight;
  }, [graveyardMessages.length, isMeEliminated]);

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

  useEffect(() => {
    if (!gameResultModalKey) {
      setShowGameResultModal(false);
      return;
    }
    if (dismissedGameResultKey !== gameResultModalKey) {
      setShowGameResultModal(true);
    }
  }, [gameResultModalKey, dismissedGameResultKey]);

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

  const handleDraftMafiaChange = (delta: number) => {
    setDraftSettings((prev) => ({
      ...prev,
      mafiaCount: Math.max(1, prev.mafiaCount + delta),
    }));
  };

  const toggleDraftLady = () => {
    setDraftSettings((prev) => ({ ...prev, lady: !prev.lady }));
  };

  const toggleDraftCasualMode = () => {
    setDraftSettings((prev) => ({ ...prev, casualMode: !prev.casualMode }));
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
      setErrorMessage(error?.message || 'Could not reset the game.');
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
    setMafiaDraftMessage('');
    setShowVoteSummaryModal(false);
    setDismissedVoteSummaryKey('');
    setShowGameResultModal(false);
    setDismissedGameResultKey('');

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

  const closeGameResultModal = () => {
    if (gameResultModalKey) {
      setDismissedGameResultKey(gameResultModalKey);
    }
    setShowGameResultModal(false);
  };

  const themeToggleFloating = (
    <button
      type="button"
      onClick={toggleTheme}
      className="hidden md:flex fixed right-4 top-4 sm:right-6 sm:top-6 z-50 h-11 w-11 items-center justify-center rounded-full border border-[color:var(--line)] bg-[var(--surface-strong)] text-[color:var(--ink)] hover:opacity-80 transition"
      aria-label="Change theme"
      title={theme === 'light' ? 'Use dark theme' : 'Use light theme'}
    >
      <i className={`fas ${theme === 'light' ? 'fa-moon' : 'fa-sun'}`}></i>
    </button>
  );

  const themeToggleInline = (
    <button
      type="button"
      onClick={toggleTheme}
      className="md:hidden h-10 w-10 rounded-full border border-[color:var(--line)] bg-[var(--surface-strong)] text-[color:var(--ink)] hover:opacity-80 transition"
      aria-label="Change theme"
      title={theme === 'light' ? 'Use dark theme' : 'Use light theme'}
    >
      <i className={`fas ${theme === 'light' ? 'fa-moon' : 'fa-sun'}`}></i>
    </button>
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

  const isFocusedGraveyardMode =
    phase === GamePhase.READY_TO_PLAY && !!me && !me.isNarrator && isMeEliminated;

  if (!hasRestoredSession) {
    return (
      <div className="app-bg">
        {themeToggleFloating}
        <div className="app-shell flex min-h-[100dvh] items-center justify-center px-4 py-6 sm:px-5 sm:py-12">
          <div className="w-full max-w-sm rounded-2xl border border-[color:var(--line)] bg-[var(--surface)] p-8 shadow-elevated dark:shadow-elevated-dark relative text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative flex items-center justify-center">
                <span className="absolute h-14 w-14 rounded-full bg-red-500/10 animate-ping"></span>
                <img
                  src="/favicon.png"
                  alt="Mafia"
                  className="h-10 w-10 rounded-xl border border-[color:var(--line)] relative z-10 shadow-xs"
                />
              </div>
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-[color:var(--ink)]">
                Syncing Session
              </h1>
              <p className="mt-1 text-xs text-[color:var(--ink-muted)]">
                Connecting to Mafia game frequency...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isFocusedGraveyardMode) {
    return (
      <GraveyardScreen
        gameResult={gameResult}
        messages={graveyardMessages}
        currentUserId={me?.id}
        draftMessage={graveyardDraftMessage}
        onDraftMessageChange={setGraveyardDraftMessage}
        onSendMessage={handleSendGraveyardMessage}
        isBusy={isBusy}
        chatRef={graveyardChatRef}
        onLeaveRoom={handleLeaveRoom}
        themeToggleFloating={themeToggleFloating}
        themeToggleInline={themeToggleInline}
      >
        <GameResultModal
          isOpen={showGameResultModal && room?.status === 'finished' && !!gameResult}
          gameResult={gameResult}
          onClose={closeGameResultModal}
        />
        <VoteSummaryModal
          isOpen={showVoteSummaryModal && room?.status === 'finished' && !gameResult}
          voteSummary={lastVoteSummary}
          onClose={closeVoteSummaryModal}
        />
      </GraveyardScreen>
    );
  }

  return (
    <div className="app-bg">
      {themeToggleFloating}
      <div className="app-shell flex min-h-[100dvh] flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-12">
        <div className="w-full max-w-5xl">
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[color:var(--line)] bg-[var(--surface)] shadow-elevated dark:shadow-elevated-dark">
            <div className="grid md:grid-cols-[300px,1fr]">
              <Header
                roomCode={roomCode}
                phase={phase}
                entryMode={entryMode}
                copyStatus={copyStatus}
                theme={theme}
                onToggleTheme={toggleTheme}
                onCopyCode={handleCopyCode}
                onNewCode={() => setRoomCode(generateRoomCode())}
              />

              <main className="p-6 sm:p-8 md:p-10 bg-[var(--surface)]">
                {errorMessage && (
                  <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                    <i className="fas fa-circle-exclamation text-xs shrink-0"></i>
                    <span>{errorMessage}</span>
                  </div>
                )}

                {room?.status !== 'waiting' && narrator && (
                  <div className="mb-5 rounded-xl border border-[color:var(--line)] bg-[var(--surface-soft)] px-4 py-2.5 text-xs text-[color:var(--ink-muted)] flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--ink-faint)] flex items-center gap-1.5">
                      <i className="fas fa-crown text-[10px] text-amber-500"></i>
                      Narrator:
                    </span>
                    <span className="font-semibold text-[color:var(--ink)]">{narrator.name}</span>
                  </div>
                )}

                {phase === GamePhase.JOIN && (
                  <EntryScreen
                    entryMode={entryMode}
                    playerName={playerName}
                    roomCode={roomCode}
                    isBusy={isBusy}
                    draftSettings={draftSettings}
                    draftCustomRoleName={draftCustomRoleName}
                    draftCustomRoleCount={draftCustomRoleCount}
                    showDraftCustomRoles={showDraftCustomRoles}
                    onModeChange={handleModeChange}
                    onPlayerNameChange={setPlayerName}
                    onRoomCodeChange={setRoomCode}
                    onDraftMafiaChange={handleDraftMafiaChange}
                    onToggleDraftLady={toggleDraftLady}
                    onToggleDraftCasualMode={toggleDraftCasualMode}
                    onToggleShowDraftCustomRoles={() => setShowDraftCustomRoles((prev) => !prev)}
                    onDraftCustomRoleNameChange={setDraftCustomRoleName}
                    onDraftCustomRoleCountChange={setDraftCustomRoleCount}
                    onAddDraftCustomRole={handleAddDraftCustomRole}
                    onUpdateDraftCustomRoleCount={handleDraftCustomRoleCountChange}
                    onRemoveDraftCustomRole={handleRemoveDraftCustomRole}
                    onSubmit={handleJoin}
                  />
                )}

                {phase === GamePhase.LOBBY && (
                  <LobbyScreen
                    players={players}
                    clientId={clientId}
                    isHost={!!me?.isHost}
                    settings={settings}
                    customRoleName={customRoleName}
                    customRoleCount={customRoleCount}
                    isBusy={isBusy}
                    onCustomRoleNameChange={setCustomRoleName}
                    onCustomRoleCountChange={setCustomRoleCount}
                    onMafiaCountChange={handleMafiaCountChange}
                    onLadyToggle={handleLadyToggle}
                    onCasualModeToggle={handleCasualModeToggle}
                    onAddCustomRole={handleAddCustomRole}
                    onCustomRoleUpdate={handleCustomRoleCountChange}
                    onRemoveCustomRole={handleRemoveCustomRole}
                    onStartGame={handleStart}
                    onLeaveRoom={handleLeaveRoom}
                  />
                )}

                {(phase === GamePhase.REVEAL || phase === GamePhase.WAITING_FOR_OTHERS) && (
                  me?.isNarrator ? (
                    <NarratorScreen
                      roomStatus={room?.status}
                      roundState={roundState ?? null}
                      isCasualMode={isCasualMode}
                      alivePlayers={alivePlayers}
                      gameResult={gameResult}
                      isBusy={isBusy}
                      votedPlayers={votedPlayers}
                      pendingVoters={pendingVoters}
                      roundActionSummary={roundActionSummary}
                      roundInspectorPreview={roundInspectorPreview}
                      playerNameById={playerNameById}
                      players={players}
                      eliminatedPlayerIds={eliminatedPlayerIds}
                      me={me ?? null}
                      onStartRound={handleStartRound}
                      onResolveRound={handleResolveRound}
                      onResetGame={handleResetGame}
                      onLeaveRoom={handleLeaveRoom}
                    />
                  ) : (
                    <RoleRevealScreen
                      phase={phase === GamePhase.REVEAL ? 'REVEAL' : 'WAITING_FOR_OTHERS'}
                      role={me?.role}
                      players={players}
                      isBusy={isBusy}
                      onConfirmRole={handleConfirm}
                      onLeaveRoom={handleLeaveRoom}
                    />
                  )
                )}

                {phase === GamePhase.READY_TO_PLAY && (
                  me?.isNarrator ? (
                    <NarratorScreen
                      roomStatus={room?.status}
                      roundState={roundState ?? null}
                      isCasualMode={isCasualMode}
                      alivePlayers={alivePlayers}
                      gameResult={gameResult}
                      isBusy={isBusy}
                      votedPlayers={votedPlayers}
                      pendingVoters={pendingVoters}
                      roundActionSummary={roundActionSummary}
                      roundInspectorPreview={roundInspectorPreview}
                      playerNameById={playerNameById}
                      players={players}
                      eliminatedPlayerIds={eliminatedPlayerIds}
                      me={me ?? null}
                      onStartRound={handleStartRound}
                      onResolveRound={handleResolveRound}
                      onResetGame={handleResetGame}
                      onLeaveRoom={handleLeaveRoom}
                    />
                  ) : (
                    <div className="space-y-6">
                      {gameResult ? (
                        <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-soft)] p-6 text-center space-y-2">
                          <div className="h-12 w-12 mx-auto rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center text-xl">
                            <i className="fas fa-trophy"></i>
                          </div>
                          <h2 className="font-display text-2xl font-bold text-[color:var(--ink)]">Game Over</h2>
                          <p className="text-xs text-[color:var(--ink-muted)]">
                            {gameResult.winner === 'city' ? 'The townspeople have eliminated the Mafia!' : 'The Mafia syndicate has taken control of the town!'}
                          </p>
                        </div>
                      ) : isCasualMode ? (
                        <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-soft)] p-6 text-center space-y-2">
                          <div className="h-10 w-10 mx-auto rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-lg">
                            <i className="fas fa-masks-theater"></i>
                          </div>
                          <h2 className="font-display text-xl font-bold text-[color:var(--ink)]">Role-Only Mode Active</h2>
                          <p className="text-xs text-[color:var(--ink-muted)] max-w-md mx-auto leading-relaxed">
                            Roles are assigned. Continue night actions, accusations, and voting live in person.
                          </p>
                        </div>
                      ) : roundState?.phase === 'night' && me?.role === Role.MAFIA ? (
                        <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-6 text-center space-y-3">
                          <div className="h-12 w-12 mx-auto rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center text-xl">
                            <i className="fas fa-user-secret"></i>
                          </div>
                          <h2 className="font-display text-2xl font-bold text-[color:var(--ink)]">Syndicate Night</h2>
                          <p className="text-xs text-[color:var(--ink-muted)] max-w-md mx-auto">
                            The Mafia chat channel is active. Conspire with your team to select tonight's target.
                          </p>
                        </div>
                      ) : roundState?.phase === 'night' && myNightActionType && me?.role !== Role.MAFIA ? (
                        <NightActionCard
                          role={me?.role}
                          targetId={nightTargetId}
                          availableTargets={availableNightTargets}
                          lastSubmittedTargetName={mySubmittedAction?.targetName}
                          isBusy={isBusy}
                          onTargetChange={setNightTargetId}
                          onSubmit={handleSubmitNightAction}
                        />
                      ) : roundState?.phase === 'night' ? (
                        <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-soft)] p-6 text-center space-y-2">
                          <div className="h-10 w-10 mx-auto rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-lg">
                            <i className="fas fa-moon"></i>
                          </div>
                          <h2 className="font-display text-xl font-bold text-[color:var(--ink)]">The Town Sleeps</h2>
                          <p className="text-xs text-[color:var(--ink-muted)] max-w-md mx-auto">
                            Your role takes no night action. Waiting for other roles and the narrator.
                          </p>
                        </div>
                      ) : roundState?.phase === 'voting' ? (
                        <VotingCard
                          targetId={voteTargetId}
                          alivePlayers={alivePlayers}
                          votedPlayers={votedPlayers}
                          pendingVoters={pendingVoters}
                          mySubmittedVote={mySubmittedVote ?? undefined}
                          isBusy={isBusy}
                          onTargetChange={setVoteTargetId}
                          onSubmitVote={handleFinishVoting}
                        />
                      ) : (
                        <div className="rounded-xl border border-[color:var(--line)] bg-[var(--surface-soft)] p-6 text-center space-y-2">
                          <div className="h-10 w-10 mx-auto rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-lg">
                            <i className="fas fa-hourglass-start"></i>
                          </div>
                          <h2 className="font-display text-xl font-bold text-[color:var(--ink)]">Awaiting Next Round</h2>
                          <p className="text-xs text-[color:var(--ink-muted)] max-w-md mx-auto">
                            Waiting for the narrator to initiate the next phase.
                          </p>
                        </div>
                      )}

                      <div className="pt-3 border-t border-[color:var(--line)] space-y-2">
                        {me?.isHost && (
                          <button
                            type="button"
                            onClick={handleResetGame}
                            disabled={isBusy}
                            className="w-full py-2.5 rounded-xl bg-[var(--ink)] text-[var(--paper)] text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition btn-tactile"
                          >
                            Assign New Roles
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleLeaveRoom}
                          className="w-full py-2.5 rounded-xl border border-[color:var(--line)] text-xs font-medium text-[color:var(--ink-muted)] hover:text-red-600 hover:border-red-500/30 transition btn-tactile"
                        >
                          Leave Room
                        </button>
                      </div>
                    </div>
                  )
                )}
              </main>
            </div>
          </div>

          <MafiaChatModal
            isOpen={isMafiaNightChatOpen}
            round={roundState?.round || 0}
            messages={mafiaMessages}
            currentUserId={me?.id}
            draftMessage={mafiaDraftMessage}
            nightTargetId={nightTargetId}
            availableTargets={availableNightTargets}
            lastSubmittedTargetName={mySubmittedAction?.targetName}
            isBusy={isBusy}
            onDraftChange={setMafiaDraftMessage}
            onSendMessage={handleSendMafiaMessage}
            onTargetChange={setNightTargetId}
            onSubmitTarget={handleSubmitNightAction}
          />
          <GameResultModal
            isOpen={showGameResultModal && room?.status === 'finished' && !!gameResult}
            gameResult={gameResult}
            onClose={closeGameResultModal}
          />
          <VoteSummaryModal
            isOpen={showVoteSummaryModal && room?.status === 'finished' && !gameResult}
            voteSummary={lastVoteSummary}
            onClose={closeVoteSummaryModal}
          />

          <Footer />
        </div>
      </div>
    </div>
  );
};

export default App;
