import { describe, it, expect } from 'vitest';
import { HardwareParser } from '../../src/parsers/hardware-parser.js';
import type { DockerService } from '../../src/types/index.js';

describe('HardwareParser', () => {
  const parser = new HardwareParser();

  it('should return empty array for services without devices', () => {
    const services: DockerService[] = [
      {
        name: 'app',
        ports: ['3000:3000'],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {},
      },
    ];

    const result = parser.parseFromServices(services);
    expect(result).toEqual([]);
  });

  it('should parse serial devices with ttyUSB', () => {
    const services: DockerService[] = [
      {
        name: 'iot-service',
        ports: ['8080:8080'],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {},
        devices: ['/dev/ttyUSB0:/dev/ttyUSB0'],
      },
    ];

    const result = parser.parseFromServices(services);
    expect(result.length).toBe(1);
    expect(result[0].type).toBe('serial');
    expect(result[0].path).toBe('/dev/ttyUSB0');
    expect(result[0].connectedService).toBe('iot-service');
  });

  it('should parse serial devices with ttyACM', () => {
    const services: DockerService[] = [
      {
        name: 'arduino-service',
        ports: ['8080:8080'],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {},
        devices: ['/dev/ttyACM0:/dev/ttyACM0'],
      },
    ];

    const result = parser.parseFromServices(services);
    expect(result.length).toBe(1);
    expect(result[0].type).toBe('serial');
  });

  it('should parse GPIO devices', () => {
    const services: DockerService[] = [
      {
        name: 'gpio-service',
        ports: ['8080:8080'],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {},
        devices: ['/dev/gpio1:/dev/gpio1'],
      },
    ];

    const result = parser.parseFromServices(services);
    expect(result.length).toBe(1);
    expect(result[0].type).toBe('gpio');
  });

  it('should parse COM port devices', () => {
    const services: DockerService[] = [
      {
        name: 'windows-service',
        ports: ['8080:8080'],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {},
        devices: ['COM3:/dev/ttyUSB0'],
      },
    ];

    const result = parser.parseFromServices(services);
    expect(result.length).toBe(1);
    expect(result[0].type).toBe('serial');
    expect(result[0].path).toBe('COM3');
  });

  it('should parse multiple devices from one service', () => {
    const services: DockerService[] = [
      {
        name: 'multi-device-service',
        ports: ['8080:8080'],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {},
        devices: [
          '/dev/ttyUSB0:/dev/ttyUSB0',
          '/dev/ttyACM0:/dev/ttyACM0',
        ],
      },
    ];

    const result = parser.parseFromServices(services);
    expect(result.length).toBe(2);
  });

  it('should convert to graph nodes', () => {
    const services: DockerService[] = [
      {
        name: 'iot-service',
        ports: ['8080:8080'],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {},
        devices: ['/dev/ttyUSB0:/dev/ttyUSB0'],
      },
    ];

    const devices = parser.parseFromServices(services);
    const nodes = parser.toGraphNodes(devices);
    
    expect(nodes.length).toBe(1);
    expect(nodes[0].type).toBe('hardware');
    expect(nodes[0].metadata).toHaveProperty('deviceType', 'serial');
  });

  it('should convert to graph edges', () => {
    const services: DockerService[] = [
      {
        name: 'iot-service',
        ports: ['8080:8080'],
        volumes: [],
        dependsOn: [],
        networks: [],
        environment: {},
        devices: ['/dev/ttyUSB0:/dev/ttyUSB0'],
      },
    ];

    const devices = parser.parseFromServices(services);
    const edges = parser.toGraphEdges(devices);
    
    expect(edges.length).toBe(1);
    expect(edges[0].type).toBe('connects');
    expect(edges[0].target).toBe('iot-service');
  });
});
