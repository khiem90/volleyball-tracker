import { describe, it, expect } from 'vitest';
import {
  OVERLAP_CONSTRAINTS,
  getOverlapConstraints,
  getConstraintsByType,
  getRelatedZones,
  ADJACENCY_PAIRS,
  getAdjacencyPairs,
} from '@/lib/volleyball/overlap';

describe('Overlap Validation', () => {
  describe('OVERLAP_CONSTRAINTS', () => {
    it('should have 7 total constraints', () => {
      expect(OVERLAP_CONSTRAINTS).toHaveLength(7);
    });

    it('should have 3 front-back constraints', () => {
      const frontBackConstraints = OVERLAP_CONSTRAINTS.filter(
        (c) => c.type === 'front-back'
      );
      expect(frontBackConstraints).toHaveLength(3);
    });

    it('should have 4 left-right constraints', () => {
      const leftRightConstraints = OVERLAP_CONSTRAINTS.filter(
        (c) => c.type === 'left-right'
      );
      expect(leftRightConstraints).toHaveLength(4);
    });

    it('should have front-back constraint for zones 2-1', () => {
      const constraint = OVERLAP_CONSTRAINTS.find(
        (c) => c.type === 'front-back' && c.zone1 === 2 && c.zone2 === 1
      );
      expect(constraint).toBeDefined();
      expect(constraint?.description).toContain('Zone 1 must be behind Zone 2');
    });

    it('should have front-back constraint for zones 3-6', () => {
      const constraint = OVERLAP_CONSTRAINTS.find(
        (c) => c.type === 'front-back' && c.zone1 === 3 && c.zone2 === 6
      );
      expect(constraint).toBeDefined();
    });

    it('should have front-back constraint for zones 4-5', () => {
      const constraint = OVERLAP_CONSTRAINTS.find(
        (c) => c.type === 'front-back' && c.zone1 === 4 && c.zone2 === 5
      );
      expect(constraint).toBeDefined();
    });
  });

  describe('getOverlapConstraints', () => {
    it('should return all constraints', () => {
      const constraints = getOverlapConstraints();
      expect(constraints).toEqual(OVERLAP_CONSTRAINTS);
    });
  });

  describe('getConstraintsByType', () => {
    it('should filter by front-back type', () => {
      const constraints = getConstraintsByType('front-back');
      expect(constraints.every((c) => c.type === 'front-back')).toBe(true);
      expect(constraints).toHaveLength(3);
    });

    it('should filter by left-right type', () => {
      const constraints = getConstraintsByType('left-right');
      expect(constraints.every((c) => c.type === 'left-right')).toBe(true);
      expect(constraints).toHaveLength(4);
    });
  });

  describe('getRelatedZones', () => {
    it('should return zones related to zone 1', () => {
      const related = getRelatedZones(1);
      expect(related).toContain(2); // front-back with zone 2
      expect(related).toContain(6); // left-right with zone 6
    });

    it('should return zones related to zone 3', () => {
      const related = getRelatedZones(3);
      expect(related).toContain(6); // front-back with zone 6
      expect(related).toContain(2); // left-right with zone 2
      expect(related).toContain(4); // left-right with zone 4
    });

    it('should return zones related to zone 6', () => {
      const related = getRelatedZones(6);
      expect(related).toContain(3); // front-back with zone 3
      expect(related).toContain(1); // left-right with zone 1
      expect(related).toContain(5); // left-right with zone 5
    });
  });

  describe('ADJACENCY_PAIRS', () => {
    it('should have 7 adjacency pairs', () => {
      expect(ADJACENCY_PAIRS).toHaveLength(7);
    });

    it('should include front row horizontal pairs', () => {
      expect(ADJACENCY_PAIRS).toContainEqual([4, 3]);
      expect(ADJACENCY_PAIRS).toContainEqual([3, 2]);
    });

    it('should include back row horizontal pairs', () => {
      expect(ADJACENCY_PAIRS).toContainEqual([5, 6]);
      expect(ADJACENCY_PAIRS).toContainEqual([6, 1]);
    });

    it('should include front-back vertical pairs', () => {
      expect(ADJACENCY_PAIRS).toContainEqual([4, 5]);
      expect(ADJACENCY_PAIRS).toContainEqual([3, 6]);
      expect(ADJACENCY_PAIRS).toContainEqual([2, 1]);
    });
  });

  describe('getAdjacencyPairs', () => {
    it('should return all adjacency pairs', () => {
      const pairs = getAdjacencyPairs();
      expect(pairs).toEqual(ADJACENCY_PAIRS);
    });
  });
});
