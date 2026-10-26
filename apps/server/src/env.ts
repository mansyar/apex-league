/**
 * Boot configuration. The database path arrives through the environment so a
 * container can point it at a persistent volume; the default is a file beside
 * the process's working directory, which is what a developer running
 * `bun run dev` in `apps/server` expects.
 */
export const DEFAULT_DATABASE_PATH = "./data/apex.sqlite"

/**
 * The environment this module reads. Passing it in rather than reaching for
 * `process.env` is what makes the boot path testable. It stays a plain string
 * map so `process.env` satisfies it without a cast.
 */
export type BootEnv = Record<string, string | undefined>

/**
 * The configured database path, trimmed, or the local development default.
 * A blank value counts as unset: `DATABASE_PATH=` in a compose file must not
 * resolve to the working directory.
 */
export function databasePath(env: BootEnv): string {
  const configured = env.DATABASE_PATH?.trim()
  return configured ? configured : DEFAULT_DATABASE_PATH
}
