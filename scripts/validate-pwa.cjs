const fs = require('node:fs')
const assert = require('node:assert/strict')
const manifest = JSON.parse(fs.readFileSync('public/manifest.webmanifest','utf8'))
for (const field of ['id','name','short_name','description','start_url','scope','display','theme_color','background_color','orientation']) assert.ok(manifest[field], `Missing ${field}`)
assert.equal(manifest.display,'standalone')
assert.ok(manifest.start_url.startsWith(manifest.scope))
for (const size of [192,512]) for (const purpose of ['any','maskable']) {
  const icon = manifest.icons.find(i=>i.sizes===`${size}x${size}` && i.purpose===purpose)
  assert.ok(icon,`Missing ${size} ${purpose}`)
  const png=fs.readFileSync(`public${icon.src}`)
  assert.equal(png.readUInt32BE(16),size); assert.equal(png.readUInt32BE(20),size)
}
assert.deepEqual(manifest, JSON.parse(fs.readFileSync('public/manifest.json','utf8')))
console.log('Manifest fields, scope, legacy alias and four PNG dimensions verified.')
