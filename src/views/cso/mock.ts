export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info'

export interface Partner {
  id: string
  name: string
  code: string
  type: string
  bu: string[]
  products: string[]
  region: string
  level: string
  contractStatus: string
  qualificationStatus: string
  relationshipStatus: string
  risk: string
  sales: number
  rebate: number
  evidenceCoverage: number
  representatives: number
  updatedAt: string
}

export const partners: Partner[] = [
  {
    id: 'cso-00138',
    name: '上海XX医药推广有限公司',
    code: 'CSO000138',
    type: '有限责任公司',
    bu: ['BU A', 'BU B'],
    products: ['Product A', 'Product B', 'Product C'],
    region: '华东、华南',
    level: 'A级',
    contractStatus: '生效中',
    qualificationStatus: '有效',
    relationshipStatus: '正常合作',
    risk: '低风险',
    sales: 12600000,
    rebate: 1180000,
    evidenceCoverage: 96,
    representatives: 26,
    updatedAt: '2026-08-20'
  },
  {
    id: 'cso-00217',
    name: '杭州XX市场服务有限公司',
    code: 'CSO000217',
    type: '有限责任公司',
    bu: ['BU A'],
    products: ['Product A', 'Product D'],
    region: '浙江',
    level: 'B级',
    contractStatus: '待续约',
    qualificationStatus: '有效',
    relationshipStatus: '条件合作',
    risk: '中风险',
    sales: 7250000,
    rebate: 642000,
    evidenceCoverage: 82,
    representatives: 14,
    updatedAt: '2026-08-19'
  },
  {
    id: 'cso-00305',
    name: '南京XX商务咨询有限公司',
    code: 'CSO000305',
    type: '自然人代理',
    bu: ['BU B'],
    products: ['Product C'],
    region: '江苏',
    level: 'B级',
    contractStatus: '生效中',
    qualificationStatus: '即将到期',
    relationshipStatus: '正常合作',
    risk: '中风险',
    sales: 4380000,
    rebate: 398000,
    evidenceCoverage: 88,
    representatives: 9,
    updatedAt: '2026-08-18'
  },
  {
    id: 'cso-00411',
    name: '广州XX医药科技有限公司',
    code: 'CSO000411',
    type: '有限责任公司',
    bu: ['BU A', 'BU C'],
    products: ['Product B', 'Product E'],
    region: '华南',
    level: 'A级',
    contractStatus: '生效中',
    qualificationStatus: '有效',
    relationshipStatus: '正常合作',
    risk: '低风险',
    sales: 9860000,
    rebate: 925000,
    evidenceCoverage: 98,
    representatives: 21,
    updatedAt: '2026-08-17'
  },
  {
    id: 'cso-00502',
    name: '成都XX健康管理有限公司',
    code: 'CSO000502',
    type: '有限责任公司',
    bu: ['BU C'],
    products: ['Product E'],
    region: '西南',
    level: 'C级',
    contractStatus: '已到期',
    qualificationStatus: '过期',
    relationshipStatus: '暂停合作',
    risk: '高风险',
    sales: 1880000,
    rebate: 126000,
    evidenceCoverage: 61,
    representatives: 6,
    updatedAt: '2026-08-15'
  }
]

export const relationships = [
  {
    bu: 'BU A',
    product: 'Product A',
    region: '华东区域',
    model: '市场推广服务',
    level: '一级',
    contract: 'CT20260038',
    period: '2026-01-01 ～ 2026-12-31',
    contractStatus: '生效中',
    status: '有效'
  },
  {
    bu: 'BU A',
    product: 'Product B',
    region: '上海区域',
    model: '市场推广服务',
    level: '二级',
    contract: 'CT20260052',
    period: '2026-03-01 ～ 2026-12-31',
    contractStatus: '生效中',
    status: '有效'
  },
  {
    bu: 'BU B',
    product: 'Product C',
    region: '华南区域',
    model: '市场推广服务',
    level: '一级',
    contract: 'CT20260017',
    period: '2026-01-01 ～ 2026-06-30',
    contractStatus: '已到期',
    status: '已终止'
  }
]

export const lifecycle = [
  { title: '准入申请', date: '2025-11-05', detail: '主体资料已提交', tone: 'success' },
  { title: '准入通过', date: '2025-11-12', detail: 'Eligible', tone: 'success' },
  { title: '首次签约', date: '2025-12-20', detail: '合同 CT20260038', tone: 'primary' },
  { title: '新增产品', date: '2026-03-01', detail: 'Product B', tone: 'warning' },
  { title: 'Q1结算完成', date: '2026-04-20', detail: '¥ 285,000', tone: 'primary' },
  { title: 'Q2结算完成', date: '2026-07-20', detail: '¥ 312,000', tone: 'success' },
  { title: '合同变更', date: '2026-07-25', detail: '服务条款调整', tone: 'warning' },
  { title: '续约提醒', date: '2026-10-01', detail: '剩余 92 天', tone: 'info' }
]

export const ddiExceptions = [
  {
    id: 'EX-202608-0138',
    date: '2026-08-18',
    source: '第三方DDI-华东',
    terminal: '上海市第六人民医院',
    product: 'Product A',
    quantity: 420,
    amount: 168000,
    type: '多重合作关系',
    reason: '同一终端命中两条有效关系',
    status: '待处理',
    suggestedCso: '上海XX医药推广有限公司'
  },
  {
    id: 'EX-202608-0146',
    date: '2026-08-18',
    source: '第三方DDI-华南',
    terminal: '深圳XX连锁药房有限公司',
    product: 'Product C',
    quantity: 185,
    amount: 74000,
    type: '终端未匹配',
    reason: '终端编码未进入主数据映射',
    status: '处理中',
    suggestedCso: '待确认'
  },
  {
    id: 'EX-202608-0151',
    date: '2026-08-19',
    source: '第三方DDI-西南',
    terminal: '四川大学华西医院',
    product: 'Product E',
    quantity: 96,
    amount: 52800,
    type: '归属冲突',
    reason: '申报归属与有效合同区域不一致',
    status: '待处理',
    suggestedCso: '成都XX健康管理有限公司'
  },
  {
    id: 'EX-202608-0159',
    date: '2026-08-20',
    source: '应急补录',
    terminal: '浙江大学医学院附属第二医院',
    product: 'Product D',
    quantity: 132,
    amount: 79200,
    type: '接口恢复差异',
    reason: '应急补录与恢复后接口数据数量不一致',
    status: '已处理',
    suggestedCso: '杭州XX市场服务有限公司'
  }
]

export const evidenceItems = [
  {
    id: 'EV-202608-0236',
    cso: '上海XX医药推广有限公司',
    bu: 'BU A',
    product: 'Product A',
    period: '2026-07',
    service: '渠道维护',
    files: 12,
    declared: 168000,
    reasonableRange: '¥ 150,000 ～ 180,000',
    hash: '9e01…ab72',
    completeness: 100,
    status: '待审核'
  },
  {
    id: 'EV-202608-0241',
    cso: '杭州XX市场服务有限公司',
    bu: 'BU A',
    product: 'Product D',
    period: '2026-07',
    service: '学术会议',
    files: 8,
    declared: 124000,
    reasonableRange: '¥ 80,000 ～ 110,000',
    hash: 'c143…90fd',
    completeness: 88,
    status: '风险复核'
  },
  {
    id: 'EV-202608-0248',
    cso: '广州XX医药科技有限公司',
    bu: 'BU C',
    product: 'Product E',
    period: '2026-07',
    service: '信息收集',
    files: 15,
    declared: 96000,
    reasonableRange: '¥ 90,000 ～ 105,000',
    hash: '78ab…3ce1',
    completeness: 100,
    status: '审核通过'
  },
  {
    id: 'EV-202608-0255',
    cso: '南京XX商务咨询有限公司',
    bu: 'BU B',
    product: 'Product C',
    period: '2026-07',
    service: '调研报告',
    files: 5,
    declared: 72000,
    reasonableRange: '¥ 65,000 ～ 78,000',
    hash: 'd42c…7f29',
    completeness: 72,
    status: '待补传'
  }
]

export const settlements = [
  {
    id: 'ST-2026Q2-0018',
    cso: '上海XX医药推广有限公司',
    bu: 'BU A',
    product: 'Product A',
    lockedSales: 3280000,
    policy: '2026-A-一级-V2',
    calculated: 328000,
    deductions: 16000,
    evidence: 305000,
    payable: 305000,
    difference: 23000,
    status: '待CSO确认'
  },
  {
    id: 'ST-2026Q2-0021',
    cso: '上海XX医药推广有限公司',
    bu: 'BU A',
    product: 'Product B',
    lockedSales: 2670000,
    policy: '2026-B-二级-V1',
    calculated: 240300,
    deductions: 8000,
    evidence: 248000,
    payable: 232300,
    difference: 8000,
    status: '审批中'
  },
  {
    id: 'ST-2026Q2-0034',
    cso: '南京XX商务咨询有限公司',
    bu: 'BU B',
    product: 'Product C',
    lockedSales: 1880000,
    policy: '2026-C-自然人-V3',
    calculated: 206800,
    deductions: 12600,
    evidence: 198000,
    payable: 194200,
    difference: 12600,
    status: '待Evidence'
  },
  {
    id: 'ST-2026Q2-0047',
    cso: '广州XX医药科技有限公司',
    bu: 'BU C',
    product: 'Product E',
    lockedSales: 4120000,
    policy: '2026-E-一级-V1',
    calculated: 412000,
    deductions: 20000,
    evidence: 420000,
    payable: 392000,
    difference: 20000,
    status: '可支付'
  }
]

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0
  }).format(value)
