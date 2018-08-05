import {
  MAX_FILE_SIZE,
  IPS_START,
  IPS_END,
  defaultLog,
  formatHex,
} from './utils';

const SIZE_HUNK_REGULAR_OVERHEAD = 5;
const SIZE_HUNK_RLE = 7;

function encodeHunkRegular(offset, bytes) {
  return [
    // Address
    (offset >>> 16) & 0xff,
    (offset >>> 8) & 0xff,
    offset & 0xff,
    // Length of changed data
    (bytes.length >>> 8) & 0xff,
    bytes.length & 0xff,
    // Bytes
    ...bytes,
  ];
}

function encodeHunkRLE(offset, bytes) {
  return [
    // Address
    (offset >>> 16) & 0xff,
    (offset >>> 8) & 0xff,
    offset & 0xff,
    // Zero-length
    0x00, 0x00,
    // Repeat length
    (bytes.length >>> 8) & 0xff,
    bytes.length & 0xff,
    // Byte to repeat
    bytes[0],
  ];
}

function getHunkRegularSize(length) {
  return SIZE_HUNK_REGULAR_OVERHEAD + length;
}

function getByteRangeSize(byteRange) {
  const sizeHunkRegular = getHunkRegularSize(byteRange.bytes.length);
  return (byteRange.canRLE && SIZE_HUNK_RLE <= sizeHunkRegular) ? SIZE_HUNK_RLE : sizeHunkRegular;
}

function shouldEncodeAsRLE(byteRange) {
  const { canRLE, bytes } = byteRange;
  return canRLE && SIZE_HUNK_RLE <= getHunkRegularSize(bytes.length);
}

export function encodeByteRange(byteRange, useRLE = true) {
  const { offset, bytes } = byteRange;
  return useRLE && shouldEncodeAsRLE(byteRange)
    ? encodeHunkRLE(offset, bytes)
    : encodeHunkRegular(offset, bytes);
}

export function optimizeByteRanges(byteRanges) {
  const optimizedByteRanges = [];
  let currentByteRange;
  byteRanges.forEach((byteRange) => {
    const canMergeByteRanges = currentByteRange != null && currentByteRange.offset + currentByteRange.bytes.length === byteRange.offset;
    if (canMergeByteRanges) {
      const mergedByteRange = {
        offset: currentByteRange.offset,
        canRLE: false,
        bytes: [].concat(currentByteRange.bytes, byteRange.bytes),
      };
      const byteRangeSizeA = getByteRangeSize(currentByteRange);
      const byteRangeSizeB = getByteRangeSize(byteRange);
      const byteRangeSizeMerged = getByteRangeSize(mergedByteRange);
      const shouldMergeByteRanges = byteRangeSizeMerged <= byteRangeSizeA + byteRangeSizeB;
      if (shouldMergeByteRanges) {
        optimizedByteRanges.pop();
        currentByteRange = mergedByteRange;
        optimizedByteRanges.push(currentByteRange);
      } else {
        currentByteRange = byteRange;
        optimizedByteRanges.push(currentByteRange);
      }
    } else {
      currentByteRange = byteRange;
      optimizedByteRanges.push(currentByteRange);
    }
  });
  return optimizedByteRanges;
}

export function createPatchFromRanges(byteRanges, options = {}) {
  const { log, useRLE = true } = options;
  return byteRanges.reduce((patchContents, byteRange) => {
    if (log) {
      const { offset, bytes } = byteRange;
      if (useRLE && shouldEncodeAsRLE(byteRange)) {
        log(`Write ${formatHex(bytes[0], 1)} for ${bytes.length} bytes at offset ${formatHex(offset, 3)}`);
      } else {
        log(`Write ${bytes.length} bytes at offset ${formatHex(offset, 3)}`);
      }
    }
    patchContents.push(...encodeByteRange(byteRange, useRLE));
    return patchContents;
  }, []);
}

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

  // Changed bytes are grouped (unoptimized) by contiguous unique changes or runs of repeated bytes
  let currentChangedByteRange = null;
  const changedByteRanges = [];

  function openChangedByteRange(byte = null, offset = 0) {
    currentChangedByteRange = {
      offset,
      canRLE: true,
      bytes: byte == null ? [] : [byte],
    };
    changedByteRanges.push(currentChangedByteRange);
    return currentChangedByteRange;
  }

  function closeChangedByteRange() {
    currentChangedByteRange = null;
  }

  function addChangedByte(byte, offset = 0) {
    if (currentChangedByteRange) {
      // Handle a byte that is different from an ongoing run
      if (currentChangedByteRange.canRLE && currentChangedByteRange.bytes[0] !== byte) {
        if (currentChangedByteRange.bytes.length > 1) {
          openChangedByteRange(null, offset);
        } else {
          currentChangedByteRange.canRLE = false;
        }
      }
      // Add to an existing range
      currentChangedByteRange.bytes.push(byte);
    } else {
      openChangedByteRange(byte, offset);
    }
  }

  // Compare byte-by-byte
  let currentByte = null;
  for (let i = 0; i < sourceFileLength; i++) {
    currentByte = targetFile[i];
    if (sourceFile[i] === currentByte) {
      closeChangedByteRange();
    } else {
      addChangedByte(currentByte, i);
    }
  }

  // Optimize byte ranges for space
  const optimizedChangedByteRanges = optimizeByteRanges(changedByteRanges);

  // Create patch data for byte ranges
  const patchContents = createPatchFromRanges(optimizedChangedByteRanges, options);

  // Add header/footer
  return Buffer.concat([IPS_START, Buffer.from(patchContents), IPS_END]);
}
