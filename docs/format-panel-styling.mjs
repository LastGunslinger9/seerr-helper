/**
 * format-panel-styling.mjs
 * Parses the raw DevTools console output from panel-styling.txt
 * and writes a structured, readable Markdown reference.
 *
 * Usage: node docs/format-panel-styling.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const INPUT  = path.join(__dir, 'panel-styling.txt')
const OUTPUT = path.join(__dir, 'panel-styling.md')

// ── Normalisation ────────────────────────────────────────────────────────────

// Strip VM prefix and return { type: 'selector'|'prop'|'skip', indent, content }
function parseLine(raw) {
  // Selector lines: "VM60440:40   sel..."
  const selMatch = raw.match(/^VM\d+:40(\s*)(.+)\r?$/)
  if (selMatch) return { type: 'selector', indent: selMatch[1], content: selMatch[2].trim() }

  // First prop of a block: "VM60440:41   prop: val"
  const firstProp = raw.match(/^VM\d+:41(\s*)([a-zA-Z]+):\s(.+)\r?$/)
  if (firstProp) return { type: 'prop', indent: firstProp[1], prop: firstProp[2], val: firstProp[3].trim() }

  // Continuation prop lines (no VM prefix): "    prop: val"
  const contProp = raw.match(/^(\s+)([a-zA-Z]+):\s(.+)\r?$/)
  if (contProp) return { type: 'prop', indent: contProp[1], prop: contProp[2], val: contProp[3].trim() }

  return { type: 'skip' }
}

// Convert camelCase prop name to kebab-case CSS property
function toKebab(prop) {
  return prop.replace(/([A-Z])/g, m => '-' + m.toLowerCase())
}

// Simplify verbose computed values for readability
function simplifyValue(prop, val) {
  // Collapse full background shorthand to just the color/url part
  if (prop === 'background') {
    const urlMatch = val.match(/url\("([^"]+)"\)/)
    if (urlMatch) return `url("${path.basename(urlMatch[1])}")`
    const colorMatch = val.match(/^(rgba?\([^)]+\)|#[0-9a-f]+)/i)
    return colorMatch ? colorMatch[1] : val
  }
  // Convert rgb() to hex where possible
  const rgbMatch = val.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)
  if (rgbMatch) {
    const hex = [rgbMatch[1], rgbMatch[2], rgbMatch[3]]
      .map(n => parseInt(n).toString(16).padStart(2, '0'))
      .join('')
    return `#${hex}`
  }
  return val
}

// Only omit props that are purely inherited noise with no visual signal here
const BORING_PROPS = new Set([
  'flexDirection', 'flexWrap', 'transition',
  'border', 'borderTop', 'borderRight', 'borderLeft',
  'background', // redundant — backgroundColor is cleaner
])

// Only skip values that are default/noise
const BORING_VALS = new Set([
  'rgba(0, 0, 0, 0)',
  '0px none rgb(187, 204, 221)', '0px none rgb(153, 170, 187)',
  '0px none rgba(0, 0, 0, 0)',
  'all', 'content-box', '1', '400',
  'GraphikWeb, -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", Meiryo, sans-serif, ColorEmoji',
])

function isInteresting(prop, val) {
  if (BORING_PROPS.has(prop)) return false
  if (BORING_VALS.has(val)) return false
  return true
}

// ── Parser ───────────────────────────────────────────────────────────────────

function parse(raw) {
  const lines = raw.split('\n')
  const nodes = []
  let current = null
  let started = false

  for (const line of lines) {
    const parsed = parseLine(line)
    if (parsed.type === 'skip') continue

    if (!started) {
      if (parsed.type === 'selector' && parsed.content.startsWith('ul.js-actions-panel')) {
        started = true
      } else {
        continue
      }
    }

    if (parsed.type === 'selector') {
      const depth = Math.floor(parsed.indent.length / 2)
      current = { selector: parsed.content, depth, props: [] }
      nodes.push(current)
    } else if (parsed.type === 'prop' && current) {
      const { prop, val } = parsed
      if (isInteresting(prop, val)) {
        current.props.push({ prop: toKebab(prop), val: simplifyValue(prop, val) })
      }
    }
  }

  return nodes
}

// ── Markdown renderer ────────────────────────────────────────────────────────

function render(nodes) {
  const lines = [
    '# Letterboxd Sidebar Panel — Computed Styles Reference',
    '',
    '> Auto-generated from DevTools computed styles. Values simplified for readability.',
    '> Default/inherited/noisy values omitted.',
    '',
  ]

  for (const { selector, depth, props } of nodes) {
    const headingLevel = Math.min(depth + 2, 6) // h2–h6
    const heading = '#'.repeat(headingLevel)
    const indent = '  '.repeat(Math.max(0, depth - 1))

    lines.push(`${heading} \`${selector}\``)
    lines.push('')

    if (props.length === 0) {
      lines.push(`${indent}_(no notable styles)_`)
    } else {
      lines.push('```css')
      for (const { prop, val } of props) {
        lines.push(`${prop}: ${val};`)
      }
      lines.push('```')
    }
    lines.push('')
  }

  return lines.join('\n')
}

// ── Main ─────────────────────────────────────────────────────────────────────

const raw = fs.readFileSync(INPUT, 'utf8')
const nodes = parse(raw)
const md = render(nodes)
fs.writeFileSync(OUTPUT, md, 'utf8')
console.log(`Written ${nodes.length} elements to ${OUTPUT}`)
