import sh from 'shell-exec';
import readline from 'readline';

class PortClient {
  ports: string | number | number[];
  method: string;
  action: string;
  interactive: boolean;
  dryRun: boolean;
  verbose: boolean;
  graceful: boolean;
  filter: string | null;
  range: string | null;
  speed: string;
  platform: string;

  constructor(
    ports: string | number | number[], 
    {
      method = 'tcp',
      action = 'check',
      interactive = false,
      dryRun = false,
      verbose = false,
      graceful = false,
      filter = null,
      range = null,
      speed = 'safe',
    }: {
      method?: string;
      action?: string;
      interactive?: boolean;
      dryRun?: boolean;
      verbose?: boolean;
      graceful?: boolean;
      filter?: string | null;
      range?: string | null;
      speed?: string;
    } = {}
  ) {
    this.ports = ports;
    this.method = method;
    this.action = action;
    this.interactive = interactive;
    this.dryRun = dryRun;
    this.verbose = verbose;
    this.graceful = graceful;
    this.filter = filter;
    this.range = range;
    this.speed = speed;
    this.platform = process.platform;
  }

  log(message: string): void {
    if (this.verbose) {
      console.log(message);
    }
  }

  parsePorts(): number[] {
    if (Array.isArray(this.ports)) {
      return this.ports.map(Number).filter(Boolean);
    } else if (this.range) {
      const [start, end] = this.range.split('-').map(Number);
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    } else {
      const port = Number(this.ports);
      return port ? [port] : [];
    }
  }

  async execute(): Promise<void> {
    const parsedPorts = this.parsePorts();
    if (parsedPorts.length === 0) {
      throw new Error('Invalid or no port(s) provided.');
    }

    if (this.dryRun) {
      this.success(`Dry run: Ports to operate on - ${parsedPorts.join(', ')}`);
      return;
    }

    if (this.interactive) {
      const activePorts = await this.listActivePorts();
      const selectedPorts = await this.promptUserToSelectPorts(activePorts);
      return this.handlePorts(selectedPorts.map(Number)); // Ensure it's a number[]
    }

    return this.handlePorts(parsedPorts);
  }

  async handlePorts(ports: number[]) {
    switch (this.action) {
      case 'check':
      case 'isExist':
        return this.showPortInfo(ports);

      case 'kill':
        return this.killPorts(ports);

      default:
        throw new Error(`Unknown action: ${this.action}`);
    }
  }

  async listActivePorts(): Promise<string[]> {
    const command = this.platform === 'win32'
      ? 'netstat -nao'
      : (this.speed === 'fast'
        ? `lsof -i :${this.ports}`
        : 'lsof -i -P -n');

    try {
      const { stdout } = await sh(command);
      const lines = stdout.split('\n');
      return this.platform === 'win32' ? this.parseWindowsPorts(lines) : this.parseUnixPorts(lines);
    } catch (error: any) {
      throw new Error(`Failed to list active ports: ${(error as Error).message}`);
    }
  }

  parseWindowsPorts(lines: string[]): string[] {
    const regex = new RegExp(`^ *${this.method.toUpperCase()} *[^ ]*:(\\d+),`, 'gm');
    return lines.reduce((acc: string[], line: string) => {
      const match = line.match(regex);
      if (match && match[1] && !acc.includes(match[1])) {
        acc.push(match[1]);
      }
      return acc;
    }, []);
  }

  parseUnixPorts(lines: string[]): string[] {
    const regex = /(?<=:\d{1,5})->|\b\d{1,5}(?=->|\s+\(CLOSED\)|\s+\(ESTABLISHED\)|\s+\(LISTEN\))/g;
    return lines.flatMap((line: string) => line.match(regex) || []).filter(Boolean);
  }

  async promptUserToSelectPorts(activePorts: string[]): Promise<number[]> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

      activePorts.forEach((port, index) => {
        this.success(`${index + 1}. ${port}`);
      });

      rl.question('Select ports to operate on (comma-separated indices): ', (answer) => {
        const indices = answer.split(',').map(Number);
        const selectedPorts = indices.map((index) => activePorts[index - 1]).filter(Boolean);
        rl.close();
        resolve(selectedPorts.map(Number)); // Ensure it's a number[]
      });
    });
  }

  success(message: string): void {
    console.log('\x1b[32m%s\x1b[0m', `${message}`);
  }

  error(message: string): void {
    console.log('\x1b[31m%s\x1b[0m', `${message}`);
  }

  async showPortInfo(ports: number[]): Promise<void> {
    for (const port of ports) {
      try {
        const isActive = await this.checkPortStatus(port);
        this.success(isActive ? `Port ${port} is active.` : `Port ${port} is not active.`);
      } catch (error: any) {
        this.error(`Error checking port ${port}: ${(error as Error).message}`);
      }
    }
  }

  async isExistFast(port: number): Promise<boolean> {
    // Fast method: using lsof (this is an example, you can replace with your own fast method)
    try {
      const { stdout } = await sh(`lsof -i tcp:${port}`);
      return stdout.trim().length > 0;
    } catch (error: any) {
      return false;
    }
  }

  async checkPortStatus(port: number): Promise<boolean> {
    const checkMethod = this.speed === 'fast' ? this.isExistFast : this.isExistNormal;
    return await checkMethod.call(this, port);
  }

  async killPorts(ports: number[]): Promise<void> {
    for (const port of ports) {
      try {
        const command = this.platform === 'win32'
          ? await this.getWindowsKillCommand(port)
          : await this.getUnixKillCommand(port, this.method, this.graceful);

        this.log(`Executing: ${command}`);
        const result = await sh(command);
        this.success(`Successfully killed port ${port} ${result.stdout}`);
      } catch (error: any) {
        this.error(`Failed to kill port ${port}: ${(error as Error).message}`);
      }
    }
  }

  async getWindowsKillCommand(port: number): Promise<string> {
    try {
      const { stdout } = await sh('netstat -nao');
      const lines = stdout.split('\n');
      const regex = new RegExp(`^ *${this.method.toUpperCase()} *[^ ]*:${port},`, 'gm');
      const linesWithPort = lines.filter((line: string) => regex.test(line));

      const pids = linesWithPort.reduce((acc: string[], line: string) => {
        const pidMatch = line.match(/(\d+)\w*/);
        if (pidMatch) acc.push(pidMatch[1]);
        return acc;
      }, []);

      return `TaskKill /F /PID ${pids.join(' /PID ')}`;
    } catch (error: any) {
      throw new Error(`Failed to get Windows kill command: ${(error as Error).message}`);
    }
  }

  async getUnixKillCommand(port: number, method: string = 'tcp', graceful: boolean = false): Promise<string> {
    const baseCommand = this.buildBaseCommand(method, port);
    const killCommand = graceful ? 'kill' : 'kill -9';

    try {
      const processExists = await this.checkIfProcessExists(port);

      if (!processExists) {
        throw new Error('No process running on port');
      }

      return `${baseCommand} ${killCommand}`;
    } catch (error: any) {
      throw new Error(`${(error as Error).message}`);
    }
  }

  async isExistNormal(port: number): Promise<boolean> {
    // Normal method: using netstat (this is an example, you can replace with your own normal method)
    try {
      const { stdout } = await sh(`netstat -na | grep :${port}`);
      return stdout.trim().length > 0;
    } catch (error: any) {
      return false;
    }
  }

  buildBaseCommand(method: string, port: number): string {
    return `lsof -t -i ${method}:${port}`;
  }

  async checkIfProcessExists(port: number): Promise<boolean> {
    try {
      const { stdout } = await sh(`lsof -t -i tcp:${port}`);
      return stdout.trim().length > 0;
    } catch (error: any) {
      throw new Error(`Failed to check if process exists on port ${port}`);
    }
  }
}

// Step 2: Wrap the invocation logic in an exported function
async function runPortClient (ports: number | number[], options = {}) {
    const portClient = new PortClient(ports, options);
    return portClient.execute();
}

module.exports = runPortClient;
