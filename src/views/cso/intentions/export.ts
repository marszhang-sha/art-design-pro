import * as XLSX from 'xlsx'
import { type Intention } from '../domain'

export interface IntentionExportColumn {
  prop: string
  label: string
}
export const INTENTION_EXPORT_COLUMNS: IntentionExportColumn[] = [
  { prop: 'sequence', label: '序号' },
  { prop: 'name', label: '代理商公司' },
  { prop: 'province', label: '省份' },
  { prop: 'city', label: '城市' },
  { prop: 'contact', label: '负责人' },
  { prop: 'phone', label: '联系方式' },
  { prop: 'scale', label: '公司规模' },
  { prop: 'area', label: '意向合作区域' },
  { prop: 'resources', label: '团队' },
  { prop: 'hospitalCount', label: '已开发医院数' },
  { prop: 'result', label: '合作结果' }
]
export function buildIntentionWorkbook(
  records: (Intention & { sequence?: number })[],
  columns = INTENTION_EXPORT_COLUMNS
) {
  if (!records.length) throw new Error('请先选择要导出的意向')
  const book = XLSX.utils.book_new()
  const rows = records.map((item, index) => {
    const answers = item.questionnaire?.answers
    const values: Record<string, string | number> = {
      sequence: item.sequence ?? index + 1,
      name: item.name,
      province: item.province,
      city: item.city,
      contact: item.contact,
      phone: item.phone,
      scale: answers?.companyScale || '—',
      area: answers?.cooperationRegion || item.province + ' / ' + item.city,
      resources: answers
        ? '自营 ' +
          (answers.directTeam || '—') +
          '人 / 招商 ' +
          (answers.recruitmentTeam || '—') +
          '人'
        : '—',
      hospitalCount: answers?.hospitalCount || '—',
      result: item.result === '待洽谈' ? '待约谈' : item.result
    }
    return columns.map((column) => values[column.prop] ?? '')
  })
  const sheet = XLSX.utils.aoa_to_sheet([columns.map((column) => column.label), ...rows])
  sheet['!autofilter'] = { ref: sheet['!ref']! }
  sheet['!cols'] = columns.map((column) => ({
    wch: ['name', 'area', 'resources'].includes(column.prop)
      ? 34
      : column.prop === 'phone'
        ? 28
        : 18
  }))
  XLSX.utils.book_append_sheet(book, sheet, '合作意向池')
  return book
}

export function encodeIntentionWorkbook(workbook: XLSX.WorkBook): Uint8Array {
  // SheetJS exposes CFB through its ESM namespace and its CommonJS default export.
  const cfb = XLSX.CFB ?? Reflect.get(XLSX, 'default')?.CFB
  const archive = cfb.read(
    new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })),
    { type: 'buffer' }
  )
  const styles = cfb.find(archive, '/xl/styles.xml')
  if (!styles) throw new Error('Excel格式生成失败')
  let xml = new TextDecoder().decode(styles.content)
  xml = xml.replace(/<name val="Calibri"\/>/g, '<name val="Microsoft YaHei"/>')
  xml = xml.replace(/<cellXfs\b[^>]*>[\s\S]*?<\/cellXfs>/g, (section: string) =>
    section.replace(
      /<xf\b([^>]*?)\/>/g,
      '<xf$1 applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
    )
  )
  cfb.utils.cfb_add(archive, '/xl/styles.xml', new TextEncoder().encode(xml))
  return new Uint8Array(cfb.write(archive, { type: 'buffer', fileType: 'zip', compression: true }))
}

export function exportIntentionDetails(
  records: (Intention & { sequence?: number })[],
  columns?: IntentionExportColumn[]
) {
  const bytes = encodeIntentionWorkbook(buildIntentionWorkbook(records, columns))
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' })
    .format(new Date())
    .replaceAll('-', '')
  const url = URL.createObjectURL(
    new Blob([bytes.slice().buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
  )
  const link = document.createElement('a')
  link.href = url
  link.download = '合作意向明细_' + date + '.xlsx'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10000)
}
