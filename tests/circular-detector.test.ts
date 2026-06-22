import { describe, it, expect } from 'vitest';
import { CircularDetector } from '../src/core/circular-detector.js';
import type { DependencyGraph } from '../src/types/index.js';

describe('CircularDetector', () => {
  it('should detect no circular dependencies in empty graph', () => {
    const graph: DependencyGraph = { nodes: [], edges: [] };
    const cycles = CircularDetector.detect(graph);
    expect(cycles).toHaveLength(0);
    expect(CircularDetector.hasCircularDependencies(graph)).toBe(false);
  });

  it('should detect no circular dependencies in linear chain', () => {
    const graph: DependencyGraph = {
      nodes: [
        { id: 'a', type: 'package', name: 'a' },
        { id: 'b', type: 'package', name: 'b' },
        { id: 'c', type: 'package', name: 'c' },
      ],
      edges: [
        { source: 'a', target: 'b', type: 'depends' },
        { source: 'b', target: 'c', type: 'depends' },
      ],
    };
    const cycles = CircularDetector.detect(graph);
    expect(cycles).toHaveLength(0);
    expect(CircularDetector.hasCircularDependencies(graph)).toBe(false);
  });

  it('should detect simple circular dependency (A -> B -> A)', () => {
    const graph: DependencyGraph = {
      nodes: [
        { id: 'a', type: 'package', name: 'a' },
        { id: 'b', type: 'package', name: 'b' },
      ],
      edges: [
        { source: 'a', target: 'b', type: 'depends' },
        { source: 'b', target: 'a', type: 'depends' },
      ],
    };
    const cycles = CircularDetector.detect(graph);
    expect(cycles.length).toBeGreaterThan(0);
    expect(CircularDetector.hasCircularDependencies(graph)).toBe(true);
    expect(CircularDetector.getAffectedPackages(graph)).toContain('a');
    expect(CircularDetector.getAffectedPackages(graph)).toContain('b');
  });

  it('should detect longer circular dependency chain (A -> B -> C -> A)', () => {
    const graph: DependencyGraph = {
      nodes: [
        { id: 'a', type: 'package', name: 'a' },
        { id: 'b', type: 'package', name: 'b' },
        { id: 'c', type: 'package', name: 'c' },
      ],
      edges: [
        { source: 'a', target: 'b', type: 'depends' },
        { source: 'b', target: 'c', type: 'depends' },
        { source: 'c', target: 'a', type: 'depends' },
      ],
    };
    const cycles = CircularDetector.detect(graph);
    expect(cycles.length).toBeGreaterThan(0);
    expect(CircularDetector.hasCircularDependencies(graph)).toBe(true);
  });

  it('should ignore non-depends edges', () => {
    const graph: DependencyGraph = {
      nodes: [
        { id: 'a', type: 'package', name: 'a' },
        { id: 'b', type: 'service', name: 'b' },
      ],
      edges: [
        { source: 'a', target: 'b', type: 'network' },
        { source: 'b', target: 'a', type: 'network' },
      ],
    };
    const cycles = CircularDetector.detect(graph);
    expect(cycles).toHaveLength(0);
    expect(CircularDetector.hasCircularDependencies(graph)).toBe(false);
  });

  it('should ignore service nodes for circular detection', () => {
    const graph: DependencyGraph = {
      nodes: [
        { id: 'a', type: 'package', name: 'a' },
        { id: 'b', type: 'service', name: 'b' },
        { id: 'c', type: 'package', name: 'c' },
      ],
      edges: [
        { source: 'a', target: 'b', type: 'depends' },
        { source: 'b', target: 'c', type: 'depends' },
        { source: 'c', target: 'a', type: 'depends' },
      ],
    };
    const cycles = CircularDetector.detect(graph);
    expect(cycles).toHaveLength(0);
  });

  it('should return correct affected packages', () => {
    const graph: DependencyGraph = {
      nodes: [
        { id: 'a', type: 'package', name: 'a' },
        { id: 'b', type: 'package', name: 'b' },
        { id: 'c', type: 'package', name: 'c' },
        { id: 'd', type: 'package', name: 'd' },
      ],
      edges: [
        { source: 'a', target: 'b', type: 'depends' },
        { source: 'b', target: 'a', type: 'depends' },
        { source: 'c', target: 'd', type: 'depends' },
      ],
    };
    const affected = CircularDetector.getAffectedPackages(graph);
    expect(affected).toContain('a');
    expect(affected).toContain('b');
    expect(affected).not.toContain('c');
    expect(affected).not.toContain('d');
  });
});
