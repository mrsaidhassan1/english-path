// Phase 3: the Staff tab's helpers.
import { describe, expect, it } from 'vitest';
import { welcomeMessage } from '../pages/Staff';
import { makeCode } from '../lib/classes';

describe('Staff tab', () => {
  it('writes a welcome message with the sign-in steps', () => {
    const m = welcomeMessage('teacher@example.com', 'AbCd-EfGh-JkMn', ['FND 41']);
    expect(m).toMatch(/I'm the teacher/);
    expect(m).toContain('teacher@example.com');
    expect(m).toContain('AbCd-EfGh-JkMn');
    expect(m).toMatch(/Change my password/);
    expect(m).toContain('Your class: FND 41.');
  });

  it('suggests a join code from the class name', () => {
    expect(makeCode('FND 41')).toMatch(/^FND41-[A-Z0-9]{3}$/);
  });
});
