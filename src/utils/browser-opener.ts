import { exec } from 'node:child_process';
import { platform } from 'node:os';

export function openBrowser(url: string) {
  let cmd: string;
  
  switch (platform()) {
    case 'win32':
      cmd = `start "" "${url}"`;
      break;
    case 'darwin':
      cmd = `open "${url}"`;
      break;
    default:
      cmd = `xdg-open "${url}"`;
      break;
  }
  
  exec(cmd, (error) => {
    if (error) {
      console.log(`\n  Open manually: ${url}\n`);
    }
  });
}
