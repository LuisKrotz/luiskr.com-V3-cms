/**
 * @file media-convert/files.ts — drop/input file collection + byte formatting.
 */

import { CHAR_STRINGS } from '@core/tokens/strings/chars.js'
import { TYPE_STRINGS } from '@core/tokens/strings/types.js'
import type { CmsMediaConverter } from './CmsMediaConverter.js'
import { isMediaPath } from './exts.js'

/**
 * Recursive async generator over a dropped FileSystemEntry — a folder
 * drop yields one {file, rel} per descendant, preserving the relative
 * path so the server rebuilds the same tree inside the ZIP. Directory
 * readers return entries in batches of ≤100, so the do/while drains
 * until an empty batch signals the end.
 */
export async function* traverseEntry(
  entry: FileSystemEntry,
  prefix: string = CHAR_STRINGS.EMPTY
): AsyncGenerator<{ file: File; rel: string }> {
  if (entry.isFile) {
    const file = await new Promise<File>((res, rej) =>
      (entry as FileSystemFileEntry).file(res, rej)
    )
    yield { file, rel: prefix + file.name }
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader()
    let batch: FileSystemEntry[]

    do {
      batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej))
      for (const e of batch) yield* traverseEntry(e, `${prefix}${entry.name}/`)
    } while (batch.length)
  }
}

/** Humanizes a byte count — MB above 1MB (1 decimal), KB below (min 1KB so 0-byte files don't print "0 KB"). */
export const fmtBytes = (n: number): string =>
  n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`

/**
 * Collects a drag-drop payload into the queue — prefers the
 * `webkitGetAsEntry` path so a dropped folder recursively yields
 * `{file, rel}` per descendant (preserving the tree the server rebuilds
 * inside the ZIP); falls back to flat `dataTransfer.files` when entries
 * aren't available. `isMediaPath` filters out non-media files.
 */
export async function collectDrop(
  host: CmsMediaConverter,
  dataTransfer: DataTransfer
): Promise<void> {
  const items = Array.from(dataTransfer.items || [])

  if (items.length && typeof items[0].webkitGetAsEntry === TYPE_STRINGS.FUNCTION) {
    const entries = items
      .map((i) => i.webkitGetAsEntry())
      .filter((e): e is FileSystemEntry => Boolean(e))

    for (const entry of entries) {
      for await (const f of traverseEntry(entry)) {
        if (isMediaPath(f.rel)) host.queue.push(f)
      }
    }
    return
  }

  for (const file of Array.from(dataTransfer.files || [])) {
    const rel = file.webkitRelativePath || file.name

    if (isMediaPath(rel)) host.queue.push({ file, rel })
  }
}

/**
 * Collects a `<input type=file>` selection — `webkitRelativePath`
 * preserves subfolder structure when the picker was given a directory;
 * otherwise the bare filename is the rel path. Same `isMediaPath` filter.
 * @param host — the host component whose `queue` receives the items
 * @param input — the file input element that fired change
 */
export function collectInput(host: CmsMediaConverter, input: HTMLInputElement): void {
  for (const file of Array.from(input.files || [])) {
    const rel = file.webkitRelativePath || file.name

    if (isMediaPath(rel)) host.queue.push({ file, rel })
  }
}
