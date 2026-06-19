import type { DockerService } from '../types/index.js';
import type { DependencyNode, DependencyEdge } from '../types/index.js';

export interface HardwareDevice {
  id: string;
  name: string;
  type: 'serial' | 'usb' | 'gpio';
  path: string;
  connectedService: string;
}

const SERIAL_PATTERNS = [
  /^\/dev\/ttyUSB/i,
  /^\/dev\/ttyACM/i,
  /^\/dev\/ttyS/i,
  /^\/dev\/serial/i,
  /^COM\d+$/i,
];

const USB_PATTERNS = [
  /^\d{4}:\d{4}$/,
  /^\/dev\/bus\/usb/,
];

export class HardwareParser {
  parseFromServices(services: DockerService[]): HardwareDevice[] {
    const devices: HardwareDevice[] = [];

    for (const service of services) {
      if (!service.devices || service.devices.length === 0) continue;

      for (const deviceStr of service.devices) {
        const device = this.parseDeviceString(deviceStr, service.name);
        if (device) {
          devices.push(device);
        }
      }
    }

    return devices;
  }

  private parseDeviceString(deviceStr: string, serviceName: string): HardwareDevice | null {
    const [hostPath] = deviceStr.split(':');
    if (!hostPath) return null;

    const trimmedPath = hostPath.trim();
    const type = this.detectDeviceType(trimmedPath);

    return {
      id: `hw-${serviceName}-${trimmedPath.replace(/[^a-zA-Z0-9]/g, '-')}`,
      name: trimmedPath.split('/').pop() || trimmedPath,
      type,
      path: trimmedPath,
      connectedService: serviceName,
    };
  }

  private detectDeviceType(path: string): 'serial' | 'usb' | 'gpio' {
    for (const pattern of SERIAL_PATTERNS) {
      if (pattern.test(path)) return 'serial';
    }
    for (const pattern of USB_PATTERNS) {
      if (pattern.test(path)) return 'usb';
    }
    if (path.includes('gpio') || path.includes('GPIO')) return 'gpio';
    return 'serial';
  }

  toGraphNodes(devices: HardwareDevice[]): DependencyNode[] {
    return devices.map(device => ({
      id: device.id,
      type: 'hardware' as const,
      name: device.name,
      metadata: {
        deviceType: device.type,
        path: device.path,
        connectedService: device.connectedService,
      },
    }));
  }

  toGraphEdges(devices: HardwareDevice[]): DependencyEdge[] {
    return devices.map(device => ({
      source: device.id,
      target: device.connectedService,
      type: 'connects' as const,
    }));
  }
}
