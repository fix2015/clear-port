#!/usr/bin/env node
'use strict';

import portUtil from './index.js';
import getThemArgs from 'get-them-args';

const args = getThemArgs(process.argv.slice(2));

const verbose = args.verbose || false;
let port = args.port ? args.port.toString().split(',') : args.unknown;
const method = args.method || 'tcp';
const speed = args.speed || args.fast? 'fast' : 'safe';
const interactive = args.interactive || false;
const dryRun = args.dryRun || false;
const graceful = args.graceful || false;
const filter = args.filter || '';
const range = args.filter || null;
const action = args.kill ? 'kill' : args.action || 'check';

if (!Array.isArray(port)) {
  port = [port];
}

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
        console.log(`Process on port ${current}`);
        verbose && console.log(result);
      })
      .catch((error) => {
        console.log(`Could not process on port ${current}. ${error.message}.`);
        verbose && console.log(error);
      });
  })
);
