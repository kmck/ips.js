import {
  MAX_FILE_SIZE,
  IPS_START,
  IPS_END,
  defaultLog,
  formatHex,
} from './utils';

export default function createIpsPatch(sourceFile, targetFile, options = {}) {
  const { log = defaultLog } = options;
  const { length: sourceFileLength } = sourceFile;
  const { length: targetFileLength } = targetFile;

  if (sourceFileLength !== targetFileLength) {
    throw new Error(`Source filesize ${sourceFileLength} does not match target filesize ${targetFileLength}`);
  }

  if (targetFileLength > MAX_FILE_SIZE) {
    log(`Warning: File exceeds ${MAX_FILE_SIZE} byte limit!`);
  }

  const patchContents = [];
  let diffStart = -1;
  const canRLE = false; // @TODO
  let currentByte = null;
  const changedBytes = [];

  function createChangedByteRange(nextDiffStart = -1) {
    if (diffStart > MAX_FILE_SIZE) {
      throw new Error(`Unable to reach address ${formatHex(diffStart)}`);
    }

    // Write address
    patchContents.push(
      (diffStart >>> 16) & 0xff,
      (diffStart >>> 8) & 0xff,
      diffStart & 0xff,
    );

    // Run-length encoding only saves bytes if we're encoding more than 3
    if (canRLE && changedBytes.length > 3) {
      // RLE hunk
      patchContents.push(
        // Zero-length
        0x00, 0x00,
        // Repeat length
        (changedBytes.length >>> 8) & 0xff,
        changedBytes.length & 0xff,
        // Byte to repeat
        changedBytes[0],
      );
      log(`Write ${formatHex(changedBytes[0], 1)} for ${changedBytes.length} bytes at offset ${formatHex(diffStart, 3)}`);
    } else {
      // Regular hunk
      patchContents.push(
        // Length of changed data
        (changedBytes.length >>> 8) & 0xff,
        changedBytes.length & 0xff,
        ...changedBytes,
      );
      log(`Write ${changedBytes.length} bytes at offset ${formatHex(diffStart, 3)}`);
    }
    diffStart = nextDiffStart;
    changedBytes.length = 0;
  }

  for (let i = 0; i < sourceFileLength; i++) {
    currentByte = targetFile[i];
    if (sourceFile[i] !== currentByte) {
      // Set a new start point if we need it
      if (diffStart < 0) {
        diffStart = i;
      }
      // @TODO: Figure out which RLE ranges are worth maintaining
      // Add this byte
      changedBytes.push(currentByte);
    } else if (changedBytes.length) {
      createChangedByteRange();
    }
  }

  if (diffStart >= 0 && changedBytes.length) {
    createChangedByteRange();
  }

  const patchFile = Buffer.concat([IPS_START, Buffer.from(patchContents), IPS_END]);
  return patchFile;
}
