# clean-port

A Node.js utility to terminate processes running on specified ports. This tool is designed for developers who frequently encounter port conflicts during development. It supports multiple features to enhance usability and flexibility.

## Features

- **Kill Multiple Ports**: Terminate processes on multiple ports in a single command.
- **Interactive Mode**: Select ports to kill from a list of active ports.
- **Graceful Termination**: Attempt to gracefully terminate processes before forcefully killing them.
- **Dry-Run Mode**: Preview the ports and processes that would be terminated without executing the action.
- **Port Range Support**: Easily kill a range of ports.
- **Cross-Platform Compatibility**: Works on Windows, macOS, and Linux.

## Installation

Install the package globally to use it as a CLI tool:

```bash
npm install -g clean-port
```

Or use it directly via `npx`:

```bash
npx clean-port <port>
```

## Usage

### Basic Command

Kill a process running on a specific port:

```bash
npx clean-port 3000
```

### Kill Multiple Ports

Kill processes on multiple ports:

```bash
npx clean-port 3000 4000 5000
```

### Interactive Mode

List active ports and select which ones to kill:

```bash
npx clean-port --interactive
```

### Graceful Kill

Attempt a graceful termination:

```bash
npx clean-port 3000 --graceful
```

### Dry Run

Preview the ports that would be terminated:

```bash
npx clean-port 3000 --dry-run
```

### Kill a Port Range

Kill processes within a port range:

```bash
npx clean-port --range 3000-3100
```

## API Usage

You can also use this utility programmatically:

```javascript
const cleanPort = require('clean-port');

cleanPort(3000, { method: 'tcp', graceful: true })
  .then(() => console.log('Port killed successfully'))
  .catch((error) => console.error('Error:', error));
```

## Contributing

Contributions are welcome! Feel free to submit a pull request or file an issue on GitHub.

## License

This project is licensed under the MIT License.
