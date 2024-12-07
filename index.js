'use strict';

const sh = require('shell-exec');
const readline = require('readline')

/**
 * A class to manage port operations (kill, check, or verify existence).
 */
class PortClient {
  /**
   * Creates an instance of PortClient
   * @param {string | number | number[]} ports - Ports to be checked or killed.
   * @param {Object} options - Options for the operation.
   */
  constructor(ports, {
    method = 'tcp',
    action = 'check', // Default action is 'check'
    interactive = false,
    dryRun = false,
    verbose = false,
    graceful = false,
    filter = null,
    range = null,
    speed = 'safe', // Default speed is 'safe'
  } = {}) {
    this.ports = ports;
    this.method = method;
    this.action = action; // Action flag to decide whether to check, kill, or show existence
    this.interactive = interactive;
    this.dryRun = dryRun;
    this.verbose = verbose;
    this.graceful = graceful;
    this.filter = filter;
    this.range = range;
    this.speed = speed; // Store the speed option
    this.platform = process.platform;
  }

  /**
   * Logs messages if verbose mode is enabled.
   * @param {string} message - The message to log.
   */
  log(message) {
    if (this.verbose) {
      console.log(message);
    }
  }

  /**
   * Parses the provided ports into an array of valid ports.
   * @returns {number[]} The parsed ports.
   */
  parsePorts() {
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

  /**
   * Executes the port operation based on the action flag.
   * @returns {Promise<void>}
   */
  async execute() {
    const parsedPorts = this.parsePorts();
    if (parsedPorts.length === 0) {
      throw new Error('Invalid or no port(s) provided.');
    }

    if (this.dryRun) {
      console.log(`Dry run: Ports to operate on - ${parsedPorts.join(', ')}`);
      return;
    }

    // Interactive mode: Display active ports and allow user to select
    if (this.interactive) {
      const activePorts = await this.listActivePorts();
      const selectedPorts = await this.promptUserToSelectPorts(activePorts);
      return this.handlePorts(selectedPorts);
    }

    // Handle the ports based on the action
    return this.handlePorts(parsedPorts);
  }

  /**
   * Lists active ports based on the platform and speed flag.
   * @returns {Promise<string[]>} List of active ports.
   */
  async listActivePorts() {
    const command = this.platform === 'win32' 
      ? 'netstat -nao' 
      : (this.speed === 'fast' 
        ? `lsof -i :${this.ports}`  // Use fast option
        : 'lsof -i -P');  // Default to safe option

    try {
      const { stdout } = await sh(command);
      const lines = stdout.split('\n');
      return this.platform === 'win32' ? this.parseWindowsPorts(lines) : this.parseUnixPorts(lines);
    } catch (error) {
      throw new Error(`Failed to list active ports: ${error.message}`);
    }
  }

  /**
   * Parses active ports for Windows.
   * @param {string[]} lines - The output lines from the netstat command.
   * @returns {string[]} The parsed active ports.
   */
  parseWindowsPorts(lines) {
    const regex = new RegExp(`^ *${this.method.toUpperCase()} *[^ ]*:(\\d+),`, 'gm');
    return lines.reduce((acc, line) => {
      const match = line.match(regex);
      if (match && match[1] && !acc.includes(match[1])) {
        acc.push(match[1]);
      }
      return acc;
    }, []);
  }

  /**
   * Parses active ports for Unix-like systems.
   * @param {string[]} lines - The output lines from the lsof command.
   * @returns {string[]} The parsed active ports.
   */
  parseUnixPorts(lines) {
    const regex = new RegExp(`:${this.method === 'udp' ? 'udp' : 'tcp'}:(\\d+)`, 'gm');
    return lines.reduce((acc, line) => {
      const match = line.match(regex);
      if (match && match[1] && !acc.includes(match[1])) {
        acc.push(match[1]);
      }
      return acc;
    }, []);
  }

  /**
   * Prompts the user to select ports interactively.
   * @param {string[]} activePorts - List of active ports to choose from.
   * @returns {Promise<number[]>} The selected ports.
   */
  promptUserToSelectPorts(activePorts) {
    return new Promise((resolve) => {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

      activePorts.forEach((port, index) => {
        console.log(`${index + 1}. ${port}`);
      });

      rl.question('Select ports to operate on (comma-separated indices): ', (answer) => {
        const indices = answer.split(',').map(Number);
        const selectedPorts = indices.map((index) => activePorts[index - 1]).filter(Boolean);
        rl.close();
        resolve(selectedPorts);
      });
    });
  }

  /**
   * Handles the operation (check, isExist, or kill) for the given ports.
   * @param {number[]} ports - The ports to handle.
   * @returns {Promise<void>}
   */
  async handlePorts(ports) {
    if (this.action === 'check') {
      // Show info about the port
      return this.showPortInfo(ports);
    }

    if (this.action === 'isExist') {
      // Just check if the port exists
      return this.showPortInfo(ports);
    }

    if (this.action === 'kill') {
      // Kill the port
      return this.killPorts(ports);
    }
  }

  async isExistFast(port) {
    const { stdout } = await sh(`lsof -i :${port}`);

    return stdout.includes('LISTEN');
  }

  async isExistNormal(port) {
    const activePorts = await this.listActivePorts();
    console.log(activePorts)

    return activePorts.includes(String(port));
  }

  /**
   * Shows information about the given ports.
   * @param {number[]} ports - The ports to check.
   */
  async showPortInfo(ports) {
    for (const port of ports) {
      if (this.speed === 'fast') {
        try {
          const isExit = await this.isExistFast(port);
          console.log(isExit ? `Port ${port} is active.` : `Port ${port} is not active.`);
        } catch (error) {
          console.error(`Error checking port ${port}: ${error.message}`);
        }
      } else {
        try {
          const isExit = await this.isExistNormal(port);
          console.log(isExit ? `Port ${port} is active.` : `Port ${port} is not active.`);
        } catch (error) {
          console.error(`Error retrieving active ports: ${error.message}`);
        }
      }
    }
  }

  /**
   * Kills the specified ports.
   * @param {number[]} ports - The ports to kill.
   * @returns {Promise<void>}
   */
  async killPorts(ports) {
    for (const port of ports) {
      try {
        const command = this.platform === 'win32' 
          ? await this.getWindowsKillCommand(port)
          : await this.getUnixKillCommand(port, this.method, this.graceful);

        this.log(`Executing: ${command}`);
        const result = await sh(command);
        this.log(`Successfully killed port ${port}: ${result.stdout}`);
      } catch (error) {
        console.error(`Failed to kill port ${port}: ${error.message}`);
      }
    }
  }

  /**
   * Gets the Windows command to kill a port.
   * @param {number} port - The port to kill.
   * @returns {string} The Windows kill command.
   */
  async getWindowsKillCommand(port) {
    try {
      const { stdout } = await sh('netstat -nao');
      const lines = stdout.split('\n');
      const regex = new RegExp(`^ *${this.method.toUpperCase()} *[^ ]*:${port},`, 'gm');
      const linesWithPort = lines.filter(line => regex.test(line));

      const pids = linesWithPort.reduce((acc, line) => {
        const pidMatch = line.match(/(\d+)\w*/);
        if (pidMatch) acc.push(pidMatch[1]);
        return acc;
      }, []);

      return `TaskKill /F /PID ${pids.join(' /PID ')}`;
    } catch (error) {
      throw new Error(`Failed to get Windows kill command: ${error.message}`);
    }
  }

  /**
   * Gets the Unix command to kill a port.
   * @param {number} port - The port to kill.
   * @param {string} method - The protocol (tcp/udp).
   * @param {boolean} graceful - Whether to use a graceful kill.
   * @returns {string} The Unix kill command.
   */
  async getUnixKillCommand(port, method = 'tcp', graceful = false) {
    const baseCommand = `lsof -i ${method}:${port} | grep ${method.toUpperCase()} | awk '{print $2}' | xargs`;

    const killCommand = graceful ? 'kill' : 'kill -9';

    try {
      let existProccess = null;
      if(this.speed === 'fast') {
        existProccess = await this.isExistFast(port);
      } else {
        existProccess = await this.isExistNormal(port);
      }

      if (!existProccess) throw new Error('No process running on port');

      return `${baseCommand} ${killCommand}`;
    } catch (error) {
      throw new Error(`Failed to get Unix kill command: ${error.message}`);
    }
  }
}

/**
 * Main entry point to the script.
 * @param {string | number | number[]} ports - Ports to be operated on.
 * @param {Object} options - Options for the operation.
 * @returns {Promise<void>}
 */
module.exports = async function (ports, options = {}) {
  const portClient = new PortClient(ports, options);
  return portClient.execute();
}
