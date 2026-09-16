import type {HihiChatMessage, HihiPresence, HihiProfile, HihiRegion} from './types';

type ApiBody<T> = {success: boolean; message: string; data: T};

function gameApiBase() {
  return (
    process.env.NEXT_PUBLIC_GAME_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:57182/api'
  ).replace(/\/$/, '');
}

async function gameFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${gameApiBase()}/${path.replace(/^\//, '')}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const body = (await res.json().catch(() => null)) as ApiBody<T> | null;
  if (!body?.success) {
    throw new Error(body?.message || `Request failed (${res.status})`);
  }
  return body.data;
}

export type HihiHeartbeatPayload = {
  memberId: string;
  regionCode: string;
  posX: number;
  posY: number;
  facing: string;
  motionCode?: string;
  nickname: string;
  avatarName?: string | null;
  avatarTitle?: string | null;
  profile?: HihiProfile | null;
};

export const hihiApi = {
  regions: () => gameFetch<HihiRegion[]>('hihi/regions'),
  leaveRoom: (memberId: string, regionCode?: string) =>
    gameFetch<{ok: boolean}>('hihi/room/leave', {
      method: 'POST',
      body: JSON.stringify({memberId, regionCode}),
    }),
  heartbeat: (payload: HihiHeartbeatPayload) =>
    gameFetch<HihiPresence[]>('hihi/presence/heartbeat', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  chatSend: (payload: {
    memberId: string;
    regionCode: string;
    message: string;
    nickname: string;
    messageType?: string;
    targetMemberId?: string;
    clientMsgId?: string;
  }) =>
    gameFetch<HihiChatMessage>('hihi/chat/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  chatMessages: (params: {regionCode: string; memberId: string; afterId?: number}) => {
    const q = new URLSearchParams({
      regionCode: params.regionCode,
      memberId: params.memberId,
      afterId: String(params.afterId ?? 0),
    });
    return gameFetch<HihiChatMessage[]>(`hihi/chat/messages?${q.toString()}`);
  },
  getProfile: async (memberId: string) => {
    try {
      return await gameFetch<{
        memberId: string;
        nickname: string;
        avatarName?: string | null;
        avatarTitle?: string | null;
        profile: HihiProfile;
      }>(`hihi/profile?memberId=${encodeURIComponent(memberId)}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('저장된 프로필') || msg.includes('없습니다')) return null;
      throw e;
    }
  },
  checkNickname: (nickname: string, memberId?: string | null) => {
    const q = new URLSearchParams({nickname});
    if (memberId) q.set('memberId', memberId);
    return gameFetch<{available: boolean; nickname: string}>(`hihi/nickname/check?${q.toString()}`);
  },
  saveProfile: (payload: {
    memberId: string;
    nickname: string;
    avatarName?: string | null;
    avatarTitle?: string | null;
    profile: HihiProfile;
  }) =>
    gameFetch<{
      memberId: string;
      nickname: string;
      avatarName?: string | null;
      avatarTitle?: string | null;
      profile: HihiProfile;
    }>('hihi/profile', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
