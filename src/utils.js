export const MAX_FILE_SIZE = (2 ** 24) - 1;
export const IPS_START = Buffer.from('PATCH');
export const IPS_END = Buffer.from('EOF');

/* eslint-disable no-console */
export function defaultLog(message) {
  if (console) {
    if (console.debug) {
      console.debug(message);
    } else if (console.log) {
      console.log(message);
    }
  }
}
/* eslint-enable no-console */

export function toIntBE(buffer) {
  let value = 0;
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer.readUInt8(i);
  }
  return value >>> 0;
}

export function formatHex(v, byteLength = 1) {
  const value = Buffer.isBuffer(v) ? toIntBE(v) : v;
  return `0x${value.toString(16).padStart(2 * byteLength, '0')}`;
}
