# Port Client Class Documentation

The `Port Client` class offers a **killer feature**: **fast operations**. By using the `--fast` flag in the command-line interface (CLI) or setting the `speed: 'fast'` option in the script, users can perform port operations **100 times faster** than the default safe mode. This feature skips extra checks and immediately acts on the specified ports, making it ideal for users who need quick results when checking or killing ports.

## Table of Contents

1. [Overview](#overview)
2. [Command-Line Interface (CLI) Usage](#cli-usage)
3. [Class Constructor](#class-constructor)
4. [Usage Example](#usage-example)

## Overview

The `Port Client` class allows users to interact with network ports, providing functionalities to check whether a port is active, kill a port, and verify the existence of ports. It supports both **TCP** and **UDP** protocols, works on multiple platforms (Windows and Unix-like systems), and includes a `dryRun` mode for testing.

### Key Feature: **Fast Operations**

The `--fast` flag for the CLI or the `speed: 'fast'` option for the script provides **fast operations**. This option makes port operations significantly faster by bypassing slower checks like listing all active ports. It's particularly useful when you need to check or kill ports quickly.

When using the `--fast` flag or `speed: 'fast'`, the script will skip certain checks and perform actions directly on the specified ports.

### Parameters:

- `ports`: The port(s) to operate on (either a number, an array, or a range).
- `options`: Configuration options for the port operation, such as action (`check`, `kill`), protocol (`tcp` or `udp`), speed (`safe` or `fast`), and interactive mode.

## Command-Line Interface (CLI) Usage

You can also use the `Port Client` class via a command-line interface by calling it from a `cli.js` script. This allows you to interact with the ports directly from your terminal.

### Running the CLI

1. **To check port(s)**:

```
npx port-client 8080 3000 check
```

2. **To kill a port(s)**:

```
npx port-client 8080 3000 kill
```

This script accepts a list of ports followed by an action (`check` or `kill`). The ports will be parsed, and the specified action will be executed.

### Fast Operation Flag

You can enable **fast operations** in the CLI by using the `--fast` flag:

```
npx port-client 8080 3000 check --fast
```

This will perform the operation 100 times faster by skipping extra checks.

## Class Constructor

The constructor of the `Port Client` class initializes an instance with the ports and options for the port operation. Below are the parameters available for the constructor.

### Constructor Parameters:
- `ports`: The port(s) to operate on (either a number, an array, or a range).
- `options`: Configuration options for the port operation. The available options are:
  - `action`: Action to perform on the port(s) (`check`, `kill`, `isExist`). Default is `check`.
  - `method`: The protocol method to use (`tcp` or `udp`). Default is `tcp`.
  - `interactive`: Whether to enable interactive mode for selecting ports. Default is `false`.
  - `dryRun`: If `true`, no actual changes are made (dry run). Default is `false`.
  - `verbose`: If `true`, enables verbose logging. Default is `false`.
  - `graceful`: If `true`, uses graceful termination for killing ports. Default is `false`.
  - `filter`: A filter for limiting results. Default is `null`.
  - `range`: A range of ports to check. Default is `null`.
  - `speed`: The speed mode to use (`safe` or `fast`). Default is `safe`.

### Example Usage:
```js
import port from 'port-client';

const ports = [8080, 3000];
const options = {
  action: 'check',         // Action to perform
  method: 'tcp',           // Protocol method
  interactive: true,       // Enable interactive mode
  dryRun: false,           // Dry run (no actual changes)
  verbose: true,           // Enable verbose logging
  graceful: true,          // Use graceful kill
  speed: 'safe',           // Safe speed mode (default)
};

const port = new port(ports, options);
port.execute()
  .then(() => console.log('Port operations complete.'))
  .catch((error) => console.error('Error during port operations:', error));
```

## Conclusion

The `Port Client` class offers a flexible and interactive way to manage ports, whether you're checking if they're active, killing processes associated with them, or performing dry runs to preview actions. It can be used in a Node.js script or directly in the shell using the provided CLI script.
