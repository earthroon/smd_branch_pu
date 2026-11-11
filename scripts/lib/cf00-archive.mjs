import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

export class Cf00ArchiveError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.code = code;
  }
}

const failure = (code, detail) => { throw new Cf00ArchiveError(code, detail); };
const U32_MAX = 0xffffffff;
const MAX_TOTAL_BYTES = 128 * 1024 * 1024;
const MAX_ENTRY_BYTES = 16 * 1024 * 1024;
const MAX_ENTRIES = 10000;

function crc32(data) {
  let crc = U32_MAX;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ U32_MAX) >>> 0;
}

function readU16(bytes, offset) {
  if (offset < 0 || offset + 2 > bytes.length) failure('CF00_UNSAFE_ARCHIVE_ENTRY', 'u16 outside archive');
  return bytes.readUInt16LE(offset);
}

function readU32(bytes, offset) {
  if (offset < 0 || offset + 4 > bytes.length) failure('CF00_UNSAFE_ARCHIVE_ENTRY', 'u32 outside archive');
  return bytes.readUInt32LE(offset);
}

function ensureArchivePath(name, directory) {
  if (name.includes('\\') || name.includes('\0') || name.startsWith('/') || /^[a-z]:/i.test(name)) {
    failure('CF00_UNSAFE_ARCHIVE_ENTRY', `absolute or invalid filename: ${name}`);
  }
  const segments = name.split('/');
  if (segments.some((part, index) => part === '..' || (part === '' && index < segments.length - 1))) {
    failure('CF00_UNSAFE_ARCHIVE_ENTRY', `traversal or invalid segment: ${name}`);
  }
  if (name.normalize('NFC') !== name || (directory ? !name.endsWith('/') : name.endsWith('/'))) {
    failure('CF00_UNSAFE_ARCHIVE_ENTRY', `noncanonical filename: ${name}`);
  }
}

// Small, strict ZIP reader. No extraction or shell command, validates central and local metadata.
// ZIP64, encryption, symlinks and unsupported methods fail closed. Central CRC covers data-descriptor entries.
export function readSourceArchive(path) {
  const archive = readFileSync(path);
  const minEocd = Math.max(0, archive.length - 65557);
  let eocd = -1;
  for (let at = archive.length - 22; at >= minEocd; at -= 1) {
    if (readU32(archive, at) === 0x06054b50 && at + 22 + readU16(archive, at + 20) === archive.length) {
      eocd = at;
      break;
    }
  }
  if (eocd < 0) failure('CF00_UNSAFE_ARCHIVE_ENTRY', 'ZIP central directory not found');
  const disk = readU16(archive, eocd + 4);
  const centralDisk = readU16(archive, eocd + 6);
  const diskCount = readU16(archive, eocd + 8);
  const count = readU16(archive, eocd + 10);
  const centralSize = readU32(archive, eocd + 12);
  const centralOffset = readU32(archive, eocd + 16);
  if (disk || centralDisk || count !== diskCount || count > MAX_ENTRIES ||
      count === 0xffff || centralOffset === U32_MAX || centralSize === U32_MAX ||
      centralOffset + centralSize > eocd) {
    failure('CF00_UNSAFE_ARCHIVE_ENTRY', 'unsupported multidisk/ZIP64/invalid central directory');
  }
  const seen = new Set();
  const files = new Map();
  let position = centralOffset;
  let totalSize = 0;
  for (let item = 0; item < count; item += 1) {
    if (readU32(archive, position) !== 0x02014b50 || position + 46 > archive.length) {
      failure('CF00_UNSAFE_ARCHIVE_ENTRY', `central entry ${item} missing`);
    }
    const flags = readU16(archive, position + 8);
    const method = readU16(archive, position + 10);
    const declaredCrc = readU32(archive, position + 16);
    const compressedSize = readU32(archive, position + 20);
    const uncompressedSize = readU32(archive, position + 24);
    const filenameLength = readU16(archive, position + 28);
    const extraLength = readU16(archive, position + 30);
    const commentLength = readU16(archive, position + 32);
    const diskStart = readU16(archive, position + 34);
    const externalAttributes = readU32(archive, position + 38);
    const localOffset = readU32(archive, position + 42);
    const next = position + 46 + filenameLength + extraLength + commentLength;
    if (next > archive.length || compressedSize === U32_MAX || uncompressedSize === U32_MAX ||
        localOffset === U32_MAX || diskStart || (flags & 0x1) || (flags & 0x40) ||
        !(method === 0 || method === 8)) {
      failure('CF00_UNSAFE_ARCHIVE_ENTRY', `unsupported ZIP entry ${item}`);
    }
    const name = archive.subarray(position + 46, position + 46 + filenameLength).toString('utf8');
    const directory = name.endsWith('/');
    ensureArchivePath(name, directory);
    const mode = (externalAttributes >>> 16) & 0xf000;
    if (mode === 0xa000 || (mode && mode !== 0x8000 && mode !== 0x4000)) {
      failure('CF00_UNSAFE_ARCHIVE_ENTRY', `non-regular ZIP entry: ${name}`);
    }
    const folded = name.toLocaleLowerCase('en-US');
    if (seen.has(folded)) failure('CF00_UNSAFE_ARCHIVE_ENTRY', `duplicate entry: ${name}`);
    seen.add(folded);
    position = next;
    if (directory) continue;
    totalSize += uncompressedSize;
    if (uncompressedSize > MAX_ENTRY_BYTES || totalSize > MAX_TOTAL_BYTES) {
      failure('CF00_UNSAFE_ARCHIVE_ENTRY', 'archive decompression size budget exceeded');
    }
    if (readU32(archive, localOffset) !== 0x04034b50) {
      failure('CF00_UNSAFE_ARCHIVE_ENTRY', `local entry missing: ${name}`);
    }
    const localFlags = readU16(archive, localOffset + 6);
    const localMethod = readU16(archive, localOffset + 8);
    const localNameLength = readU16(archive, localOffset + 26);
    const localExtraLength = readU16(archive, localOffset + 28);
    const localName = archive.subarray(localOffset + 30, localOffset + 30 + localNameLength).toString('utf8');
    if (localName !== name || localMethod !== method || localFlags !== flags) {
      failure('CF00_UNSAFE_ARCHIVE_ENTRY', `central/local mismatch: ${name}`);
    }
    const contentStart = localOffset + 30 + localNameLength + localExtraLength;
    const contentEnd = contentStart + compressedSize;
    if (contentStart < 0 || contentEnd > centralOffset) {
      failure('CF00_UNSAFE_ARCHIVE_ENTRY', `invalid content range: ${name}`);
    }
    const compressed = archive.subarray(contentStart, contentEnd);
    let bytes;
    try {
      bytes = method === 0 ? Buffer.from(compressed) : inflateRawSync(compressed, { maxOutputLength: MAX_ENTRY_BYTES });
    } catch {
      failure('CF00_UNSAFE_ARCHIVE_ENTRY', `deflate error: ${name}`);
    }
    if (bytes.length !== uncompressedSize || crc32(bytes) !== declaredCrc) {
      failure('CF00_UNSAFE_ARCHIVE_ENTRY', `CRC/size mismatch: ${name}`);
    }
    files.set(name, bytes);
  }
  if (position !== centralOffset + centralSize) failure('CF00_UNSAFE_ARCHIVE_ENTRY', 'central directory size mismatch');
  return { archive, files };
}
