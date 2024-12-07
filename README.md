# PortClient Class Documentation

This document provides an overview of the `PortClient` class and its functionality for managing ports, including checking port statuses, killing ports, and verifying port existence. The `PortClient` can handle both TCP and UDP protocols, and it supports different modes of operation such as interactive mode and dry run.

## Table of Contents

1. [Overview](#overview)
2. [Class Constructor](#class-constructor)
3. [Methods](#methods)
    - [log](#log)
    - [parsePorts](#parsePorts)
    - [execute](#execute)
    - [listActivePorts](#listActivePorts)
    - [parseWindowsPorts](#parseWindowsPorts)
    - [parseUnixPorts](#parseUnixPorts)
    - [promptUserToSelectPorts](#promptUserToSelectPorts)
    - [handlePorts](#handlePorts)
    - [isExistFast](#isExistFast)
    - [isExistNormal](#isExistNormal)
    - [showPortInfo](#showPortInfo)
    - [killPorts](#killPorts)
    - [getWindowsKillCommand](#getWindowsKillCommand)
    - [getUnixKillCommand](#getUnixKillCommand)
4. [Usage Example](#usage-example)
5. [Command-Line Interface (CLI) Usage](#cli-usage)

## Overview

The `PortClient` class allows users to interact with network ports, providing functionalities to check whether a port is active, kill a port, and verify the existence of ports. It supports both **TCP** and **UDP** protocols, works on multiple platforms (Windows and Unix-like systems), and includes a `dryRun` mode for testing.

## Class Constructor

The constructor of `PortClient` takes in the following parameters:

```
constructor(ports, {
  method = 'tcp',             // Protocol method (tcp or udp)
  action = 'check',           // Action to perform: 'check', 'isExist', or 'kill'
  interactive = false,        // Interactive mode
  dryRun = false,             // Dry run (no actual changes)
  verbose = false,            // Verbose logging
  graceful = false,           // Graceful kill option
  filter = null,              // Filter for specific conditions
  range = null,               // Port range (e.g., '1000-2000')
  speed = 'safe',             // Speed of operation: 'safe' or 'fast'
} = {})
```

### Parameters:

- `ports`: The port(s) to operate on (either a number, an array, or a range).
- `options`: Configuration options for the port operation.

## Methods

### `log`

Logs messages if verbose mode is enabled.

```
log(message)
```

### `parsePorts`

Parses the provided ports into an array of valid port numbers.

```
parsePorts()
```

### `execute`

Executes the port operation (check, isExist, or kill) based on the provided action.

```
execute()
```

### `listActivePorts`

Lists active ports based on the platform and speed flag.

```
listActivePorts()
```

### `parseWindowsPorts`

Parses active ports for Windows systems.

```
parseWindowsPorts(lines)
```

### `parseUnixPorts`

Parses active ports for Unix-like systems.

```
parseUnixPorts(lines)
```

### `promptUserToSelectPorts`

Prompts the user to select ports interactively when in interactive mode.

```
promptUserToSelectPorts(activePorts)
```

### `handlePorts`

Handles the operation (check, isExist, or kill) for the provided ports.

```
handlePorts(ports)
```

### `isExistFast`

Checks if a port is active quickly (using the `lsof` command).

```
isExistFast(port)
```

### `isExistNormal`

Checks if a port is active using a normal approach (based on the platform).

```
isExistNormal(port)
```

### `showPortInfo`

Shows information about the provided ports, including their active status.

```
showPortInfo(ports)
```

### `killPorts`

Kills the provided ports by terminating the associated processes.

```
killPorts(ports)
```

### `getWindowsKillCommand`

Generates the Windows command to kill a port.

```
getWindowsKillCommand(port)
```

### `getUnixKillCommand`

Generates the Unix command to kill a port.

```
getUnixKillCommand(port, method, graceful)
```

## Usage Example

Here is an example of how to use the `PortClient` class:

```
import PortClient from './PortClient';

const ports = [8080, 3000];
const options = {
  action: 'check',         // Action to perform
  method: 'tcp',           // Protocol method
  interactive: true,       // Enable interactive mode
  dryRun: false,           // Dry run (no actual changes)
  verbose: true,           // Enable verbose logging
  graceful: true,          // Use graceful kill
  speed: 'safe',           // Safe speed mode
};

const portClient = new PortClient(ports, options);
portClient.execute()
  .then(() => console.log('Port operations complete.'))
  .catch((error) => console.error('Error during port operations:', error));
```

## Command-Line Interface (CLI) Usage

You can also use the `PortClient` class via a command-line interface by calling it from a `cli.js` script. This allows you to interact with the ports directly from your terminal.

### CLI Usage Example

Create a `cli.js` file to interact with the `PortClient` class from the command line.

Here’s a simple example of how to use the `PortClient` in a `cli.js` file:

```
'use strict';

import sh from 'shell-exec';
import readline from 'readline';
import PortClient from './PortClient';

/**
 * Main entry point to the script.
 * @param {string | number | number[]} ports - Ports to be operated on.
 * @param {Object} options - Options for the operation.
 * @returns {Promise<void>}
 */
export default async function (ports, options = {}) {
  const portClient = new PortClient(ports, options);
  return portClient.execute();
}

/**
 * Parse command-line arguments and invoke the appropriate operation.
 */
const args = process.argv.slice(2);
const ports = args.slice(0, -1).map(Number);
const options = { 
  action: args[args.length - 1] || 'check',  // Default to 'check' action
  verbose: true, // Enable verbose logging
};

if (ports.length > 0) {
  await PortClient(ports, options);
} else {
  console.error('Please provide a port or a list of ports.');
}
```

### Running the CLI

1. **To check port(s)**: 

```
node cli.js 8080 3000 check
```

2. **To kill a port(s)**:

```
node cli.js 8080 3000 kill
```

This script accepts a list of ports followed by an action (`check` or `kill`). The ports will be parsed, and the specified action will be executed.

## Conclusion

The `PortClient` class offers a flexible and interactive way to manage ports, whether you're checking if they're active, killing processes associated with them, or performing dry runs to preview actions. It can be used in a Node.js script or directly in the shell using the provided CLI script.
