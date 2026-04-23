import { describe, expect, it } from 'vitest'
import { safeParseAiJson } from '../openai'

describe('safeParseAiJson', () => {
  it('returns null on null/empty input', () => {
    expect(safeParseAiJson(null)).toBeNull()
    expect(safeParseAiJson('')).toBeNull()
    expect(safeParseAiJson(undefined)).toBeNull()
  })

  it('parses plain JSON', () => {
    expect(safeParseAiJson('{"a":1}')).toEqual({ a: 1 })
  })

  it('strips ```json fences and parses', () => {
    const wrapped = '```json\n{"hello":"world"}\n```'
    expect(safeParseAiJson(wrapped)).toEqual({ hello: 'world' })
  })

  it('strips bare ``` fences', () => {
    expect(safeParseAiJson('```\n{"x":2}\n```')).toEqual({ x: 2 })
  })

  it('returns null on malformed JSON instead of throwing', () => {
    expect(safeParseAiJson('not really json {')).toBeNull()
  })
})
