import { describe, it, expect } from 'vitest';
import {
  ROTATION_CHART,
  buildPlayerPositions,
  getRoleZone,
  isSetterFrontRow,
  getFrontRowAttackerCount,
  getBackRowMiddle,
} from '@/lib/volleyball/rotations';
import type { RotationNumber, PlayerRole } from '@/lib/volleyball/types';

describe('Volleyball Rotations', () => {
  describe('ROTATION_CHART', () => {
    it('should have all 6 rotations defined', () => {
      expect(Object.keys(ROTATION_CHART)).toHaveLength(6);
    });

    it('should have all 6 zones for each rotation', () => {
      for (const rotation of Object.values(ROTATION_CHART)) {
        expect(Object.keys(rotation)).toHaveLength(6);
      }
    });

    it('should have each role appear exactly once per rotation', () => {
      const expectedRoles: PlayerRole[] = ['S', 'OPP', 'OH1', 'OH2', 'MB1', 'MB2'];

      for (let r = 1; r <= 6; r++) {
        const rotation = ROTATION_CHART[r as RotationNumber];
        const roles = Object.values(rotation);

        expectedRoles.forEach((role) => {
          expect(roles.filter((r) => r === role)).toHaveLength(1);
        });
      }
    });

    it('should have setter in zone 1 for rotation 1', () => {
      expect(ROTATION_CHART[1][1]).toBe('S');
    });
  });

  describe('getRoleZone', () => {
    it('should return correct zone for setter in each rotation (clockwise)', () => {
      // Setter moves clockwise: Z1 → Z6 → Z5 → Z4 → Z3 → Z2
      expect(getRoleZone(1, 'S')).toBe(1); // Back right (serves)
      expect(getRoleZone(2, 'S')).toBe(6); // Back middle
      expect(getRoleZone(3, 'S')).toBe(5); // Back left
      expect(getRoleZone(4, 'S')).toBe(4); // Front left
      expect(getRoleZone(5, 'S')).toBe(3); // Front middle
      expect(getRoleZone(6, 'S')).toBe(2); // Front right
    });

    it('should cycle setter through all zones clockwise across rotations', () => {
      const setterZones = ([1, 2, 3, 4, 5, 6] as RotationNumber[]).map((r) =>
        getRoleZone(r, 'S')
      );
      // Clockwise rotation: 1 → 6 → 5 → 4 → 3 → 2
      expect(setterZones).toEqual([1, 6, 5, 4, 3, 2]);
    });
  });

  describe('isSetterFrontRow', () => {
    it('should return false for rotations 1-3 (setter back row)', () => {
      expect(isSetterFrontRow(1)).toBe(false);
      expect(isSetterFrontRow(2)).toBe(false);
      expect(isSetterFrontRow(3)).toBe(false);
    });

    it('should return true for rotations 4-6 (setter front row)', () => {
      expect(isSetterFrontRow(4)).toBe(true);
      expect(isSetterFrontRow(5)).toBe(true);
      expect(isSetterFrontRow(6)).toBe(true);
    });
  });

  describe('getFrontRowAttackerCount', () => {
    it('should return 3 for back-row setter rotations (1-3)', () => {
      expect(getFrontRowAttackerCount(1)).toBe(3);
      expect(getFrontRowAttackerCount(2)).toBe(3);
      expect(getFrontRowAttackerCount(3)).toBe(3);
    });

    it('should return 2 for front-row setter rotations (4-6)', () => {
      expect(getFrontRowAttackerCount(4)).toBe(2);
      expect(getFrontRowAttackerCount(5)).toBe(2);
      expect(getFrontRowAttackerCount(6)).toBe(2);
    });
  });

  describe('getBackRowMiddle', () => {
    it('should correctly identify which middle blocker is in back row', () => {
      // R1: MB1 in Z6 (back), MB2 in Z3 (front)
      expect(getBackRowMiddle(1)).toBe('MB1');
      // R2: MB1 in Z5 (back), MB2 in Z2 (front)
      expect(getBackRowMiddle(2)).toBe('MB1');
      // R3: MB1 in Z4 (front), MB2 in Z1 (back)
      expect(getBackRowMiddle(3)).toBe('MB2');
      // R4: MB1 in Z3 (front), MB2 in Z6 (back)
      expect(getBackRowMiddle(4)).toBe('MB2');
      // R5: MB1 in Z2 (front), MB2 in Z5 (back)
      expect(getBackRowMiddle(5)).toBe('MB2');
      // R6: MB1 in Z1 (back), MB2 in Z4 (front)
      expect(getBackRowMiddle(6)).toBe('MB1');
    });
  });

  describe('buildPlayerPositions', () => {
    it('should return 6 players for any rotation', () => {
      for (let r = 1; r <= 6; r++) {
        const positions = buildPlayerPositions(r as RotationNumber, 'serving', 'traditional', false);
        expect(positions).toHaveLength(6);
      }
    });

    it('should not include libero when libero is inactive', () => {
      const positions = buildPlayerPositions(1, 'serving', 'traditional', false);
      const libero = positions.find((p) => p.role === 'L');
      expect(libero).toBeUndefined();
    });

    it('should replace back-row MB with libero when libero is active', () => {
      // R1: MB1 is in zone 6 (back row)
      const positionsR1 = buildPlayerPositions(1, 'serving', 'traditional', true);
      const liberoR1 = positionsR1.find((p) => p.role === 'L');
      expect(liberoR1).toBeDefined();
      expect(liberoR1?.zone).toBe(6); // MB1 is in zone 6 in R1

      // R3: MB2 is in zone 1 (back row)
      const positionsR3 = buildPlayerPositions(3, 'serving', 'traditional', true);
      const liberoR3 = positionsR3.find((p) => p.role === 'L');
      expect(liberoR3).toBeDefined();
      expect(liberoR3?.zone).toBe(1); // MB2 is in zone 1 in R3
    });

    it('should have all positions with valid coordinates', () => {
      const positions = buildPlayerPositions(1, 'receiving', 'traditional', true);

      positions.forEach((player) => {
        expect(player.position.x).toBeGreaterThanOrEqual(0);
        expect(player.position.x).toBeLessThanOrEqual(1);
        expect(player.position.y).toBeGreaterThanOrEqual(0);
        expect(player.position.y).toBeLessThanOrEqual(1);
      });
    });

    it('should correctly identify back row players', () => {
      const positions = buildPlayerPositions(1, 'serving', 'traditional', false);
      const backRowZones = [1, 5, 6];

      positions.forEach((player) => {
        if (backRowZones.includes(player.zone)) {
          expect(player.isBackRow).toBe(true);
        } else {
          expect(player.isBackRow).toBe(false);
        }
      });
    });
  });
});
