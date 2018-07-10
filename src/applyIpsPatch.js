import {
  IPS_START,
  IPS_END,
  defaultLog,
  toIntBE,
  formatHex,
} from './utils';

export default function applyIpsPatch(sourceFile, patchFile, options = {}) {
  const { log = defaultLog } = options;
  const { length: sourceFileLength } = sourceFile;
  const { length: patchFileLength } = patchFile;
  let index = 0;

  const targetFile = Buffer.from(sourceFile);

  function readPatchData(length) {
    if (index + length > patchFileLength) {
      throw new Error(`Unexpected end of file tried to read ${length} bytes at ${formatHex(index, 3)})`);
    }
    const start = index;
    index += length;
    return patchFile.slice(start, index);
  }

  if (!readPatchData(5).equals(IPS_START)) {
    throw new Error('Patch file does not have PATCH header');
  }

  while (index < patchFileLength) {
    const hunkStart = readPatchData(3);
    if (hunkStart.equals(IPS_END)) {
      log('EOF');
      if (index < patchFileLength) {
        log(`${sourceFile.length - index} unprocessed patch bytes`);
      }
      break;
    }

    const offset = toIntBE(hunkStart);
    const lengthBytes = readPatchData(2);
    const length = toIntBE(lengthBytes);

    if (length) {
      // Regular Hunk
      const payload = readPatchData(length);
      if (offset + length > sourceFileLength) {
        throw new Error(`Source filesize is ${sourceFileLength} bytes! Cannot write ${length} bytes at offset ${formatHex(offset, 3)}`);
      }
      log(`Write ${length} bytes at offset ${formatHex(offset, 3)}`);
      for (let i = 0; i < length; i++) {
        targetFile.writeUInt8(payload[i], offset + i);
      }
    } else {
      // RLE hunk
      const runLength = toIntBE(readPatchData(2));
      const payload = toIntBE(readPatchData(1));
      if (offset + runLength > sourceFileLength) {
        throw new Error(`Source filesize is ${sourceFileLength} bytes! Cannot write ${runLength} bytes at offset ${formatHex(offset, 3)}`);
      }
      log(`Write ${formatHex(payload, 1)} for ${runLength} bytes at offset ${formatHex(offset, 3)}`);
      for (let i = 0; i < runLength; i++) {
        targetFile.writeUInt8(payload, offset + i);
      }
    }
  }

  return targetFile;
}
