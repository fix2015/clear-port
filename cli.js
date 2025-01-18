#!/usr/bin/env node
'use strict';

/**
 * Module dependencies.
 */
const portUtil = require('./dist/index.js');
const getThemArgs = require('get-them-args');

/**
 * Parse command-line arguments.
 */
const args = getThemArgs(process.argv.slice(2));

/** 
 * Verbose mode for logging. 
 * @type {boolean}
 */
const verbose = args.verbose || false;

/** 
 * Ports to process, extracted from arguments. 
 * @type {Array<string>|string}
 */
let port = args.port ? args.port.toString().split(',') : args.unknown;

/** 
 * Method to use for processing (e.g., 'tcp'). 
 * @type {string}
 */
const method = args.method || 'tcp';

/** 
 * Speed mode: 'fast' or 'safe'. 
 * @type {string}
 */
const speed = args.speed || args.fast ? 'fast' : 'safe';

/** 
 * Interactive mode toggle. 
 * @type {boolean}
 */
const interactive = args.interactive || false;

/** 
 * Dry-run mode toggle. 
 * @type {boolean}
 */
const dryRun = args.dryRun || false;

/** 
 * Graceful handling toggle. 
 * @type {boolean}
 */
const graceful = args.graceful || false;

/** 
 * Filter criteria for processing ports. 
 * @type {string}
 */
const filter = args.filter || '';

/** 
 * Range of ports for processing, if applicable. 
 * @type {string|null}
 */
const range = args.filter || null;

/** 
 * Action to perform: 'kill' or other specified action. 
 * @type {string}
 */
const action = args.kill ? 'kill' : args.action || 'check';

/** 
 * Ensure port is an array for consistent processing.
 */
if (!Array.isArray(port)) {
  port = [port];
}

/**
 * Process each port using portUtil with the specified options.
 */
Promise.all(
  port.map((current) => {
    return portUtil(current, {
      method,
      speed,
      action,
      interactive,
      dryRun,
      verbose,
      graceful,
      filter,
      range
    })
      .then((result) => {
        verbose && console.log(`Process on port ${action} ${current}`);
      })
      .catch((error) => {
        verbose && console.log(`Could not process on port ${current}. ${error.message}.`);
      });
  })
);
