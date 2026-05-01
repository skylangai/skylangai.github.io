/* 技能列表 mock 数据
 * 接真后端时替换为 ajax 拉取结果 */
export const INITIAL_SKILLS = [
  { id: 1,  title: '国际站广告分析',     desc: '管理国际站广告产品能力（数据报告 / 智能诊断等）。当用户需要进行数据查询、账户诊断、计划诊断。', enabled: true },
  { id: 2,  title: '亚马逊数据查询',     version: 'v1.0.0', desc: '基于 Jungle Scout 工具的亚马逊市场数据分析工具集，支持关键词搜索量、ASIN 反查词、竞品销量估算。', enabled: true },
  { id: 3,  title: '国际站店铺经营分析', desc: '集成国际站店铺数据，支持店铺经营分析建议，支持查询商品、转化、沟通询盘、交易订单、物流、广告等。', enabled: true },
  { id: 4,  title: '蓝海机会发掘',       desc: '分析供需错配、发现高潜力低竞争品类，给出差异化路径和国际站发品策略，供给侧始终用阿里国际站 MC。', enabled: true },
  { id: 5,  title: '品牌广告智能推词',   desc: '阿里巴巴国际站品牌广告关键词推荐助手。基于客户画像和营销意图，智能筛选推荐最符合业务目标的品牌词。', enabled: true },
  { id: 6,  title: '国际站知识查询',     version: 'v1.0.0', desc: '阿里巴巴国际站知识库查询助手。根据用户查询 query，自动调用 mcp 工具检索知识库相关知识。', enabled: true },
  { id: 7,  title: '国际站订单拒付申诉', desc: '根据电商平台拒付申诉 AI 助手。当用户询问拒付相关问题、咨询特定订单的拒付状态，或者输入「订单 ID」。', enabled: true },
  { id: 8,  title: 'Listing 优化助手',  desc: '基于平台收录、转化数据自动给出标题 / 五点描述 / A+ 内容优化建议。', enabled: false },
  { id: 9,  title: '广告投放诊断',       desc: '诊断 Sponsored Products 投放表现，给出预算分配与关键词调整建议。', enabled: true },
  { id: 10, title: '关键词蓝海挖掘',     desc: '在亚马逊 / 国际站找出搜索量上升但竞争度仍低的长尾关键词。', enabled: false },
  { id: 11, title: '退款风控分析',       desc: '识别异常退款集中行为与高风险账户，自动汇总周报。', enabled: true },
  { id: 12, title: '竞品价格监控',       desc: '每日抓取指定竞品价格变化，超过阈值自动推送提醒。', enabled: true }
];
