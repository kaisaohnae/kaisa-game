export type HihiRegion = {
  regionCode: string;
  regionName: string;
  description: string;
  worldSize: number;
  tileSize: number;
  spawnX: number;
  spawnY: number;
  maxPlayers: number;
  onlineCount: number;
};

export type HihiProfile = {
  genderCode?: string | null;
  jobCode?: string | null;
  heightCm?: number | null;
  drinkCode?: string | null;
  smokeCode?: string | null;
  mbti?: string | null;
  bloodType?: string | null;
  birthYear?: number | null;
  personalityText?: string | null;
  introText?: string | null;
};

export type HihiCharacter = {
  memberId: string;
  nickname: string;
  regionCode?: string | null;
  posX: number;
  posY: number;
  facing: string;
  motionCode?: string | null;
  avatarName?: string | null;
  avatarTitle?: string | null;
  profile: HihiProfile;
};

export type HihiPresence = {
  memberId: string;
  nickname: string;
  regionCode: string;
  posX: number;
  posY: number;
  facing: string;
  motionCode?: string | null;
  avatarName?: string | null;
  avatarTitle?: string | null;
  profileBrief?: HihiProfile | null;
};

export type HihiChatMessageType = 'chat' | 'system' | 'whisper' | 'emote';

export type HihiChatMessage = {
  messageNo: number;
  regionCode: string;
  messageType: HihiChatMessageType | string;
  memberId?: string | null;
  nickname: string;
  targetMemberId?: string | null;
  targetNickname?: string | null;
  clientMsgId?: string | null;
  message: string;
  mine?: boolean;
  createDt?: string | null;
  pending?: boolean;
  failed?: boolean;
};

export type Screen = 'boot' | 'create' | 'edit' | 'world';
