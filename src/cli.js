#! /usr/bin/env node
/* eslint-env: node */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import program from 'commander';

import logger from './logger';

import * as pkg from '../package.json';

import applyIpsPatch from './applyIpsPatch';
import createIpsPatch from './createIpsPatch';

function applyIpsPatchFile(source, patch, target, options = {}) {
  const {
    allowOverwrite = false,
    checkSourceMd5 = null,
    dryRun = false,
  } = options;

  if (!source) {
    logger.error('No source file specified');
    return 1;
  }

  if (!patch) {
    logger.error('No patch file specified');
    return 1;
  }

  if (source === target || patch === target) {
    logger.error('Not trying to overwrite original %s', target);
    return 1;
  }

  if (!fs.existsSync(source)) {
    logger.error('Cannot find source file %s', source);
    return 1;
  }

  if (!fs.existsSync(patch)) {
    logger.error('Cannot find patch file %s', patch);
    return 1;
  }

  if (!(allowOverwrite || dryRun) && fs.existsSync(target)) {
    logger.error('Destination file already exists: %s', target);
    return 1;
  }

  const sourceFile = fs.readFileSync(source);
  logger.info('Read source file: %s', source);

  const patchFile = fs.readFileSync(patch);
  logger.info('Read patch file: %s', source);

  const sourceMd5 = crypto.createHash('md5').update(sourceFile).digest('hex');
  const patchMd5 = crypto.createHash('md5').update(patchFile).digest('hex');

  logger.info('Source MD5: %s', sourceMd5);
  logger.info('Patch MD5: %s', patchMd5);

  if (checkSourceMd5 && sourceMd5 !== checkSourceMd5) {
    logger.error('Source file MD5 mismatch! Expected %s', checkSourceMd5);
    return 1;
  }

  const sourceSha256 = crypto.createHash('sha256').update(sourceFile).digest('hex');
  logger.info('Source SHA-256: %s', sourceSha256);

  let targetFile;

  try {
    targetFile = applyIpsPatch(sourceFile, patchFile, {
      log(...args) {
        if (dryRun) {
          logger.info(...args);
        } else {
          logger.debug(...args);
        }
      },
    });
  } catch (e) {
    logger.error(e.toString());
    return 1;
  }

  if (dryRun) {
    logger.info('Dry run! Not writing file: %s', target);
  } else {
    try {
      fs.writeFileSync(target, targetFile);
      logger.info('Wrote patched file: %s', target);
    } catch (e) {
      logger.error('Error writing patched file %s', target);
      return 1;
    }
  }

  const targetMd5 = crypto.createHash('md5').update(targetFile).digest('hex');
  const targetSha256 = crypto.createHash('sha256').update(targetFile).digest('hex');

  logger.info('Target MD5: %s', targetMd5);
  logger.info('Target SHA-256: %s', targetSha256);

  logger.info('OK!');

  return 0;
}

function createIpsPatchFile(source, target, patch, options = {}) {
  const {
    allowOverwrite = false,
    dryRun = false,
  } = options;

  if (!source) {
    logger.error('No source file specified');
    return 1;
  }

  if (!target) {
    logger.error('No target file specified');
    return 1;
  }

  if (source === patch || target === patch) {
    logger.error('Not trying to overwrite original %s', patch);
    return 1;
  }

  if (!fs.existsSync(source)) {
    logger.error('Cannot find source file %s', source);
    return 1;
  }

  if (!fs.existsSync(target)) {
    logger.error('Cannot find target file %s', target);
    return 1;
  }

  if (!(allowOverwrite || dryRun) && fs.existsSync(patch)) {
    logger.error('Destination file already exists: %s', patch);
    return 1;
  }

  const sourceFile = fs.readFileSync(source);
  logger.info('Read source file: %s', source);

  const targetFile = fs.readFileSync(target);
  logger.info('Read target file: %s', target);

  const sourceMd5 = crypto.createHash('md5').update(sourceFile).digest('hex');
  const targetMd5 = crypto.createHash('md5').update(targetFile).digest('hex');

  logger.info('Source MD5: %s', sourceMd5);
  logger.info('Target MD5: %s', targetMd5);

  const sourceSha256 = crypto.createHash('sha256').update(sourceFile).digest('hex');
  logger.info('Source SHA-256: %s', sourceSha256);

  let patchFile;

  try {
    patchFile = createIpsPatch(sourceFile, targetFile, {
      log(...args) {
        if (dryRun) {
          logger.info(...args);
        } else {
          logger.debug(...args);
        }
      },
    });
  } catch (e) {
    logger.error(e.toString());
    return 1;
  }

  if (dryRun) {
    logger.info('Dry run! Not writing file: %s', patch);
  } else {
    try {
      fs.writeFileSync(patch, patchFile);
      logger.info('Wrote patch file: %s', patch);
    } catch (e) {
      logger.error('Error writing patch file %s', patch);
      return 1;
    }
  }

  const patchMd5 = crypto.createHash('md5').update(patchFile).digest('hex');
  const patchSha256 = crypto.createHash('sha256').update(patchFile).digest('hex');

  logger.info('Patch MD5: %s', patchMd5);
  logger.info('Patch SHA-256: %s', patchSha256);

  logger.info('OK!');

  return 0;
}

program
  .version(pkg.version, '-v, --version')
  .option('-d, --debug', 'enable debug logging')
  .on('option:debug', () => {
    if (program.debug) {
      logger.level = 'debug';
    }
  });

program
  .command('apply <source> <patch> [target]')
  .option('--md5 [hash]', 'Check the source file against the MD5 hash before patching')
  .option('--allow-overwrite', 'Allow overwriting of destination file')
  .option('--dry-run', 'Stop before writing the destination file')
  .description('apply a patch to the source file')
  .action((source, patch, target, cmd) => {
    if (!target) {
      const { ext } = path.parse(source);
      const { dir, name } = path.parse(patch);
      // eslint-disable-next-line
      target = path.join(dir, `${name}${ext}`);
    }
    const result = applyIpsPatchFile(source, patch, target, {
      allowOverwrite: cmd.allowOverwrite,
      dryRun: cmd.dryRun,
      checkSourceMd5: cmd.md5,
    });
    logger.on('finish', () => {
      process.exit(result || 0);
    });
  });

program
  .command('create <source> <target> [patch]')
  .option('--allow-overwrite', 'Allow overwriting of destination file')
  .option('--dry-run', 'Stop before writing the destination file')
  .description('create a patch from the source and target files')
  .action((source, target, patch, cmd) => {
    if (!patch) {
      const { dir, name } = path.parse(target);
      // eslint-disable-next-line
      patch = path.join(dir, `${name}.ips`);
    }
    const result = createIpsPatchFile(source, target, patch, {
      allowOverwrite: cmd.allowOverwrite,
      dryRun: cmd.dryRun,
    });
    logger.on('finish', () => {
      process.exit(result || 0);
    });
  });

program
  .command('*', { noHelp: true, isDefault: true })
  .on('command:*', () => {
    program.help();
  });

program.parse(process.argv);

if (process.argv.length < 3) {
  program.help();
}
