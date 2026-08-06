/**
 * One-shot media fetcher. Not shipped in the app — run it by hand:
 *
 *   npx tsx scripts/fetch-media.ts
 *
 * Downloads one demo GIF per exercise into assets/exercises/<id>.gif and
 * regenerates src/media.ts. The app never calls the API; it only reads the
 * bundled assets, so it still works offline and needs no key.
 *
 * Source: https://oss.exercisedb.dev — the keyless open-source ExerciseDB host.
 */
import { setDefaultAutoSelectFamily } from 'node:net'
import { setDefaultResultOrder } from 'node:dns'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { allExercises } from '../src/program'

// ponytail: prefer IPv4. Some networks (including the one this was written on)
// advertise AAAA records that blackhole, and Node does not fall back the way
// curl does. Drop these two lines if IPv6 is ever genuinely wanted.
setDefaultAutoSelectFamily(false)
setDefaultResultOrder('ipv4first')

const API = 'https://oss.exercisedb.dev/api/v1/exercises'
const OUT_DIR = join(import.meta.dirname, '..', 'assets', 'exercises')
const MEDIA_TS = join(import.meta.dirname, '..', 'src', 'media.ts')
// The host rate-limits hard and the catalogue is 60 pages, so keep it around.
// Delete this file to force a refresh.
const CACHE = join(import.meta.dirname, '..', '.exercisedb-cache.json')

type Remote = { exerciseId: string; name: string; gifUrl: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** The host returns 429 well before the catalogue is exhausted. */
async function get(url: string, attempt = 1): Promise<Response> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (res.status === 429 || res.status >= 500) {
    if (attempt > 6) throw new Error(`${url} -> ${res.status} after ${attempt} attempts`)
    const retryAfter = Number(res.headers.get('retry-after'))
    const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * 2 ** (attempt - 1)
    process.stdout.write(`\n  ${res.status}, waiting ${Math.round(wait / 1000)}s...`)
    await sleep(wait)
    return get(url, attempt + 1)
  }
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return res
}

/** ExerciseDB's ?search= is ignored and /search returns nothing, so page the lot. */
async function fetchCatalogue(): Promise<Remote[]> {
  if (existsSync(CACHE)) {
    const cached = JSON.parse(readFileSync(CACHE, 'utf8')) as Remote[]
    console.log(`  using ${cached.length} cached exercises (delete ${CACHE} to refresh)`)
    return cached
  }
  const out: Remote[] = []
  let cursor: string | undefined
  do {
    const res = await get(`${API}?limit=25${cursor ? `&cursor=${cursor}` : ''}`)
    const body = (await res.json()) as {
      data: Remote[]
      meta: { hasNextPage: boolean; nextCursor?: string }
    }
    out.push(...body.data)
    cursor = body.meta.hasNextPage ? body.meta.nextCursor : undefined
    process.stdout.write(`\r  fetched ${out.length} exercises`)
    await sleep(250) // stay under the limit rather than back off into it
  } while (cursor)
  process.stdout.write('\n')
  writeFileSync(CACHE, JSON.stringify(out))
  return out
}

/** Words that say nothing about which movement this is. */
const NOISE = new Set([
  'the', 'a', 'with', 'and', 'on', 'to', 'of', 'in', 'up', 'version',
  'light', 'heavy', 'machine', 'exercise', 'variation',
])

const tokens = (s: string) =>
  s
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !NOISE.has(t))

/**
 * Our names are gym shorthand ("T-Bar Row (Upper Back)"), theirs are verbose
 * ("barbell t-bar row"). Score on token overlap weighted toward covering OUR
 * tokens — a remote name with extra words is fine, a remote name missing our
 * distinguishing words is not.
 */
function score(mine: string[], theirs: string[]): number {
  if (mine.length === 0) return 0
  const theirSet = new Set(theirs)
  let hit = 0
  for (const t of mine) if (theirSet.has(t)) hit++
  const coverage = hit / mine.length
  // Tie-break toward the tersest remote name that still covers us.
  return coverage - theirs.length * 0.001
}

/**
 * Names our token scorer gets wrong or cannot know. Values are the exact
 * remote `name`. Verified against the catalogue by the run that produced them.
 */
const MANUAL: Record<string, string> = {}

async function download(url: string, dest: string) {
  const res = await get(url)
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
}

async function main() {
  console.log('Fetching exercise catalogue...')
  const catalogue = await fetchCatalogue()
  const indexed = catalogue.map((r) => ({ ...r, tokens: tokens(r.name) }))
  const byName = new Map(catalogue.map((r) => [r.name.toLowerCase(), r]))

  // Alternatives are logged under their own exercise_id, so they need art too.
  const wanted = [
    ...allExercises().map((e) => ({ id: e.id, name: e.name })),
    ...allExercises().flatMap((e) => e.alternatives ?? []),
  ]

  mkdirSync(OUT_DIR, { recursive: true })
  for (const f of readdirSync(OUT_DIR)) rmSync(join(OUT_DIR, f))

  const got: string[] = []
  const missed: string[] = []

  for (const { id, name } of wanted) {
    const manual = MANUAL[id] ? byName.get(MANUAL[id].toLowerCase()) : undefined
    if (MANUAL[id] && !manual) {
      missed.push(`${id} — manual override "${MANUAL[id]}" matches nothing`)
      continue
    }

    let best = manual
    let bestScore = manual ? 1 : 0
    if (!manual) {
      const mine = tokens(name)
      for (const remote of indexed) {
        const s = score(mine, remote.tokens)
        if (s > bestScore) {
          bestScore = s
          best = remote
        }
      }
    }

    // Below ~60% of our distinguishing words covered it is a different lift.
    if (!best || bestScore < 0.6) {
      missed.push(`${id} (${name}) — best ${best?.name ?? 'none'} @ ${bestScore.toFixed(2)}`)
      continue
    }

    try {
      await download(best.gifUrl, join(OUT_DIR, `${id}.gif`))
      got.push(id)
      console.log(`  ${id} <- "${best.name}" (${bestScore.toFixed(2)})`)
    } catch (e) {
      missed.push(`${id} — download failed: ${String(e)}`)
    }
  }

  writeFileSync(
    MEDIA_TS,
    `// Generated by scripts/fetch-media.ts. Do not edit by hand.
// Metro resolves require() statically, so this map lists only files that exist
// on disk — an exercise absent from it renders text only, never an error.
export const MEDIA: Record<string, number> = {
${got.map((id) => `  '${id}': require('../assets/exercises/${id}.gif'),`).join('\n')}
}
`,
  )

  console.log(`\n${got.length}/${wanted.length} exercises have media.`)
  if (missed.length) {
    console.log(`\nNo match — source these by hand into assets/exercises/<id>.gif:`)
    for (const m of missed) console.log(`  ${m}`)
    console.log(`\nThen add the correct remote name to MANUAL in this script and re-run.`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
