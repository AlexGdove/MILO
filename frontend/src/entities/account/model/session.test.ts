import { beforeEach, describe, expect, it } from 'vitest';

import { selectAccount, selectToken, SESSION_STORAGE_KEY, useSessionStore } from './session';
import type { Account } from './types';

const TOKEN = `ms_${'A'.repeat(43)}`;
const ACCOUNT: Account = { id: 'a1', email: 'anna@example.com', plan: 'free', planUntil: null };

const state = () => useSessionStore.getState();

describe('Сессия аккаунта', () => {
  beforeEach(() => {
    localStorage.clear();
    useSessionStore.setState({ token: null, account: null });
  });

  it('по умолчанию токена и аккаунта нет', () => {
    expect(selectToken(state())).toBeNull();
    expect(selectAccount(state())).toBeNull();
  });

  it('signIn сохраняет токен и аккаунт', () => {
    state().signIn({ token: TOKEN, account: ACCOUNT });

    expect(selectToken(state())).toBe(TOKEN);
    expect(selectAccount(state())).toEqual(ACCOUNT);
    const stored = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? 'null') as {
      state: { token: string };
    };
    expect(stored.state.token).toBe(TOKEN);
  });

  it('setAccount меняет аккаунт, токен остаётся', () => {
    state().signIn({ token: TOKEN, account: ACCOUNT });
    const updated: Account = { ...ACCOUNT, plan: 'plus', planUntil: '2026-12-01T00:00:00.000Z' };

    state().setAccount(updated);

    expect(selectToken(state())).toBe(TOKEN);
    expect(selectAccount(state())).toEqual(updated);
  });

  it('signOut очищает оба поля', () => {
    state().signIn({ token: TOKEN, account: ACCOUNT });
    state().signOut();

    expect(selectToken(state())).toBeNull();
    expect(selectAccount(state())).toBeNull();
  });

  it('восстанавливается из хранилища (version 1)', async () => {
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ state: { token: TOKEN, account: ACCOUNT }, version: 1 }),
    );
    await useSessionStore.persist.rehydrate();

    expect(selectToken(state())).toBe(TOKEN);
    expect(selectAccount(state())).toEqual(ACCOUNT);
  });

  it('migrate (version 0): валидные данные сохраняются', async () => {
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ state: { token: TOKEN, account: ACCOUNT }, version: 0 }),
    );
    await useSessionStore.persist.rehydrate();

    expect(selectToken(state())).toBe(TOKEN);
    expect(selectAccount(state())).toEqual(ACCOUNT);
  });

  it.each([
    ['токен "abc"', { token: 'abc', account: ACCOUNT }],
    ['ключ устройства вместо токена', { token: `mk_${'A'.repeat(43)}`, account: ACCOUNT }],
    ['аккаунт без почты', { token: TOKEN, account: { id: 'a1', plan: 'free', planUntil: null } }],
    ['тариф gold', { token: TOKEN, account: { ...ACCOUNT, plan: 'gold' } }],
    ['аккаунта нет', { token: TOKEN, account: null }],
    ['состояния нет', null],
  ])('migrate (version 0): %s → как будто не входили', async (_name, data) => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ state: data, version: 0 }));
    await useSessionStore.persist.rehydrate();

    expect(selectToken(state())).toBeNull();
    expect(selectAccount(state())).toBeNull();
  });
});
