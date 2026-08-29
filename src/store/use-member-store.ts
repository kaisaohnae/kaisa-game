import {create} from 'zustand';
import {apiPost} from '@/config/api-config';
import {clearToken, getToken, setToken} from '@/lib/auth-storage';

export type MemberInfo = {
  memberId: string;
  memberName: string;
  email: string;
};

type State = {
  member: MemberInfo | null;
  hydrated: boolean;
};

type Actions = {
  hydrate: () => Promise<void>;
  login: (email: string, pwd: string, captcha?: string) => Promise<void>;
  register: (payload: {
    email: string;
    pwd: string;
    pwdConfirm: string;
    certNumber: string;
    memberName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  withdraw: (pwd: string) => Promise<void>;
};

const useMemberStore = create<State & Actions>(set => ({
  member: null,
  hydrated: false,
  hydrate: async () => {
    if (!getToken('member')) {
      set({member: null, hydrated: true});
      return;
    }
    try {
      const body = await apiPost<{memberInfo: MemberInfo}>('bl/me', {}, 'member');
      set({member: body.data.memberInfo, hydrated: true});
    } catch {
      clearToken('member');
      set({member: null, hydrated: true});
    }
  },
  login: async (email, pwd, captcha) => {
    const body = await apiPost<{memberInfo: MemberInfo; token: string}>('bl/login', {email, pwd, captcha});
    setToken('member', body.data.token);
    set({member: body.data.memberInfo, hydrated: true});
  },
  register: async payload => {
    const body = await apiPost<{memberInfo: MemberInfo; token: string}>('bl/register', {
      email: payload.email,
      pwd: payload.pwd,
      pwd_confirmation: payload.pwdConfirm,
      certNumber: payload.certNumber,
      memberName: payload.memberName,
    });
    setToken('member', body.data.token);
    set({member: body.data.memberInfo, hydrated: true});
  },
  logout: async () => {
    try {
      await apiPost('bl/logout', {}, 'member');
    } catch {
      /* ignore */
    }
    clearToken('member');
    set({member: null, hydrated: true});
  },
  withdraw: async pwd => {
    await apiPost('bl/withdraw', {pwd}, 'member');
    clearToken('member');
    set({member: null, hydrated: true});
  },
}));

export default useMemberStore;
