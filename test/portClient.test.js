// portClient.test.js
const sh = require('shell-exec'); // Shell execution module
const readline = require('readline');
const PortClient = require('../index.js'); // Assuming the class is in portClient.js

jest.mock('shell-exec');
jest.mock('readline');

// Test suite for PortClient
describe('PortClient Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should parse single port correctly', () => {
    const client = new PortClient(8080, { verbose: true });
    const parsedPorts = client.parsePorts();
    expect(parsedPorts).toEqual([8080]);
  });

  test('should parse range of ports correctly', () => {
    const client = new PortClient(null, { range: '8080-8082', verbose: true });
    const parsedPorts = client.parsePorts();
    expect(parsedPorts).toEqual([8080, 8081, 8082]);
  });

  test('should parse an array of ports correctly', () => {
    const client = new PortClient([8080, 8081, 8082], { verbose: true });
    const parsedPorts = client.parsePorts();
    expect(parsedPorts).toEqual([8080, 8081, 8082]);
  });

  test('should throw error if no valid ports provided', async () => {
    const client = new PortClient(null, { verbose: true });
    await expect(client.execute()).rejects.toThrow('Invalid or no port(s) provided.');
  });

  test('should list active ports for Unix-like systems', async () => {
    const mockShellResponse = { stdout: 'tcp 0 0 0.0.0.0:8080 0.0.0.0:* LISTEN' };
    sh.mockResolvedValue(mockShellResponse);

    const client = new PortClient(8080, { method: 'tcp', speed: 'safe' });
    const activePorts = await client.listActivePorts();
    expect(activePorts).toEqual(['8080']);
  });

  test('should list active ports for Windows systems', async () => {
    const mockShellResponse = { stdout: 'TCP    0.0.0.0:8080              0.0.0.0:*               LISTENING       1234' };
    sh.mockResolvedValue(mockShellResponse);

    const client = new PortClient(8080, { method: 'tcp', speed: 'safe' });
    client.platform = 'win32'; // Mock Windows platform
    const activePorts = await client.listActivePorts();
    expect(activePorts).toEqual(['8080']);
  });

  test('should correctly handle dry run', async () => {
    const client = new PortClient(8080, { dryRun: true, verbose: true });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await client.execute();
    
    expect(consoleSpy).toHaveBeenCalledWith('Dry run: Ports to operate on - 8080');
    consoleSpy.mockRestore();
  });

  test('should successfully kill ports', async () => {
    const mockShellResponse = { stdout: 'Process killed successfully' };
    sh.mockResolvedValue(mockShellResponse);

    const client = new PortClient(8080, { action: 'kill', verbose: true });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await client.execute();
    
    expect(consoleSpy).toHaveBeenCalledWith('Executing: kill -9 8080');
    expect(consoleSpy).toHaveBeenCalledWith('Successfully killed port 8080 Process killed successfully');
    consoleSpy.mockRestore();
  });

  test('should handle error when killing non-existent port', async () => {
    const mockShellResponse = { stdout: '' };
    sh.mockRejectedValue(new Error('No process found for port'));

    const client = new PortClient(8080, { action: 'kill', verbose: true });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await client.execute();
    
    expect(consoleSpy).toHaveBeenCalledWith('Failed to kill port 8080: No process found for port');
    consoleSpy.mockRestore();
  });

  test('should ask user to select ports interactively', async () => {
    const mockActivePorts = ['8080', '8081', '8082'];
    const mockSelectedPorts = [8080, 8081];

    const rlMock = {
      question: jest.fn().mockImplementation((query, callback) => callback('1,2')),
      close: jest.fn(),
    };
    readline.createInterface.mockReturnValue(rlMock);

    const client = new PortClient(8080, { interactive: true, verbose: true });
    const handlePortsSpy = jest.spyOn(client, 'handlePorts');
    
    await client.execute();
    
    expect(handlePortsSpy).toHaveBeenCalledWith(mockSelectedPorts);
    expect(rlMock.close).toHaveBeenCalled();
  });
});

