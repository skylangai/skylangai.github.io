import { formatDateTime } from '../utils/format.js';

/* 生成 mock 使用明细：随机分布在过去 7 天，按时间倒序，最新在前 */
export function generateMockUsageRecords(count) {
  const sample = [
    '列出近一个月国际站热卖的彩妆类商品，并简要分析其热销原因及当前竞争热度',
    '请检索在 amazon 上热销，但在国际站供给规模较小的家居清洁类，输出 Top 5 蓝海单品',
    '帮我分析下日本市场最近 30 天的母婴用品搜索趋势，重点看月销量增速 Top 10',
    '为我的店铺写一段 LED 灯具的 SEO 标题与描述，关键词包含 dimmable / smart',
    '请基于上传的图片生成 5 张电商主图候选，要求干净背景、左下角加品牌水印',
    '总结昨天的店铺运营情况，包括询盘数、转化率、客单价的环比变化',
    '生成一段 30 秒短视频脚本，用于推广夏季防晒喷雾，目标是北美 Z 世代',
    '帮我做一个店铺装修建议，主题色用我品牌的薄荷绿，整体风格干净极简',
    '列出本月 Top 5 询盘客户，按所在国家、产品类目、近 7 天活跃度排序',
    '把这份英文产品手册翻译成西班牙语和阿拉伯语，并保留原 Markdown 结构',
    '分析最近 14 天的广告投放 ROAS，按渠道拆分，找出表现最差的 3 个广告组',
    '给"户外便携咖啡机"写 5 条小红书风格的种草文案，每条 100 字以内',
    '检测我店铺商品的违禁词风险，重点关注美妆与保健品类目的合规性',
    '生成一份"竞品价格监控周报"模板，要包含 5 个核心指标的图表占位'
  ];
  const now = Date.now();
  const windowMs = 7 * 24 * 60 * 60 * 1000;

  const arr = [];
  for (let i = 0; i < count; i++) {
    const ts = now - Math.floor(Math.random() * windowMs);
    const tokens = 1500 + Math.round(Math.random() * 6500);
    const cost = +(tokens / 1000 * 0.003).toFixed(2);
    arr.push({
      ts,
      time: formatDateTime(new Date(ts)),
      prompt: sample[i % sample.length],
      tokens,
      cost
    });
  }

  arr.sort((a, b) => b.ts - a.ts);
  return arr;
}

/* 模块加载时一次性生成 15 条，整个生命周期保持稳定（与 jQuery 版同行为） */
export const USAGE_RECORDS = generateMockUsageRecords(15);

export const USAGE_PAGE_SIZE = 10;
