'use client';

import React, {useEffect, useRef, useState} from 'react';
import {hihiApi} from './api';
import type {HihiChatMessage, HihiPresence} from './types';

type Props = {
  memberId: string;
  nickname: string;
  regionCode: string;
  whisperTarget: HihiPresence | null;
  onClearWhisper: () => void;
  onMessagesChange?: (msgs: HihiChatMessage[]) => void;
  active: boolean;
  onUnread?: (n: number) => void;
};

function formatTime(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function clientMsgId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function mergeMessages(prev: HihiChatMessage[], incoming: HihiChatMessage[]) {
  const byNo = new Map<number, HihiChatMessage>();
  const pendingByClient = new Map<string, HihiChatMessage>();

  const ingest = (m: HihiChatMessage) => {
    const cid = m.clientMsgId || undefined;
    if (m.pending && cid) {
      pendingByClient.set(cid, m);
      return;
    }
    if (cid) pendingByClient.delete(cid);
    byNo.set(m.messageNo, {...m, pending: false, failed: Boolean(m.failed)});
  };

  for (const m of prev) ingest(m);
  for (const m of incoming) ingest(m);

  for (const [cid] of pendingByClient) {
    for (const m of byNo.values()) {
      if (m.clientMsgId === cid) {
        pendingByClient.delete(cid);
        break;
      }
    }
  }

  return [...byNo.values(), ...pendingByClient.values()]
    .sort((a, b) => (a.messageNo || 0) - (b.messageNo || 0))
    .slice(-80);
}

export function ChatPanel({
  memberId,
  nickname,
  regionCode,
  whisperTarget,
  onClearWhisper,
  onMessagesChange,
  active,
  onUnread,
}: Props) {
  const [messages, setMessages] = useState<HihiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const logRef = useRef<HTMLDivElement | null>(null);
  const stickBottomRef = useRef(true);
  const lastIdRef = useRef(0);
  const unreadRef = useRef(0);

  // New room = fresh ephemeral chat (no history)
  useEffect(() => {
    setMessages([]);
    lastIdRef.current = 0;
    unreadRef.current = 0;
    onUnread?.(0);
  }, [regionCode, onUnread]);

  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const list = await hihiApi.chatMessages({
          regionCode,
          memberId,
          afterId: lastIdRef.current,
        });
        if (!alive || !list.length) return;
        setMessages(prev => {
          const next = mergeMessages(prev, list);
          const newest = Math.max(...list.map(m => m.messageNo));
          if (newest > lastIdRef.current) lastIdRef.current = newest;
          return next;
        });
        if (!active) {
          const added = list.filter(m => m.messageType !== 'system' && m.memberId !== memberId).length;
          if (added > 0) {
            unreadRef.current += added;
            onUnread?.(unreadRef.current);
          }
        }
      } catch {
        /* ignore */
      }
    };
    pull();
    const id = window.setInterval(pull, 1200);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [regionCode, memberId, active, onUnread]);

  useEffect(() => {
    if (!active) return;
    unreadRef.current = 0;
    onUnread?.(0);
  }, [active, onUnread]);

  useEffect(() => {
    if (!stickBottomRef.current || !logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, active]);

  const send = async (text: string, type: 'chat' | 'whisper' = whisperTarget ? 'whisper' : 'chat') => {
    const message = text.trim();
    if (!message || sending) return;
    const cid = clientMsgId();
    const optimistic: HihiChatMessage = {
      messageNo: -Date.now(),
      regionCode,
      messageType: type,
      memberId,
      nickname,
      targetMemberId: type === 'whisper' ? whisperTarget?.memberId : null,
      targetNickname: type === 'whisper' ? whisperTarget?.nickname : null,
      clientMsgId: cid,
      message,
      mine: true,
      pending: true,
      createDt: new Date().toISOString(),
    };
    setMessages(prev => mergeMessages(prev, [optimistic]));
    setInput('');
    setSending(true);
    setError('');
    stickBottomRef.current = true;
    try {
      const saved = await hihiApi.chatSend({
        memberId,
        regionCode,
        message,
        nickname,
        messageType: type,
        targetMemberId: type === 'whisper' ? whisperTarget?.memberId : undefined,
        clientMsgId: cid,
      });
      lastIdRef.current = Math.max(lastIdRef.current, saved.messageNo);
      setMessages(prev => mergeMessages(prev, [saved]));
    } catch (e) {
      setMessages(prev =>
        prev.map(m => (m.clientMsgId === cid ? {...m, pending: false, failed: true} : m))
      );
      setError(e instanceof Error ? e.message : '전송 실패');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="hihi-chat">
      {whisperTarget && (
        <div className="hihi-chat__whisper-bar">
          <span>
            귓속말 → <b>{whisperTarget.nickname}</b>
          </span>
          <button type="button" onClick={onClearWhisper}>
            전체채팅
          </button>
        </div>
      )}
      <div
        className="hihi__chat-log"
        ref={logRef}
        onScroll={() => {
          const el = logRef.current;
          if (!el) return;
          stickBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
      >
        {messages.length === 0 && (
          <div className="hihi-chat__empty">
            이 방의 채팅은 입장 후에만 보여요.
            <br />
            나가면 대화는 사라집니다.
          </div>
        )}
        {messages.map(m => {
          const kind = m.messageType || 'chat';
          const isSystem = kind === 'system' || kind === 'emote';
          const cls = [
            'hihi-chat__bubble',
            isSystem ? 'is-system' : m.mine ? 'is-mine' : 'is-other',
            kind === 'whisper' ? 'is-whisper' : '',
            m.pending ? 'is-pending' : '',
            m.failed ? 'is-failed' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <div key={m.clientMsgId || m.messageNo} className={cls}>
              {!isSystem && (
                <div className="hihi-chat__meta">
                  <b>
                    {kind === 'whisper'
                      ? m.mine
                        ? `나 → ${m.targetNickname || '상대'}`
                        : `${m.nickname} → 나`
                      : m.nickname}
                  </b>
                  <span>{formatTime(m.createDt)}</span>
                </div>
              )}
              <div className="hihi-chat__text">{m.message}</div>
            </div>
          );
        })}
      </div>
      <form
        className="hihi__chat-form"
        onSubmit={e => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          maxLength={200}
          placeholder={whisperTarget ? `${whisperTarget.nickname}에게 귓속말…` : '메시지를 입력하세요'}
          disabled={sending}
        />
        <button className="hihi__chat-send" type="submit" disabled={sending || !input.trim()}>
          전송
        </button>
      </form>
      {error && <div className="hihi__error">{error}</div>}
    </div>
  );
}
