import { exec } from 'child_process'
import { promisify } from 'util'

const execute = promisify(exec)

/**
 *
 */
export async function excludes(baseRef: string): Promise<string[]> {
  const files = parseDiffNames(await getDiffNames(baseRef))
  return parseExcludes(await getExcludes(files))
}

/**
 *
 */
export async function size(
  baseRef: string,
  excludes: string[]
): Promise<{ size: number; includes: string[] }> {
  return parseSize(await getSize(baseRef, excludes))
}

/**
 *
 */
async function getDiffNames(baseRef: string): Promise<string> {
  const result = await execute(
    `git diff origin/${baseRef} HEAD --name-only --no-renames`
  )
  return result.stdout
}

/**
 *
 */
function parseDiffNames(input: string): string {
  return input
    .split(/\r?\n/)
    .filter(n => n.length > 0)
    .join(' ')
}

/**
 *
 */
async function getExcludes(files: string): Promise<string> {
  const result = await execute(
    `git check-attr linguist-generated linguist-vendored -- ${files}`
  )
  return result.stdout
}

/**
 *
 */
function parseExcludes(input: string): string[] {
  const excludes = input
    .split(/\r?\n/)
    .filter(a => a.endsWith(': set'))
    .map(a => a.split(':')[0])

  return [...new Set(excludes)]
}

/**
 *
 */
async function getSize(baseRef: string, excludes: string[]): Promise<string> {
  const skip = excludes.map(e => `:^${e}`).join(' ')
  const result = await execute(
    `git diff origin/${baseRef} HEAD --numstat --ignore-space-change -- . ${skip}`
  )

  return result.stdout
}

/**
 *
 */
function parseSize(input: string): { size: number; includes: string[] } {
  const data = input
    .split(/\r?\n/)
    .filter(c => c.length > 0)
    .map(c => {
      const parts = c.split(/\s+/)
      const added = parseInt(parts[0])
      const removed = parseInt(parts[1])

      return {
        added: isNaN(added) ? 0 : added,
        removed: isNaN(removed) ? 0 : removed,
        name: parts[2]
      }
    })

  return {
    size: data.reduce((t, d) => t + d.added + d.removed, 0),
    includes: data.map(d => d.name)
  }
}
