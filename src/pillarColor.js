// Preserve the original renderer's sRGB-to-linear shader uniform values.
export function pillarColor(hex) {
  let value = String(hex).replace(/^#/, '')
  if (value.length === 3) value = [...value].map(channel => channel + channel).join('')
  if (!/^[a-f\d]{6}$/i.test(value)) return [1, 1, 1]
  return [0, 2, 4].map(offset => {
    const channel = parseInt(value.slice(offset, offset + 2), 16) / 255
    return channel < .04045 ? channel * .0773993808 : Math.pow(channel * .9478672986 + .0521327014, 2.4)
  })
}
