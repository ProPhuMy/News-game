import { content as nameFilterContent } from '../../src/content/index.ts';
import { createWordFilter } from '../../src/ai/text.ts';
import { describe, expect, it } from 'vitest';
import { clientAddress } from '../../src/server/proxy.ts';
import { createRoomManager } from '../../src/server/rooms.ts';
import { COLORS } from '../../src/shared/ids.ts';

describe('trusted Render proxy address', () => {
  it('uses a single client address only from the configured proxy peer', () => {
    const headers = { 'x-real-ip': '192.0.2.1', 'cf-connecting-ip': '192.0.2.99' };
    expect(clientAddress('::ffff:172.17.0.1', headers, false, '172.17.0.1')).toBe('192.0.2.1');
    expect(clientAddress('172.17.0.2', headers, false, '172.17.0.1')).toBe('172.17.0.2');
    expect(clientAddress('172.17.0.1', headers)).toBe('172.17.0.1');
    expect(clientAddress('172.17.0.1', { 'x-real-ip': '2001:db8::1' }, false, '172.17.0.1')).toBe('2001:db8::1');
  });

  it.each(['not-an-ip', '192.0.2.1, 192.0.2.2', ['192.0.2.1', '192.0.2.2'], undefined])(
    'ignores invalid or ambiguous local-proxy headers: %j', value => {
      expect(clientAddress('172.17.0.1', { 'x-real-ip': value }, false, '172.17.0.1')).toBe('172.17.0.1');
    });
  it('ignores spoofed forwarding headers on direct hosts', () => {
    expect(clientAddress('127.0.0.1', { 'x-forwarded-for': '1.2.3.4', 'cf-connecting-ip': '5.6.7.8' }, false)).toBe('127.0.0.1');
  });
  it('separates client budgets using the Render edge header only in trusted mode', () => {
    const rooms = createRoomManager(createWordFilter(nameFilterContent.wordList));
    const profile = { displayName: 'Editor', paperName: 'Daily', color: COLORS[0] };
    for (let i = 1; i <= 11; i++) {
      const ip = clientAddress('127.0.0.1', { 'cf-connecting-ip': `192.0.2.${i}`, 'x-forwarded-for': 'spoofed' }, true);
      expect(() => rooms.create(profile, String(i), ip, 0)).not.toThrow();
    }
    expect(rooms.rooms.size).toBe(11);
    expect(clientAddress('proxy', { 'cf-connecting-ip': '192.0.2.1, 192.0.2.2' }, true)).toBe('proxy');
    expect(clientAddress('proxy', { 'cf-connecting-ip': ['192.0.2.1', '192.0.2.2'] }, true)).toBe('proxy');
  });
});
