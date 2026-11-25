import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { Color } from 'three'
import { pillarColor } from '../src/pillarColor.js'

const pillar = fs.readFileSync(new URL('../src/components/LightPillar.jsx', import.meta.url), 'utf8').replaceAll('\r\n', '\n')

test('the compact renderer preserves the exact original pillar fragment algorithm', () => {
  const shader = pillar.match(/const fragmentShader = `([\s\S]*?)`;/)?.[1]
  assert.ok(shader)
  const original = shader.replace(/^#version 300 es/, '')
    .replace('in vec2 vUv;\n      out vec4 fragColor;', 'varying vec2 vUv;')
    .replace('fragColor = vec4(result, 1.0);', 'gl_FragColor = vec4(result, 1.0);')
  assert.equal(createHash('sha256').update(original.replace(/[ \t]+$/gm, '')).digest('hex'), '0b2a39d8ea9c13f16a643132e397dc6a5253ad3969c89a4fc3a0e0ffa9bc3b4a')
})

test('the original linear shader colors remain unchanged without shipping the large 3D library', () => {
  for (const hex of ['#5227FF', '#FF9FFC', '#FFFFFF', '#000000', '#123456', '#0a0b0c', '#fff']) {
    const expected = new Color(hex)
    const actual = pillarColor(hex)
    ;[expected.r, expected.g, expected.b].forEach((channel, index) => assert.ok(Math.abs(channel - actual[index]) < 1e-12, hex))
  }
  assert.ok(!/from ['"]three['"]/.test(pillar))
})

test('required visual code stays within the reduced cold-entry budget', () => {
  const html = fs.readFileSync(new URL('../dist-github/index.html', import.meta.url), 'utf8')
  assert.ok(gzipSync(html).length < 255000, 'Initial shell and all original backgrounds should remain below 255 KB gzip')
  const assets = fs.readdirSync(new URL('../dist-github/assets/', import.meta.url)).filter(name => name.endsWith('.js'))
  assert.equal(assets.length, 1, 'First entry must not depend on another effect script request')
})
