/**
 * Minimal, dependency-free ZIP writer (Sprint 64O) — store method (no
 * compression), suitable for packaging images + JSON/text on the server.
 * Deterministic given the same entries. No external packages.
 */

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Build a ZIP archive (store method) from the given entries. */
export function buildZip(entries: ZipEntry[]): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  const u16 = (n: number) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
  const u32 = (n: number) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    // Local file header
    const local = concat([
      u32(0x04034b50),
      u16(20), // version needed
      u16(0), // flags
      u16(0), // method = store
      u16(0), // mod time
      u16(0), // mod date
      u32(crc),
      u32(size), // compressed
      u32(size), // uncompressed
      u16(nameBytes.length),
      u16(0), // extra length
      nameBytes,
      entry.data,
    ]);
    chunks.push(local);

    // Central directory record
    central.push(
      concat([
        u32(0x02014b50),
        u16(20), // version made by
        u16(20), // version needed
        u16(0), // flags
        u16(0), // method
        u16(0), // mod time
        u16(0), // mod date
        u32(crc),
        u32(size),
        u32(size),
        u16(nameBytes.length),
        u16(0), // extra
        u16(0), // comment
        u16(0), // disk
        u16(0), // internal attrs
        u32(0), // external attrs
        u32(offset), // local header offset
        nameBytes,
      ])
    );

    offset += local.length;
  }

  const centralBytes = concat(central);
  const eocd = concat([
    u32(0x06054b50),
    u16(0), // disk
    u16(0), // cd start disk
    u16(entries.length),
    u16(entries.length),
    u32(centralBytes.length),
    u32(offset), // cd offset
    u16(0), // comment length
  ]);

  return concat([...chunks, centralBytes, eocd]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}
