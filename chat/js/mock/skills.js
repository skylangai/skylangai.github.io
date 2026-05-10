/* 技能列表 mock 数据
 * 接真后端时替换为 ajax 拉取结果。
 * 字段约定：id / title / desc / enabled 必填，version 可选；
 * desc 控制在 ~50 字以内，便于在 SkillsModal 卡片里两行展示。 */
export const INITIAL_SKILLS = [
  { id: 1, title: '跨境支付与汇率监控', version: 'v1.2.0', desc: '盯盘主流结算货币汇率波动，结合订单回款节奏给出锁汇 / 结汇建议，规避汇兑损失。', enabled: true },
  { id: 2, title: 'TikTok Shop 选品雷达', desc: '聚合 TikTok Shop 当周飙升商品、达人带货数据与话题热度，输出潜在爆款短列表。', enabled: true },
  { id: 3, title: '海外仓库存调拨建议', desc: '基于销售预测、在途库存与各仓周转天数，自动给出 FBA / 海外仓的调拨与补货数量。', enabled: false },
  { id: 4, title: '物流路径与时效预估', desc: '比价空运 / 海运 / 卡派多条线路的时效与运费，结合旺季拥堵情况推荐最优渠道。', enabled: true },
  { id: 5, title: '海关合规 & HS 编码助手', version: 'v1.0.0', desc: '根据品名 / 用途智能匹配 HS 编码，提示目的国关税率、认证与标签要求，降低清关风险。', enabled: true },
  { id: 6, title: '买家询盘智能回复', desc: '解析询盘意图与客户画像，自动生成多语言报价 / 跟进话术草稿，支持一键转人工。', enabled: true },
  { id: 7, title: '海外红人与 KOL 匹配', desc: '按品类、目标市场与预算筛选 YouTube / Instagram / TikTok 红人，给出合作优先级。', enabled: false },
  { id: 8, title: '多语言 Listing 本地化', desc: '将主图文案、五点描述与 A+ 内容翻译并按目标市场习惯润色，避免直译导致的转化损失。', enabled: true }
];
