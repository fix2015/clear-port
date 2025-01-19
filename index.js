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
    action = 'check',
    interactive = false,
    dryRun = false,
    verbose = false,
    graceful = false,
    filter = null,
    range = null,
    speed = 'safe',
    permissions = false
  } = {}) {
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
      this.success(`Dry run: Ports to operate on - ${parsedPorts.join(', ')}`);
      return;
    }

    if (this.interactive) {
      const activePorts = await this.listActivePorts();
      const selectedPorts = await this.promptUserToSelectPorts(activePorts);
      return this.handlePorts(selectedPorts);
    }

    if (this.permissions) {
      console.log(permissions ? ' sudo' : '')
    }

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
        ? `lsof -i :${this.ports}`  
        : 'lsof -i -P -n');  

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

    const regex = /(?<=:\d{1,5})->|\b\d{1,5}(?=->|\s+\(CLOSED\)|\s+\(ESTABLISHED\)|\s+\(LISTEN\))/g;

    return lines.flatMap(line => line.match(regex)).filter(Boolean);

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
        this.success(`${index + 1}. ${port}`);
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
   * Handles the action on a list of ports based on the specified action type.
   * 
   * @param {number[]} ports - The list of port numbers to act upon.
   * @returns {Promise} The result of the action performed.
   */
  async handlePorts(ports) {
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

  async isExistFast(port) {
    const { stdout } = await sh(`lsof -i :${port}`);

    return stdout.includes('LISTEN');
  }

  async isExistNormal(port) {
    const activePorts = await this.listActivePorts();

    return activePorts.includes(String(port));
  }

  /**
   * Logs a success message in green.
   * 
   * @param {string} message - The success message to log.
   * @returns {void}
   */
  success(message) {
    console.log('\x1b[32m%s\x1b[0m', `${message}`);
  }

  /**
   * Logs an error message in red.
   * 
   * @param {string} message - The error message to log.
   * @returns {void}
   */
  error(message) {
    console.log('\x1b[31m%s\x1b[0m', `${message}`);
  }

  /**
   * Checks and logs the status of each port, indicating whether it is active or not.
   * 
   * @param {number[]} ports - An array of port numbers to check for activity.
   */
  async showPortInfo(ports) {
    for (const port of ports) {
      try {
        const isActive = await this.checkPortStatus(port);

        this.success(isActive ? `Port ${port} is active.` : `Port ${port} is not active.`);
      } catch (error) {
        this.error(`Error checking port ${port}: ${error.message}`);
      }
    }
  }

  /**
   * Checks whether a given port is active based on the current speed setting.
   * 
   * @param {number} port - The port number to check.
   * @returns {Promise<boolean>} A promise that resolves to a boolean indicating whether the port is active.
   */
  async checkPortStatus(port) {
    const checkMethod = this.speed === 'fast' ? this.isExistFast : this.isExistNormal;
    return await checkMethod.call(this, port);
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
        this.success(`Successfully killed port ${port} ${result.stdout}`);
      } catch (error) {
        this.error(`Failed to kill port ${port}: ${error.message}`);
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
   * Constructs the Unix command to kill a process running on a specified port.
   * The command will either gracefully or forcefully terminate the process, depending on the `graceful` parameter.
   *
   * @param {number} port - The port number where the process is running.
   * @param {string} [method='tcp'] - The method (protocol) for the command (e.g., 'tcp' or 'udp'). Defaults to 'tcp'.
   * @param {boolean} [graceful=false] - Whether to send a graceful kill signal (`true`) or a forceful one (`false`). Defaults to `false` (forceful kill).
   * @returns {Promise<string>} The full Unix command string to kill the process.
   * @throws {Error} Throws an error if no process is found running on the specified port.
   */
  async getUnixKillCommand(port, method = 'tcp', graceful = false) {
    const baseCommand = this.buildBaseCommand(method, port);
    const killCommand = graceful ? 'kill' : 'kill -9';

    try {
      const processExists = await this.checkIfProcessExists(port);

      if (!processExists) {
        throw new Error('No process running on port');
      }

      return `${baseCommand} ${killCommand}`;
    } catch (error) {
      throw new Error(`${error.message}`);
    }
  }

  /**
   * Builds the base command for listing the process associated with a port and method.
   * 
   * @param {string} method - The method (protocol) for the command (e.g., 'tcp' or 'udp').
   * @param {number} port - The port number where the process is running.
   * @returns {string} The base command to find the process ID (PID) of the process running on the specified port and protocol.
   */
  buildBaseCommand(method, port) {
    return `lsof -i ${method}:${port} | grep ${method.toUpperCase()} | awk '{print $2}' | xargs`;
  }

  /**
   * Checks if a process is running on the specified port by using either a fast or normal check based on the current speed setting.
   * 
   * @param {number} port - The port number where the process is running.
   * @returns {Promise<boolean>} A boolean indicating whether a process is running on the specified port.
   */
  async checkIfProcessExists(port) {
    const isFastCheck = this.speed === 'fast';
    const checkMethod = isFastCheck ? this.isExistFast : this.isExistNormal;
    return await checkMethod.call(this, port);
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
