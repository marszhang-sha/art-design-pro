import { SURVEY_VERSION, surveyIntentionInput, type CsoState, type Intention } from './domain'

export const EXAMPLES_BACKUP_KEY = 'asieris-cso-prototype-v1-before-examples-20261008'
const regions = [
  ['浙江省', '杭州市'],
  ['浙江省', '宁波市'],
  ['安徽省', '合肥市'],
  ['福建省', '福州市'],
  ['福建省', '厦门市'],
  ['广东省', '广州市'],
  ['广东省', '深圳市'],
  ['湖南省', '长沙市'],
  ['湖北省', '武汉市'],
  ['四川省', '成都市'],
  ['重庆市', '重庆市'],
  ['陕西省', '西安市'],
  ['山东省', '济南市'],
  ['河南省', '郑州市'],
  ['江西省', '南昌市'],
  ['广西壮族自治区', '南宁市'],
  ['贵州省', '贵阳市'],
  ['云南省', '昆明市'],
  ['辽宁省', '大连市'],
  ['山东省', '青岛市']
]
const scales = ['500万以下', '500万-1000万', '1000万-5000万', '5000万-1亿', '1亿以上']
const sales = ['3800000', '8000000', '26000000', '68000000', '125000000']

function example(serial: number): Intention {
  const index = serial - 1
  const [province, city] = regions[index % regions.length]
  const name =
    '示例' + city.replace(/市$/, '') + String(serial).padStart(2, '0') + '医药服务有限公司'
  const result = serial % 5 === 0 ? '不合作' : serial % 3 === 0 ? '合作' : '待洽谈'
  const submittedAt = '2026-10-' + String(2 + (index % 7)).padStart(2, '0') + 'T01:30:00.000Z'
  const { surveyAnswers: answers, ...input } = surveyIntentionInput({
    province,
    city,
    company: name,
    principal: '示例负责人' + serial,
    companyScale: scales[index % scales.length],
    directTeam: String(3 + index * 2),
    recruitmentTeam: String(1 + (index % 8)),
    products: index % 2 ? '妇科诊疗产品、HPV检测产品' : '妇科处方药、女性健康相关产品',
    coveredCities: city + '及周边区县',
    departments: index % 2 ? '妇科、检验科' : '妇科、妇科肿瘤科、门诊部',
    hospitalCount: String(8 + index * 3),
    hospitals: city + '示例医院\n' + city + '示例妇幼医院',
    experts: '示例专家' + serial + '｜' + city + '示例医院妇科',
    gynecologySales: String(1200000 + index * 320000),
    sales2025: sales[index % sales.length],
    contractQuantity: String(600 + index * 300),
    productManager: index % 3 ? '有，1名产品经理、2名讲师' : '暂无专职产品经理，由区域负责人兼任',
    cooperationRegion: province === city ? city + '部分区县' : province + city,
    contactDetails:
      index % 2
        ? '1380001' + String(serial).padStart(4, '0')
        : 'sample' + serial + '@example.invalid'
  })
  return {
    ...input,
    id: 'sample-intention-20261008-' + String(serial).padStart(3, '0'),
    result,
    partnerId: '',
    questionnaire: { version: SURVEY_VERSION, submittedAt, answers: answers! },
    notes:
      result === '待洽谈'
        ? []
        : [
            {
              id: 'event001',
              at: submittedAt,
              actor: 'Admin',
              text:
                result === '合作'
                  ? '已完成初步沟通，确认合作意向，继续对接合作范围。'
                  : '当前区域合作规划暂不匹配，暂不合作。'
            }
          ]
  }
}

/** Add only the requested examples once; never refill deleted records on refresh. */
export function prepareIntentionExamples(state: CsoState): CsoState {
  if (state.maintenance?.intentionExamples20261008) return state
  const needed = Math.max(0, 20 - state.intentions.length)
  const occupied = new Set([
    ...state.intentions.map((item) => item.id),
    ...(state.intentionRecycleBin ?? []).map((item) => item.record.id)
  ])
  const added: Intention[] = []
  for (let serial = 1; added.length < needed; serial++) {
    const item = example(serial)
    if (!occupied.has(item.id)) {
      added.push(item)
      occupied.add(item.id)
    }
  }
  return {
    ...state,
    intentions: [...state.intentions, ...added],
    maintenance: {
      ...state.maintenance,
      intentionExamples20261008: {
        appliedAt: new Date().toISOString(),
        addedIds: added.map((item) => item.id)
      }
    }
  }
}

export function persistIntentionExamples(
  state: CsoState,
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  storageKey: string
): CsoState {
  const next = prepareIntentionExamples(state)
  if (next === state) return state
  const saved = storage.getItem(storageKey)
  if (saved && !storage.getItem(EXAMPLES_BACKUP_KEY)) storage.setItem(EXAMPLES_BACKUP_KEY, saved)
  storage.setItem(storageKey, JSON.stringify(next))
  return next
}
