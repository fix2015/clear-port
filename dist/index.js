"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const shell_exec_1 = __importDefault(require("shell-exec"));
const readline_1 = __importDefault(require("readline"));
class PortClient {
    constructor(ports, { method = 'tcp', action = 'check', interactive = false, dryRun = false, verbose = false, graceful = false, filter = null, range = null, speed = 'safe', } = {}) {
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
    log(message) {
        if (this.verbose) {
            console.log(message);
        }
    }
    parsePorts() {
        if (Array.isArray(this.ports)) {
            return this.ports.map(Number).filter(Boolean);
        }
        else if (this.range) {
            const [start, end] = this.range.split('-').map(Number);
            return Array.from({ length: end - start + 1 }, (_, i) => start + i);
        }
        else {
            const port = Number(this.ports);
            return port ? [port] : [];
        }
    }
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            const parsedPorts = this.parsePorts();
            if (parsedPorts.length === 0) {
                throw new Error('Invalid or no port(s) provided.');
            }
            if (this.dryRun) {
                this.success(`Dry run: Ports to operate on - ${parsedPorts.join(', ')}`);
                return;
            }
            if (this.interactive) {
                const activePorts = yield this.listActivePorts();
                const selectedPorts = yield this.promptUserToSelectPorts(activePorts);
                return this.handlePorts(selectedPorts.map(Number)); // Ensure it's a number[]
            }
            return this.handlePorts(parsedPorts);
        });
    }
    handlePorts(ports) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (this.action) {
                case 'check':
                case 'isExist':
                    return this.showPortInfo(ports);
                case 'kill':
                    return this.killPorts(ports);
                default:
                    throw new Error(`Unknown action: ${this.action}`);
            }
        });
    }
    listActivePorts() {
        return __awaiter(this, void 0, void 0, function* () {
            const command = this.platform === 'win32'
                ? 'netstat -nao'
                : (this.speed === 'fast'
                    ? `lsof -i :${this.ports}`
                    : 'lsof -i -P -n');
            try {
                const { stdout } = yield (0, shell_exec_1.default)(command);
                const lines = stdout.split('\n');
                return this.platform === 'win32' ? this.parseWindowsPorts(lines) : this.parseUnixPorts(lines);
            }
            catch (error) {
                throw new Error(`Failed to list active ports: ${error.message}`);
            }
        });
    }
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
    parseUnixPorts(lines) {
        const regex = /(?<=:\d{1,5})->|\b\d{1,5}(?=->|\s+\(CLOSED\)|\s+\(ESTABLISHED\)|\s+\(LISTEN\))/g;
        return lines.flatMap((line) => line.match(regex) || []).filter(Boolean);
    }
    promptUserToSelectPorts(activePorts) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                const rl = readline_1.default.createInterface({ input: process.stdin, output: process.stdout });
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
        });
    }
    success(message) {
        console.log('\x1b[32m%s\x1b[0m', `${message}`);
    }
    error(message) {
        console.log('\x1b[31m%s\x1b[0m', `${message}`);
    }
    showPortInfo(ports) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const port of ports) {
                try {
                    const isActive = yield this.checkPortStatus(port);
                    this.success(isActive ? `Port ${port} is active.` : `Port ${port} is not active.`);
                }
                catch (error) {
                    this.error(`Error checking port ${port}: ${error.message}`);
                }
            }
        });
    }
    isExistFast(port) {
        return __awaiter(this, void 0, void 0, function* () {
            // Fast method: using lsof (this is an example, you can replace with your own fast method)
            try {
                const { stdout } = yield (0, shell_exec_1.default)(`lsof -i tcp:${port}`);
                return stdout.trim().length > 0;
            }
            catch (error) {
                return false;
            }
        });
    }
    checkPortStatus(port) {
        return __awaiter(this, void 0, void 0, function* () {
            const checkMethod = this.speed === 'fast' ? this.isExistFast : this.isExistNormal;
            return yield checkMethod.call(this, port);
        });
    }
    killPorts(ports) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const port of ports) {
                try {
                    const command = this.platform === 'win32'
                        ? yield this.getWindowsKillCommand(port)
                        : yield this.getUnixKillCommand(port, this.method, this.graceful);
                    this.log(`Executing: ${command}`);
                    const result = yield (0, shell_exec_1.default)(command);
                    this.success(`Successfully killed port ${port} ${result.stdout}`);
                }
                catch (error) {
                    this.error(`Failed to kill port ${port}: ${error.message}`);
                }
            }
        });
    }
    getWindowsKillCommand(port) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { stdout } = yield (0, shell_exec_1.default)('netstat -nao');
                const lines = stdout.split('\n');
                const regex = new RegExp(`^ *${this.method.toUpperCase()} *[^ ]*:${port},`, 'gm');
                const linesWithPort = lines.filter((line) => regex.test(line));
                const pids = linesWithPort.reduce((acc, line) => {
                    const pidMatch = line.match(/(\d+)\w*/);
                    if (pidMatch)
                        acc.push(pidMatch[1]);
                    return acc;
                }, []);
                return `TaskKill /F /PID ${pids.join(' /PID ')}`;
            }
            catch (error) {
                throw new Error(`Failed to get Windows kill command: ${error.message}`);
            }
        });
    }
    getUnixKillCommand(port_1) {
        return __awaiter(this, arguments, void 0, function* (port, method = 'tcp', graceful = false) {
            const baseCommand = this.buildBaseCommand(method, port);
            const killCommand = graceful ? 'kill' : 'kill -9';
            try {
                const processExists = yield this.checkIfProcessExists(port);
                if (!processExists) {
                    throw new Error('No process running on port');
                }
                return `${baseCommand} ${killCommand}`;
            }
            catch (error) {
                throw new Error(`${error.message}`);
            }
        });
    }
    isExistNormal(port) {
        return __awaiter(this, void 0, void 0, function* () {
            // Normal method: using netstat (this is an example, you can replace with your own normal method)
            try {
                const { stdout } = yield (0, shell_exec_1.default)(`netstat -na | grep :${port}`);
                return stdout.trim().length > 0;
            }
            catch (error) {
                return false;
            }
        });
    }
    buildBaseCommand(method, port) {
        return `lsof -t -i ${method}:${port}`;
    }
    checkIfProcessExists(port) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { stdout } = yield (0, shell_exec_1.default)(`lsof -t -i tcp:${port}`);
                return stdout.trim().length > 0;
            }
            catch (error) {
                throw new Error(`Failed to check if process exists on port ${port}`);
            }
        });
    }
}
// Step 2: Wrap the invocation logic in an exported function
function runPortClient(ports_1) {
    return __awaiter(this, arguments, void 0, function* (ports, options = {}) {
        const portClient = new PortClient(ports, options);
        return portClient.execute();
    });
}
module.exports = runPortClient;
