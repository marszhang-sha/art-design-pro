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
  relationshipCount: number
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
    relationshipCount: 3,
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
    relationshipCount: 1,
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
    relationshipCount: 1,
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
    relationshipCount: 2,
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
    relationshipCount: 1,
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

export interface IdentityRow {
  label: string
  uploaded: string
  api: string
  match: boolean
}

export interface OnboardingApplication {
  id: string
  cso: string
  type: '公司主体' | '自然人'
  thirdParty?: string
  bu: string
  product: string
  region: string
  intention: string
  period: string
  submittedAt: string
  stage: string
  gate1: string
  gate2: string
  gate3: string
  approval: string
  risk: string
  dueDiligence: string
  identity?: { source: string; time: string; rows: IdentityRow[] }
}

export const onboardingApplications: OnboardingApplication[] = [
  {
    id: 'APP-2026-0102',
    cso: '上海XX医药有限公司',
    type: '公司主体',
    bu: 'BU A',
    product: 'Product X',
    region: '华东区域',
    intention: '市场推广服务',
    period: '2026.01.01 – 2026.12.31',
    submittedAt: '2026-08-12',
    stage: '合规终审',
    gate1: '通过',
    gate2: '通过',
    gate3: '通过',
    approval: '区域初审 ✓ → 大区复核 ✓ → 总监 ✓ → 合规终审(进行中)',
    risk: '低风险',
    dueDiligence: '通过 · 2026-08-16',
    identity: {
      source: '第三方API · 企查查',
      time: '2026-08-13 10:20',
      rows: [
        {
          label: '企业名称',
          uploaded: '上海XX医药有限公司',
          api: '上海XX医药有限公司',
          match: true
        },
        {
          label: '统一社会信用代码',
          uploaded: '91310115MA1XXXXXX0X',
          api: '91310115MA1XXXXXX0X',
          match: true
        },
        { label: '法定代表人', uploaded: '张某某', api: '张某某', match: true },
        { label: '成立日期', uploaded: '2016-06-18', api: '2016-06-18', match: true },
        { label: '登记状态', uploaded: '存续(在营)', api: '存续(在营)', match: true }
      ]
    }
  },
  {
    id: 'APP-2026-0105',
    cso: '王XX(自然人)',
    type: '自然人',
    thirdParty: '苏州XX信息咨询有限公司',
    bu: 'BU B',
    product: 'Product C',
    region: '江苏区域',
    intention: '市场推广服务',
    period: '2026.10.01 – 2026.12.31',
    submittedAt: '2026-08-15',
    stage: '资料补充',
    gate1: '通过',
    gate2: '需补充',
    gate3: '待核验',
    approval: '区域初审 ✓ → 大区复核(退回补充)',
    risk: '中风险',
    dueDiligence: '尽调中',
    identity: {
      source: '第三方API · 企查查',
      time: '2026-08-16 09:12',
      rows: [
        { label: '自然人姓名', uploaded: '王XX', api: '王XX', match: true },
        {
          label: '身份证号(脱敏)',
          uploaded: '320***********0016',
          api: '320***********0016',
          match: true
        },
        {
          label: '三方公司名称',
          uploaded: '苏州XX信息咨询有限公司',
          api: '苏州XX信息咨询有限公司',
          match: true
        },
        {
          label: '三方公司统一社会信用代码',
          uploaded: '91320594MA1MNBPN3Q',
          api: '91320594MA1MNBPN3Q',
          match: true
        },
        { label: '三方公司登记状态', uploaded: '存续(在营)', api: '存续(在营)', match: true }
      ]
    }
  },
  {
    id: 'APP-2026-0108',
    cso: '武汉XX健康管理股份有限公司',
    type: '公司主体',
    bu: 'BU A',
    product: 'Product B',
    region: '华中区域',
    intention: '市场推广服务',
    period: '2026.09.01 – 2026.12.31',
    submittedAt: '2026-08-18',
    stage: '准入核验',
    gate1: '待核验',
    gate2: '核验中',
    gate3: '待核验',
    approval: '待流转',
    risk: '低风险',
    dueDiligence: '待启动'
  },
  {
    id: 'APP-2026-0098',
    cso: '成都XX健康管理有限公司',
    type: '公司主体',
    bu: 'BU C',
    product: 'Product E',
    region: '西南区域',
    intention: '市场推广服务',
    period: '2025.09.01 – 2026.08.31',
    submittedAt: '2026-07-20',
    stage: '已生效',
    gate1: '通过',
    gate2: '通过',
    gate3: '通过',
    approval: '区域初审 ✓ → 大区复核 ✓ → 总监 ✓ → 合规终审 ✓',
    risk: '低风险',
    dueDiligence: '通过 · 2026-07-28',
    identity: {
      source: '第三方API · 企查查',
      time: '2026-07-22 11:40',
      rows: [
        {
          label: '企业名称',
          uploaded: '成都XX健康管理有限公司',
          api: '成都XX健康管理有限公司',
          match: true
        },
        {
          label: '统一社会信用代码',
          uploaded: '91510100MA62XXXXXX2B',
          api: '91510100MA62XXXXXX2B',
          match: true
        },
        { label: '法定代表人', uploaded: '刘某某', api: '刘某某', match: true },
        { label: '登记状态', uploaded: '存续(在营)', api: '存续(在营)', match: true }
      ]
    }
  }
]

export interface ContractLine {
  bu: string
  product: string
  region: string
  level: string
  policy: string
}

export interface ContractRecord {
  id: string
  cso: string
  period: string
  status: string
  signProgress: number
  signSteps: { title: string; date: string }[]
  changes: number
  lines: ContractLine[]
}

export const contracts: ContractRecord[] = [
  {
    id: 'CT202600038',
    cso: '上海XX医药推广有限公司',
    period: '2026.01.01 – 2026.12.31',
    status: '已生效',
    signProgress: 5,
    signSteps: [
      { title: '内部审批', date: '03-10' },
      { title: 'PDF生成', date: '03-12' },
      { title: '甲方签署', date: '03-13' },
      { title: 'CSO签署', date: '03-14' },
      { title: '归档生效', date: '03-14' }
    ],
    changes: 1,
    lines: [
      {
        bu: 'BU A',
        product: 'Product X',
        region: '华东区域',
        level: '一级代理',
        policy: 'Policy A'
      },
      {
        bu: 'BU A',
        product: 'Product B',
        region: '上海区域',
        level: '二级代理',
        policy: 'Policy B'
      }
    ]
  },
  {
    id: 'CT202600101',
    cso: '杭州XX市场服务有限公司',
    period: '2026.10.01 – 2026.12.31',
    status: '待CSO签署',
    signProgress: 3,
    signSteps: [
      { title: '内部审批', date: '08-15' },
      { title: 'PDF生成', date: '08-16' },
      { title: '甲方签署', date: '08-18' },
      { title: 'CSO签署', date: '—' },
      { title: '归档生效', date: '—' }
    ],
    changes: 0,
    lines: [
      {
        bu: 'BU A',
        product: 'Product D',
        region: '浙江区域',
        level: '一级代理',
        policy: 'Policy D'
      }
    ]
  },
  {
    id: 'CT202600017',
    cso: '上海XX医药推广有限公司',
    period: '2026.01.01 – 2026.06.30',
    status: '已终止',
    signProgress: 5,
    signSteps: [
      { title: '内部审批', date: '2025-12-18' },
      { title: 'PDF生成', date: '2025-12-19' },
      { title: '甲方签署', date: '2025-12-22' },
      { title: 'CSO签署', date: '2025-12-23' },
      { title: '归档生效', date: '2025-12-23' }
    ],
    changes: 2,
    lines: [
      {
        bu: 'BU B',
        product: 'Product C',
        region: '华南区域',
        level: '一级代理',
        policy: 'Policy C'
      }
    ]
  }
]

export const contractChanges = [
  {
    id: 'CHG-2026-018',
    contract: 'CT202600038',
    type: '指标变更',
    product: 'Product X',
    before: '年度承诺 ¥3,000,000',
    after: '年度承诺 ¥3,600,000',
    effective: '2026-08-01(申请当月起)',
    status: '已生效',
    approver: '大区复核 · 总监审批 ✓'
  },
  {
    id: 'CHG-2026-021',
    contract: 'CT202600038',
    type: '授权区域变更',
    product: 'Product X',
    before: '华东区域(上海、江苏、浙江)',
    after: '华东区域(增加安徽)',
    effective: '2026-09-01(申请次月起)',
    status: '审批中',
    approver: '区域初审 ✓ → 大区复核(进行中)'
  },
  {
    id: 'CHG-2026-011',
    contract: 'CT202600017',
    type: '退出终止',
    product: 'Product C',
    before: '有效期至 2026-12-31',
    after: '因合规问题于 2026-06-30 终止',
    effective: '2026-06-30',
    status: '已生效',
    approver: '合规终审 ✓ · 立即终止'
  }
]

export const deposits = [
  {
    cso: '上海XX医药推广有限公司',
    amount: 200000,
    paidAt: '2026-01-08',
    deducted: 20000,
    balance: 180000,
    status: '正常',
    records: [
      { type: '缴纳', amount: 200000, date: '2026-01-08', note: '银行回单已核对' },
      { type: '扣除', amount: -20000, date: '2026-05-12', note: '医院开发未达标 · 依据合同8.2条' }
    ]
  },
  {
    cso: '杭州XX市场服务有限公司',
    amount: 100000,
    paidAt: '2026-03-05',
    deducted: 60000,
    balance: 40000,
    status: '不足预警',
    records: [
      { type: '缴纳', amount: 100000, date: '2026-03-05', note: '银行回单已核对' },
      { type: '扣除', amount: -35000, date: '2026-05-12', note: '流向未达标 · 依据合同8.3条' },
      {
        type: '扣除',
        amount: -25000,
        date: '2026-08-10',
        note: '合规违规(培训未完成) · 依据合同9.1条'
      }
    ]
  },
  {
    cso: '广州XX医药科技有限公司',
    amount: 200000,
    paidAt: '2026-02-18',
    deducted: 0,
    balance: 200000,
    status: '正常',
    records: [{ type: '缴纳', amount: 200000, date: '2026-02-18', note: '银行回单已核对' }]
  }
]

export interface RepresentativeRecord {
  name: string
  maskedId: string
  cso: string
  education: string
  diploma: string
  verifyStatus: '待核验' | '通过' | '不通过'
  filing: '已备案' | '待备案' | '备案过期'
  filingNo: string
  cohort: '存量代表' | '新增代表'
  blacklist: string
  note?: string
}

export const representativeRecords: RepresentativeRecord[] = [
  {
    name: '李XX',
    maskedId: '310***********1234',
    cso: '上海XX医药推广有限公司',
    education: '药学 · XX医科大学 · 2018',
    diploma: '学历证书_李XX.pdf',
    verifyStatus: '通过',
    filing: '已备案',
    filingNo: '备2026-01325',
    cohort: '存量代表',
    blacklist: '无'
  },
  {
    name: '陈XX',
    maskedId: '330***********5678',
    cso: '上海XX医药推广有限公司',
    education: '临床医学 · XX大学 · 2020',
    diploma: '学历证书_陈XX.pdf',
    verifyStatus: '通过',
    filing: '已备案',
    filingNo: '备2026-01326',
    cohort: '存量代表',
    blacklist: '无'
  },
  {
    name: '刘XX',
    maskedId: '440***********9012',
    cso: '广州XX医药科技有限公司',
    education: '药学 · XX药科大学 · 2019',
    diploma: '学历证书_刘XX.pdf',
    verifyStatus: '待核验',
    filing: '待备案',
    filingNo: '—',
    cohort: '新增代表',
    blacklist: '无',
    note: '新增代表,学历核验通过后方可生效'
  },
  {
    name: '赵XX',
    maskedId: '320***********3456',
    cso: '杭州XX市场服务有限公司',
    education: '市场营销 · XX商学院 · 2021',
    diploma: '学历证书_赵XX.pdf',
    verifyStatus: '不通过',
    filing: '待备案',
    filingNo: '—',
    cohort: '新增代表',
    blacklist: '无',
    note: '学历证书与学信网记录不一致,已退回'
  },
  {
    name: '孙XX',
    maskedId: '510***********7890',
    cso: '成都XX健康管理有限公司',
    education: '护理学 · XX医学院 · 2017',
    diploma: '学历证书_孙XX.pdf',
    verifyStatus: '通过',
    filing: '备案过期',
    filingNo: '备2025-08221',
    cohort: '存量代表',
    blacklist: '无',
    note: '备案已于 2026-07-01 过期,暂停开展业务'
  },
  {
    name: '周XX',
    maskedId: '420***********2468',
    cso: '武汉XX商务咨询有限公司',
    education: '药学 · XX医科大学 · 2016',
    diploma: '学历证书_周XX.pdf',
    verifyStatus: '通过',
    filing: '待备案',
    filingNo: '—',
    cohort: '新增代表',
    blacklist: '命中黑名单',
    note: '2025年在其他代理商因商业贿赂被终止,跨代理商复用自动拦截'
  }
]

export const blacklistRecords = [
  {
    name: '周XX',
    maskedId: '420***********2468',
    reason: '商业贿赂违规终止',
    date: '2025-11-30',
    source: '原代理商:武汉XX商务咨询有限公司',
    status: '拦截中'
  },
  {
    name: '吴XX',
    maskedId: '330***********6688',
    reason: '虚假流向数据',
    date: '2025-06-15',
    source: '原代理商:宁波XX医药咨询有限公司',
    status: '已拦截 2 次'
  }
]

export interface ConfirmTask {
  cso: string
  bu: string
  month: string
  records: number
  amount: number
  status: '待确认' | '已确认' | '已锁定' | '异议中'
  deadline: string
}

export const confirmTasks: ConfirmTask[] = [
  {
    cso: '上海XX医药推广有限公司',
    bu: 'BU A',
    month: '2026-08',
    records: 1284,
    amount: 4860000,
    status: '待确认',
    deadline: '09-05 23:59'
  },
  {
    cso: '杭州XX市场服务有限公司',
    bu: 'BU A',
    month: '2026-08',
    records: 763,
    amount: 2150000,
    status: '异议中',
    deadline: '09-05 23:59'
  },
  {
    cso: '广州XX医药科技有限公司',
    bu: 'BU C',
    month: '2026-08',
    records: 1042,
    amount: 3320000,
    status: '待确认',
    deadline: '09-05 23:59'
  },
  {
    cso: '南京XX商务咨询有限公司',
    bu: 'BU B',
    month: '2026-08',
    records: 318,
    amount: 880000,
    status: '已确认',
    deadline: '09-05 23:59'
  },
  {
    cso: '上海XX医药推广有限公司',
    bu: 'BU A',
    month: '2026-07',
    records: 1226,
    amount: 4620000,
    status: '已锁定',
    deadline: '08-05 23:59'
  }
]

export const salesRecords = [
  {
    terminal: '华东某三甲医院',
    product: 'Product X',
    date: '2026-08-02',
    qty: 100,
    amount: 486000,
    cso: '上海XX医药推广有限公司',
    confidence: '高'
  },
  {
    terminal: '上海XX社区卫生中心',
    product: 'Product X',
    date: '2026-08-05',
    qty: 60,
    amount: 291600,
    cso: '上海XX医药推广有限公司',
    confidence: '高'
  },
  {
    terminal: '杭州XX大药房',
    product: 'Product B',
    date: '2026-08-08',
    qty: 210,
    amount: 105000,
    cso: '杭州XX市场服务有限公司',
    confidence: '中'
  },
  {
    terminal: '广州XX连锁药房',
    product: 'Product E',
    date: '2026-08-12',
    qty: 320,
    amount: 160000,
    cso: '广州XX医药科技有限公司',
    confidence: '高'
  }
]

export interface DisputeRecord {
  id: string
  cso: string
  bu: string
  product: string
  type: string
  terminal: string
  qty: number
  amount: number
  reason: string
  expectation: string
  materials: string[]
  reviewer: string
  conclusion: string
  conclusionDate: string
  opinion: string
  status: string
  timeline: { title: string; date: string }[]
}

export const disputes: DisputeRecord[] = [
  {
    id: 'DIS-202608-00128',
    cso: '杭州XX市场服务有限公司',
    bu: 'BU A',
    product: 'Product A',
    type: '归属异议',
    terminal: 'XX人民医院',
    qty: 120,
    amount: 86400,
    reason: '该终端应归属于我司(合同授权区域包含)',
    expectation: '更正归属至本CSO',
    materials: ['合同补充协议.pdf', '往来邮件截图.png'],
    reviewer: '李四 · 渠道运营专员(BU A)',
    conclusion: '异议成立',
    conclusionDate: '2026-08-07 15:20',
    opinion: '根据合同及业务说明,同意调整归属',
    status: '待重新确认',
    timeline: [
      { title: '发起异议 · 张三', date: '08-05 10:32' },
      { title: '复核中 · BU A审批链', date: '08-06' },
      { title: '异议成立 · 待重新确认', date: '08-07 15:20' }
    ]
  },
  {
    id: 'DIS-202608-00131',
    cso: '广州XX医药科技有限公司',
    bu: 'BU C',
    product: 'Product E',
    type: '数量异议',
    terminal: '深圳XX医院',
    qty: 85,
    amount: 42500,
    reason: '重复流向导致数量虚增',
    expectation: '剔除重复记录',
    materials: ['终端进药单.jpg'],
    reviewer: '王五 · 渠道运营专员(BU C)',
    conclusion: '复核中',
    conclusionDate: '—',
    opinion: '已向上游数据源核实',
    status: '复核中',
    timeline: [
      { title: '发起异议 · 广州XX', date: '08-12 14:05' },
      { title: '复核中 · 已发函上游核实', date: '08-13' }
    ]
  },
  {
    id: 'DIS-202607-00096',
    cso: '上海XX医药推广有限公司',
    bu: 'BU A',
    product: 'Product B',
    type: '归属异议',
    terminal: '苏州XX医院',
    qty: 200,
    amount: 100000,
    reason: '区域边界归属存疑',
    expectation: '更正归属至本CSO',
    materials: ['授权区域说明.pdf'],
    reviewer: '李四 · 渠道运营专员(BU A)',
    conclusion: '不成立',
    conclusionDate: '2026-07-18 11:02',
    opinion: '该终端行政区划属华中区域,维持原归属',
    status: '已关闭',
    timeline: [
      { title: '发起异议 · 上海XX', date: '07-15 09:20' },
      { title: '复核中', date: '07-16' },
      { title: '异议不成立 · 维持', date: '07-18 11:02' },
      { title: 'CSO确认处理结果', date: '07-19' }
    ]
  }
]

export interface RebateLine {
  product: string
  policy: string
  rule: string
  lockedSales: number
  rebate: number
}

export const rebateSheets = [
  {
    id: 'RB-2026Q3-0082',
    cso: '上海XX医药推广有限公司',
    bu: 'BU A',
    quarter: '2026 Q3',
    version: 'V2.0',
    status: '已重算',
    total: 487600,
    previousVersion: 'V1.0 · ¥503,000',
    diff: -15400,
    diffReason: '异议成立 · 销量调整 ¥5,950,000 → ¥5,780,000',
    lines: [
      {
        product: 'Product A',
        policy: 'POL-A-PROD-A-V2.0',
        rule: '阶梯返利 · ≥ ¥3,000,000 → 1%',
        lockedSales: 3200000,
        rebate: 32000
      },
      {
        product: 'Product B',
        policy: 'POL-A-PROD-B-V1.0',
        rule: '固定比例 · 0.7%',
        lockedSales: 1800000,
        rebate: 12600
      },
      {
        product: 'Product C',
        policy: 'POL-A-PROD-C-V1.0',
        rule: '固定比例 · 0.6%',
        lockedSales: 780000,
        rebate: 4680
      }
    ] as RebateLine[],
    split: null
  },
  {
    id: 'RB-2026Q3-0085',
    cso: '南京XX商务咨询有限公司(自然人)',
    bu: 'BU B',
    quarter: '2026 Q3',
    version: 'V1.0',
    status: '待确认',
    total: 82600,
    previousVersion: '—',
    diff: 0,
    diffReason: '',
    lines: [
      {
        product: 'Product C',
        policy: 'POL-B-PROD-C-V1.0',
        rule: '固定比例 · 0.7%',
        lockedSales: 980000,
        rebate: 6860
      },
      {
        product: 'Product F',
        policy: 'POL-B-PROD-F-V1.0',
        rule: '阶梯返利 · ≥ ¥800,000 → 0.9%',
        lockedSales: 820000,
        rebate: 7380
      }
    ] as RebateLine[],
    split: { thirdParty: '苏州XX信息咨询有限公司', serviceFee: 57820, personal: 24780 }
  }
]

export const rebatePolicies = [
  {
    code: 'POL-A-PROD-A-V2.0',
    scope: 'BU A · Product A · 一级',
    mode: '阶梯返利',
    detail: '≥¥3,000,000 → 1% · ≥¥2,000,000 → 0.8% · 其他 0.6%',
    effective: '2026-07-01',
    current: true
  },
  {
    code: 'POL-A-PROD-B-V1.0',
    scope: 'BU A · Product B · 二级',
    mode: '固定比例',
    detail: '0.7%',
    effective: '2026-01-01',
    current: true
  },
  {
    code: 'POL-A-PROD-C-V1.0',
    scope: 'BU A · Product C',
    mode: '固定比例',
    detail: '0.6%',
    effective: '2026-01-01',
    current: true
  },
  {
    code: 'POL-A-PROD-A-V1.0',
    scope: 'BU A · Product A · 一级',
    mode: '阶梯返利',
    detail: '≥¥3,000,000 → 0.9%',
    effective: '2026-01-01',
    current: false
  }
]

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0
  }).format(value)
