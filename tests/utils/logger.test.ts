import { describe, it, expect } from 'vitest';
import { Logger } from '../../src/utils/logger.js';

describe('Logger', () => {
  it('should create logger instance', () => {
    const logger = new Logger('[Test] ');
    expect(logger).toBeDefined();
  });

  it('should create logger with default prefix', () => {
    const logger = new Logger();
    expect(logger).toBeDefined();
  });

  it('should have log methods', () => {
    const logger = new Logger('[Test] ');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.success).toBe('function');
  });

  it('should create child logger', () => {
    const logger = new Logger('[Test] ');
    const child = logger.child('[Child] ');
    expect(child).toBeDefined();
    expect(typeof child.info).toBe('function');
    expect(typeof child.warn).toBe('function');
    expect(typeof child.error).toBe('function');
    expect(typeof child.debug).toBe('function');
    expect(typeof child.success).toBe('function');
  });

  it('should not throw on info calls', () => {
    const logger = new Logger('[Test] ');
    expect(() => logger.info('test message')).not.toThrow();
  });

  it('should not throw on warn calls', () => {
    const logger = new Logger('[Test] ');
    expect(() => logger.warn('test warning')).not.toThrow();
  });

  it('should not throw on error calls', () => {
    const logger = new Logger('[Test] ');
    expect(() => logger.error('test error')).not.toThrow();
  });

  it('should not throw on debug calls', () => {
    const logger = new Logger('[Test] ');
    expect(() => logger.debug('test debug')).not.toThrow();
  });

  it('should not throw on success calls', () => {
    const logger = new Logger('[Test] ');
    expect(() => logger.success('test success')).not.toThrow();
  });

  it('should not throw with metadata', () => {
    const logger = new Logger('[Test] ');
    expect(() => logger.info('test', { key: 'value' })).not.toThrow();
    expect(() => logger.warn('test', { code: 404 })).not.toThrow();
    expect(() => logger.error('test', { err: new Error('fail') })).not.toThrow();
    expect(() => logger.debug('test', { detail: true })).not.toThrow();
  });

  it('should create deeply nested child loggers', () => {
    const logger = new Logger('[Root] ');
    const child1 = logger.child('[Child1] ');
    const child2 = child1.child('[Child2] ');
    expect(child2).toBeDefined();
    expect(() => child2.info('deep message')).not.toThrow();
  });

  it('should create logger with structured option', () => {
    const logger = new Logger('[Test] ', { structured: true });
    expect(logger).toBeDefined();
    expect(() => logger.info('structured test')).not.toThrow();
  });

  it('should create logger with level option', () => {
    const logger = new Logger('[Test] ', { level: 'debug' });
    expect(logger).toBeDefined();
    expect(() => logger.debug('debug test')).not.toThrow();
  });
});
