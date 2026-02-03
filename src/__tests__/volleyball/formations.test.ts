import { describe, it, expect } from 'vitest';
import {
  FORMATIONS,
  getFormations,
  getFormation,
  getFormationOptions,
} from '@/lib/volleyball/formations';
import { SERVE_RECEIVE_ADJUSTMENTS } from '@/lib/volleyball/rotations';
import type { FormationType, RotationNumber } from '@/lib/volleyball/types';

describe('Formations', () => {
  describe('FORMATIONS', () => {
    it('should have 5 formations defined', () => {
      expect(Object.keys(FORMATIONS)).toHaveLength(5);
    });

    it('should have traditional formation', () => {
      expect(FORMATIONS.traditional).toBeDefined();
      expect(FORMATIONS.traditional.id).toBe('traditional');
      expect(FORMATIONS.traditional.name).toBe('Traditional');
    });

    it('should have stack formation', () => {
      expect(FORMATIONS.stack).toBeDefined();
      expect(FORMATIONS.stack.id).toBe('stack');
      expect(FORMATIONS.stack.name).toBe('Stack');
    });

    it('should have spread formation', () => {
      expect(FORMATIONS.spread).toBeDefined();
      expect(FORMATIONS.spread.id).toBe('spread');
      expect(FORMATIONS.spread.name).toBe('Spread');
    });

    it('should have rightSlant formation', () => {
      expect(FORMATIONS.rightSlant).toBeDefined();
      expect(FORMATIONS.rightSlant.id).toBe('rightSlant');
      expect(FORMATIONS.rightSlant.name).toBe('Right Slant');
    });

    it('should have leftSlant formation', () => {
      expect(FORMATIONS.leftSlant).toBeDefined();
      expect(FORMATIONS.leftSlant.id).toBe('leftSlant');
      expect(FORMATIONS.leftSlant.name).toBe('Left Slant');
    });

    it('should have description and tradeoffs for each formation', () => {
      Object.values(FORMATIONS).forEach((formation) => {
        expect(formation.description).toBeTruthy();
        expect(formation.tradeoffs).toBeTruthy();
      });
    });
  });

  describe('getFormations', () => {
    it('should return array of all formations', () => {
      const formations = getFormations();
      expect(formations).toHaveLength(5);
      expect(formations.map((f) => f.id)).toContain('traditional');
      expect(formations.map((f) => f.id)).toContain('stack');
      expect(formations.map((f) => f.id)).toContain('spread');
      expect(formations.map((f) => f.id)).toContain('rightSlant');
      expect(formations.map((f) => f.id)).toContain('leftSlant');
    });
  });

  describe('getFormation', () => {
    it('should return correct formation by id', () => {
      expect(getFormation('traditional').name).toBe('Traditional');
      expect(getFormation('stack').name).toBe('Stack');
      expect(getFormation('spread').name).toBe('Spread');
      expect(getFormation('rightSlant').name).toBe('Right Slant');
      expect(getFormation('leftSlant').name).toBe('Left Slant');
    });
  });

  describe('getFormationOptions', () => {
    it('should return options with value and label', () => {
      const options = getFormationOptions();

      options.forEach((option) => {
        expect(option.value).toBeTruthy();
        expect(option.label).toBeTruthy();
      });
    });

    it('should have 5 options', () => {
      const options = getFormationOptions();
      expect(options).toHaveLength(5);
    });
  });

  describe('SERVE_RECEIVE_ADJUSTMENTS', () => {
    const formations: FormationType[] = ['traditional', 'stack', 'spread', 'rightSlant', 'leftSlant'];
    const rotations: RotationNumber[] = [1, 2, 3, 4, 5, 6];

    it('should have adjustments for all formations', () => {
      formations.forEach((formation) => {
        expect(SERVE_RECEIVE_ADJUSTMENTS[formation]).toBeDefined();
      });
    });

    it('should have adjustments for all rotations in each formation', () => {
      formations.forEach((formation) => {
        rotations.forEach((rotation) => {
          expect(SERVE_RECEIVE_ADJUSTMENTS[formation][rotation]).toBeDefined();
        });
      });
    });

    it('should have valid coordinates for all adjustments', () => {
      formations.forEach((formation) => {
        rotations.forEach((rotation) => {
          const adjustments = SERVE_RECEIVE_ADJUSTMENTS[formation][rotation];

          Object.values(adjustments).forEach((pos) => {
            if (pos) {
              expect(pos.x).toBeGreaterThanOrEqual(0);
              expect(pos.x).toBeLessThanOrEqual(1);
              expect(pos.y).toBeGreaterThanOrEqual(0);
              expect(pos.y).toBeLessThanOrEqual(1);
            }
          });
        });
      });
    });

    it('should have adjustments for all 6 roles in each rotation', () => {
      const roles = ['S', 'OPP', 'OH1', 'OH2', 'MB1', 'MB2'];

      formations.forEach((formation) => {
        rotations.forEach((rotation) => {
          const adjustments = SERVE_RECEIVE_ADJUSTMENTS[formation][rotation];
          const adjustedRoles = Object.keys(adjustments);

          roles.forEach((role) => {
            expect(adjustedRoles).toContain(role);
          });
        });
      });
    });
  });
});
