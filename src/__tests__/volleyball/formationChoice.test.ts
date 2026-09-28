import { describe, it, expect } from 'vitest';
import { resolveFormation } from '@/lib/volleyball/formationChoice';
import { getTemplateById } from '@/lib/volleyball/templateFormations';
import type { UserFormation } from '@/lib/volleyball/types';

const saved = (id: string, name: string): UserFormation => ({
  id,
  ownerUserId: 'coach',
  name,
  description: 'Our Tuesday serve receive',
  tags: [],
  visibility: 'private',
  data: getTemplateById('standard-5-1')!.data,
  createdAt: 1,
  updatedAt: 1,
});

describe('resolveFormation', () => {
  it('a template loads its own positions onto the court', () => {
    const chosen = resolveFormation('neutral', []);

    expect(chosen?.source).toBe('template');
    if (chosen?.source !== 'template') return;
    expect(chosen.name).toBe('Neutral / Empty');
    // The neutral template stands everyone on their zone, so in rotation 1
    // the setter receives serve from zone 1 (right back).
    expect(chosen.data.receiving[1].roleSpots.S).toEqual({ x: 0.83, y: 0.25 });
  });

  it("a saved formation loads the account's own copy", () => {
    const tuesday = saved('formation-1', 'Tuesday W');
    const chosen = resolveFormation('formation-1', [saved('formation-0', 'Other'), tuesday]);

    expect(chosen).toEqual({
      source: 'custom',
      name: 'Tuesday W',
      description: 'Our Tuesday serve receive',
      data: tuesday.data,
    });
  });

  it('a built-in formation is drawn from the built-in chart', () => {
    expect(resolveFormation('stack', [])).toEqual({ source: 'builtin', type: 'stack' });
  });

  it('a saved formation that has not loaded yet resolves to nothing', () => {
    expect(resolveFormation('formation-1', [])).toBeNull();
  });
});
