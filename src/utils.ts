export const uuidv4NoDashes = () => {
  return crypto.randomUUID().replaceAll('-', '')
}

export const hashString = (t: string) => {
  let e = 0,
    n = 0
  for (e = 0, n = t.length - 1; n >= 0; n--) {
    let i = t.charCodeAt(n)
    e =
      0 !== (i = 266338304 & (e = ((e << 6) & 268435455) + i + (i << 14)))
        ? e ^ (i >> 21)
        : e
  }
  return e
}

export const getRegionPrefix = (prefix?: string) => {
  return prefix?.length ? `-${prefix}` : ''
}
