import fs from 'fs';
import path from 'path';
import noop from 'lodash/noop';

import { applyIpsPatch, createIpsPatch } from './ips';

function loadFixture(filename) {
  return fs.readFileSync(path.join(__dirname, '../__fixtures__', filename));
}

/* eslint-disable no-underscore-dangle */
class PseudoRandomNumberGenerator {
  constructor(seed = Math.floor(Math.random() * 2147483647)) {
    this._seed = seed % 2147483647;
    while (this._seed <= 0) {
      this._seed += 2147483646;
    }
    this._next = this._seed;
  }

  get seed() {
    return this._seed;
  }

  next() {
    this._next = (this._next * 16807) % 2147483647;
    return this._next;
  }

  nextFloat() {
    return (this.next() - 1) / 2147483646;
  }
}
/* eslint-enable no-underscore-dangle */

describe('createIpsPatch', () => {
  const testCases = [
    ['smiley-x.txt', 'frowny-x.txt', 'smiley-to-frowny-x.ips'],
    ['smiley-x.txt', 'smiley-m.txt', 'smiley-x-to-m.ips'],
  ];
  it('generates an IPS patch', () => {
    testCases.forEach(([source, target, result]) => {
      const dataActual = createIpsPatch(loadFixture(source), loadFixture(target), { log: noop });
      const dataExpected = loadFixture(result);
      expect(dataActual).toEqual(dataExpected);
    });
  });
});

describe('applyIpsPatch', () => {
  const testCases = [
    ['smiley-x.txt', 'smiley-to-frowny-x.ips', 'frowny-x.txt'],
    ['smiley-x.txt', 'smiley-x-to-m.ips', 'smiley-m.txt'],
    ['blank.txt', 'smiley-x-to-m.ips', 'smiley-m.txt'],
    ['smiley-m.txt', 'smiley-to-frowny-x.ips', 'smiley-m-patched-to-frowny-x.txt'],
    ['frowny-x.txt', 'smiley-x-to-m.ips', 'frowny-x-patched-to-m.txt'],
  ];
  it('applies an IPS patch', () => {
    testCases.forEach(([source, patch, result]) => {
      const dataActual = applyIpsPatch(loadFixture(source), loadFixture(patch), { log: noop });
      const dataExpected = loadFixture(result);
      expect(dataActual).toEqual(dataExpected);
    });
  });
});

describe('end-to-end', () => {
  it('generates patches that convert the source file to the target file', () => {
    const prng = new PseudoRandomNumberGenerator();
    const testCases = new Array(10).fill().map(() => {
      const dataSize = (prng.next() % 0x20) + 0x20;
      const sourceData = new Array(dataSize).fill().map(() => (prng.next() % 0xff));
      const targetData = sourceData.map(v => (prng.next() & 0x10 ? v : (v >>> 1)));
      return [Buffer.from(sourceData), Buffer.from(targetData)];
    });
    testCases.forEach(([sourceData, targetData]) => {
      const patchData = createIpsPatch(sourceData, targetData, { log: noop });
      const resultData = applyIpsPatch(sourceData, patchData, { log: noop });
      expect(resultData).toEqual(targetData);
    });
  });
});
