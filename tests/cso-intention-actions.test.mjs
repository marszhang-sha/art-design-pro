import test from 'node:test'
import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import { createSeedState, applyCommand } from '../src/views/cso/domain.ts'
import {
  buildIntentionWorkbook,
  encodeIntentionWorkbook
} from '../src/views/cso/intentions/export.ts'

test('batch deletion archives full records while preserving linked business and the source', () => {
  const source = createSeedState()
  const before = JSON.stringify(source)
  const next = applyCommand(
    source,
    { role: 'admin' },
    { type: 'deleteIntentions', ids: ['i001', 'i002', 'i001'] }
  )
  assert.equal(next.intentions.length, 0)
  assert.equal(next.intentionRecycleBin.length, 2)
  assert.deepEqual(
    next.intentionRecycleBin.map((item) => item.record),
    source.intentions
  )
  assert.deepEqual(next.partners, source.partners)
  assert.deepEqual(next.contracts, source.contracts)
  assert.deepEqual(next.deposits, source.deposits)
  assert.equal(JSON.stringify(source), before)
  assert.equal(JSON.parse(JSON.stringify(next)).intentionRecycleBin.length, 2)
})

test('empty, stale and unauthorized batch deletion cannot partially change records', () => {
  const source = createSeedState()
  const before = JSON.stringify(source)
  for (const ids of [[], ['i001', 'missing']]) {
    assert.throws(() => applyCommand(source, { role: 'admin' }, { type: 'deleteIntentions', ids }))
  }
  for (const identity of [null, { role: 'agent', partnerId: 'p001' }]) {
    assert.throws(
      () => applyCommand(source, identity, { type: 'deleteIntentions', ids: ['i001'] }),
      /权限/
    )
  }
  assert.equal(JSON.stringify(source), before)
})

test('list Excel contains displayed business fields in one sheet and preserves text and selected rows', () => {
  const source = createSeedState()
  source.intentions[0].phone = '0013800000001'
  source.intentions[0].result = '待洽谈'
  source.intentions[0].name = '=1+1'
  const bytes = encodeIntentionWorkbook(
    buildIntentionWorkbook([{ ...source.intentions[0], sequence: 7 }])
  )
  const book = XLSX.read(bytes, { type: 'array' })
  assert.deepEqual(book.SheetNames, ['合作意向池'])
  const sheet = book.Sheets[book.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  assert.deepEqual(rows[0], [
    '序号',
    '代理商公司',
    '省份',
    '城市',
    '负责人',
    '联系方式',
    '公司规模',
    '意向合作区域',
    '团队',
    '已开发医院数',
    '合作结果'
  ])
  assert.equal(rows.length, 2)
  assert.equal(rows[1][0], 7)
  assert.equal(rows[1][1], '=1+1')
  assert.equal(rows[1][5], '0013800000001')
  assert.equal(rows[1][10], '待约谈')
  assert.ok(!JSON.stringify(rows).includes(source.intentions[0].questionnaire.answers.experts))
  assert.ok(!JSON.stringify(rows).includes(source.intentions[1].name))
  for (const [address, cell] of Object.entries(sheet))
    if (!address.startsWith('!')) assert.equal(cell.f, undefined)
  const cfb = XLSX.CFB ?? Reflect.get(XLSX, 'default').CFB
  const archive = cfb.read(bytes, { type: 'buffer' })
  const styles = new TextDecoder().decode(cfb.find(archive, '/xl/styles.xml').content)
  assert.match(styles, /Microsoft YaHei/)
})

test('export honors visible column order and handles legacy intentions in the same sheet', () => {
  const records = createSeedState().intentions
  delete records[1].questionnaire
  const book = buildIntentionWorkbook(records, [
    { prop: 'result', label: '合作结果' },
    { prop: 'name', label: '代理商公司' },
    { prop: 'area', label: '意向合作区域' }
  ])
  assert.equal(book.SheetNames.length, 1)
  const rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1 })
  assert.deepEqual(rows[0], ['合作结果', '代理商公司', '意向合作区域'])
  assert.equal(rows.length, 3)
  assert.equal(rows[2][1], records[1].name)
  assert.throws(() => buildIntentionWorkbook([]), /选择/)
})
