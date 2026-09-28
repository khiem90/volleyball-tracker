import { describe, it, expect } from 'vitest';
import {
  formationDesignerHref,
  formationIdIn,
  formationShareLink,
} from '@/lib/volleyball/formationLinks';
import { getTemplateById } from '@/lib/volleyball/templateFormations';
import type { UserFormation } from '@/lib/volleyball/types';

const formation = (sharing: Pick<UserFormation, 'visibility' | 'shareId'>): UserFormation => ({
  id: 'formation-1',
  ownerUserId: 'coach',
  name: 'Tuesday W',
  tags: [],
  data: getTemplateById('neutral')!.data,
  createdAt: 1,
  updatedAt: 1,
  ...sharing,
});

describe('formationShareLink', () => {
  it("a shared formation's link is its shared page", () => {
    expect(
      formationShareLink('https://tt.example', formation({ visibility: 'unlisted', shareId: 'Xy7_ab' }))
    ).toBe('https://tt.example/tools/volleyball-rotations/shared/Xy7_ab');
  });

  it('a formation made private has no link', () => {
    expect(
      formationShareLink('https://tt.example', formation({ visibility: 'private', shareId: null }))
    ).toBeNull();
  });

  it('a formation that was never shared has no link', () => {
    expect(formationShareLink('https://tt.example', formation({ visibility: 'private' }))).toBeNull();
  });
});

describe('opening a formation in the designer', () => {
  it('the designer link carries the formation', () => {
    expect(formationDesignerHref('formation-1')).toBe(
      '/tools/volleyball-rotations?formation=formation-1'
    );
  });

  it("the designer reads the formation from its page's query", () => {
    expect(formationIdIn(new URLSearchParams('formation=formation-1'))).toBe('formation-1');
    expect(formationIdIn(new URLSearchParams(''))).toBeNull();
    expect(formationIdIn(new URLSearchParams('formation='))).toBeNull();
  });
});
