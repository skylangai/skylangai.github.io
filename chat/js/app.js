/* =====================================================
 *  凌云AI · 生意助手  前端逻辑（jQuery）
 *
 * 主要职责：
 *   1. 渲染推荐提示词、Tab 切换
 *   2. 输入框：自适应高度、回车发送、按钮发送
 *   3. 发送消息后：切换到对话视图，渲染用户气泡
 *   4. 调用「假 URL」HTTP 请求（真实网络调用，不依赖响应内容）
 *   5. 展示助手「工具调用」动效，最后输出固定答案
 *   6. 左侧 Messages 列表自动登记/激活当前会话
 * ===================================================== */

(function ($) {
  'use strict';

  /* ----------- 配置 ----------- */
  // 假 URL：真实可达的 mock endpoint，便于在 Network 面板看到请求
  // 如果你想改成完全不存在的 URL（让请求失败），把它换掉即可，
  // 代码里的 always() 会保证无论成功失败都给出固定回答。
  var FAKE_API_URL = 'https://jsonplaceholder.typicode.com/posts';

  // 固定回答（无论后端返回什么都用这个）
  var FIXED_ANSWER =
    '根据近一周的国际站数据，迅速走热的彩妆品类主要集中在以下方向：\n\n' +
    '1. 持妆粉底液 / 粉底棒（搜索量周环比 +38%）\n' +
    '2. 高显色哑光唇泥（询盘量周环比 +27%）\n' +
    '3. 防晒妆前乳（受夏季节性需求拉动，访客 +45%）\n' +
    '4. 多色眼影盘（北美与中东市场表现突出）\n\n' +
    '建议优先布局 SKU、配套发布短视频素材，并结合店铺装修做主题专区，以承接增量流量。\n\n' +
    '在 Demo 状态下，以上回答内容是 Demo 固定回答，仅供参考。欢迎联系我们了解完整版能力。';

  // 助手元信息
  var ASSISTANT_NAME = '电商智能生意助手';

  // 会话标题相关
  var DEFAULT_SESSION_TITLE = '新对话';
  var TITLE_MAX_LEN = 8;

  // 使用统计：mock 概览数据（接真实接口时直接替换 USAGE_STATS / USAGE_RECORDS）
  var USAGE_STATS = {
    quotaTotal:   1000,        // 本月总额度（USD）
    quotaUsed:    22.39,       // 本月已使用（USD）
    requestCount: 581,
    inputTokens:  27881065,
    outputTokens: 342057
  };

  // 使用统计：mock 明细记录（生成后按请求时间倒序，最新在前）
  var USAGE_RECORDS = generateMockUsageRecords(15);
  var USAGE_PAGE_SIZE = 10;
  var usagePage = 1;

  // 技能列表 mock 数据（接真实接口时替换为 ajax 拉取结果）
  var SKILLS = [
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

  // 推荐提示词
  var PROMPTS = [
    '列出近一个月国际站热卖的[产品类别]商品，并简要分析其热销原因及当前竞争热度',
    '列出近一个月在 [目标平台，如 Amazon US] 上，[产品类别] 销量 Top10 商品，包含：售价、月销量估算、评分、上架时间…',
    '查询近一个月在 [特定地区/国家，如美国/东南亚] 市场最畅销的 [产品类别] 商品，并结合当地文化习俗或季节性因素，解…',
    '筛选近一个月国际站 [产品类别] 中，价格在 [$X-$Y] 区间、按 [访问量/询盘量/订单量] 排名前10的商品，并简要分析下原因',
    '请检索在 [站外平台，如 amazon] 上热销，但在 [国际站] 供给规模较小的 [产品类别]，并请输出 Top 5 蓝海单品清单',
    '我主营 [产品类别]，请评估 [国家/地区范围] 的市场需求潜力，评估维度包括：市场规模、增长率、竞争格局、物流难度…'
  ];

  /* ----------- DOM 缓存 ----------- */
  var $welcomeView   = $('#welcomeView');
  var $chatView      = $('#chatView');
  var $statsView     = $('#statsView');
  var $welcomeInput  = $('#welcomeInput');
  var $welcomeSend   = $('#welcomeSendBtn');
  var $chatInput     = $('#chatInput');
  var $chatSend      = $('#chatSendBtn');
  var $chatList      = $('#chatList');
  var $chatScroll    = $('#chatScroll');
  var $promptsList   = $('#promptsList');
  var $msgList       = $('#msgList');
  var $msgToggle     = $('#msgSectionToggle');
  var $newChatBtn    = $('#newChatBtn');
  var $statsToggle   = $('#statsSectionToggle');
  var $statsCards    = $('#statsCards');
  var $usageTbody    = $('#usageTbody');
  var $usagePager    = $('#usagePager');
  var $usageMeta     = $('#usageMeta');
  var $hiddenFileInput   = $('#hiddenFileInput');
  var $welcomeAttachments = $('#welcomeAttachments');
  var $chatAttachments    = $('#chatAttachments');

  /* ----------- 状态 ----------- */
  // 当前激活的会话 id；为 null 表示尚未发起任何会话（停留在欢迎页）
  var currentSessionId = null;
  // 全部会话存储：sessionId -> { id, title, messages: [{role, content, attachments?}], $item }
  var sessions = {};

  // 待发送的附件队列（共用：欢迎页 / 对话页同时只可见一个 composer）
  // 每条：{ id, file, name, size, type }
  // 注意：file 是浏览器原生 File 对象，仅在「点 + 选择 → 点发送」之间短暂持有，
  // 一经发送就会被清空，且**不会**写入 sessions[*].messages（历史只保留元数据）。
  var pendingAttachments = [];

  // 真实上传开关：当 FAKE_API_URL 被替换成真实接口后，把它改为 true，
  // uploadAttachments() 就会以 multipart/form-data 真实发送文件。
  var ENABLE_REAL_UPLOAD = false;
  // 真实上传地址（与 FAKE_API_URL 解耦，便于后端路由分离）
  var UPLOAD_API_URL = '/api/upload';

  // 可选模型列表（接真后端时直接替换 MODELS / 把 currentModelId 持久化到 localStorage 即可）
  var MODELS = [
    { id: 'auto',         label: 'Auto' },
    { id: 'deepseek-3.2', label: 'DeepSeek V3.2' },
    { id: 'qwen-3.5',     label: 'Qwen 3.5' },
    { id: 'doubao-2.0',   label: 'Doubao 2.0' },
    { id: 'kimi-2.5',     label: 'Kimi K2.5' },
    { id: 'glm-4.7',      label: 'GLM 4.7' }
  ];
  var currentModelId = 'auto';

  /* ===================================================
   * 初始化
   * ================================================= */
  $(function () {
    renderPrompts();
    bindTabs();
    bindComposer($welcomeInput, $welcomeSend);
    bindComposer($chatInput, $chatSend);
    bindUploads();
    bindModelMenu();
    bindMisc();
  });

  /* ===================================================
   * 渲染推荐提示词
   * ================================================= */
  function renderPrompts() {
    var html = PROMPTS.map(function (p) {
      return '<li><span class="diamond">◆</span><span>' + escapeHtml(p) + '</span></li>';
    }).join('');
    $promptsList.html(html);

    // 点击提示词 → 填入输入框并发送
    $promptsList.on('click', 'li', function () {
      var text = $(this).find('span').last().text();
      $welcomeInput.val(text).trigger('input');
      sendMessage(text);
    });
  }

  /* ===================================================
   * Tab 切换
   * ================================================= */
  function bindTabs() {
    $('.tab').on('click', function () {
      $('.tab').removeClass('active');
      $(this).addClass('active');
      // 这里可根据 data-tab 切换不同提示词组（暂用同一组）
    });
  }

  /* ===================================================
   * 输入框：自适应高度 + 回车发送
   * ================================================= */
  function bindComposer($input, $sendBtn) {
    function autosize() {
      $input.css('height', 'auto');
      $input.css('height', Math.min($input[0].scrollHeight, 200) + 'px');
    }
    $input.on('input', autosize);

    $input.on('keydown', function (e) {
      // Enter 发送，Shift+Enter 换行
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        var text = $.trim($input.val());
        if (text || pendingAttachments.length > 0) sendMessage(text);
      }
    });

    $sendBtn.on('click', function () {
      var text = $.trim($input.val());
      if (text || pendingAttachments.length > 0) sendMessage(text);
    });
  }

  /* ===================================================
   * 文件上传相关绑定（＋ 按钮 → 调起原生选择对话框）
   * ================================================= */
  function bindUploads() {
    // 两个 composer 上的 ＋ 按钮共用同一个隐藏 file input
    $(document).on('click', '.chip-upload', function (e) {
      e.preventDefault();
      // 清掉 value，确保连续选同一个文件也能触发 change
      $hiddenFileInput.val('').trigger('click');
    });

    // 选完文件 → 入队 → 渲染 chip
    $hiddenFileInput.on('change', function () {
      var files = this.files;
      if (!files || files.length === 0) return;
      for (var i = 0; i < files.length; i++) {
        var f = files[i];
        pendingAttachments.push({
          id: 'att_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 6),
          file: f,
          name: f.name,
          size: f.size,
          type: f.type || ''
        });
      }
      renderAttachmentChips();
    });

    // 删除某条待发送附件
    $(document).on('click', '.attachment-chip-remove', function (e) {
      e.preventDefault();
      var id = $(this).closest('.attachment-chip').data('id');
      pendingAttachments = pendingAttachments.filter(function (a) {
        return String(a.id) !== String(id);
      });
      renderAttachmentChips();
    });
  }

  /* —— 把 pendingAttachments 同步渲染到两个 composer 的预览区 —— */
  function renderAttachmentChips() {
    var $containers = $welcomeAttachments.add($chatAttachments);
    if (pendingAttachments.length === 0) {
      $containers.empty().attr('hidden', 'hidden');
      $('.chip-upload').removeClass('has-attachments');
      return;
    }
    var html = pendingAttachments.map(function (a) {
      return (
        '<div class="attachment-chip" data-id="' + a.id + '" title="' + escapeHtml(a.name) + '">' +
          '<span class="ac-ic"><i class="fa fa-paperclip"></i></span>' +
          '<span class="ac-name">' + escapeHtml(a.name) + '</span>' +
          '<span class="ac-size">' + formatFileSize(a.size) + '</span>' +
          '<button type="button" class="attachment-chip-remove" aria-label="移除">' +
            '<i class="fa fa-times"></i>' +
          '</button>' +
        '</div>'
      );
    }).join('');
    $containers.html(html).removeAttr('hidden');
    $('.chip-upload').addClass('has-attachments');
  }

  /* —— 文件大小友好显示 —— */
  function formatFileSize(bytes) {
    if (bytes == null || isNaN(bytes)) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  /* ===================================================
   * 真实上传接口预留
   * 演示模式 (ENABLE_REAL_UPLOAD = false) 下不会真正打到 UPLOAD_API_URL，
   * 直接 resolve 一个 { skipped: true } 占位结果。
   * 未来切到真后端：把 ENABLE_REAL_UPLOAD 设 true，并把 UPLOAD_API_URL 指向真接口即可。
   * ================================================= */
  function uploadAttachments(attachments, sessionId) {
    var dfd = $.Deferred();
    if (!attachments || attachments.length === 0) {
      return dfd.resolve({ skipped: true, reason: 'empty' }).promise();
    }
    if (!ENABLE_REAL_UPLOAD) {
      return dfd.resolve({ skipped: true, reason: 'demo' }).promise();
    }
    var formData = new FormData();
    formData.append('sessionId', sessionId);
    attachments.forEach(function (a) {
      if (a.file) formData.append('files', a.file, a.name);
    });
    return $.ajax({
      url: UPLOAD_API_URL,
      method: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      timeout: 60000
    });
  }

  /* ===================================================
   * 模型下拉：点 chip-model 弹出/收起，选完同步两个 composer
   * ================================================= */
  function bindModelMenu() {
    // 进页时先把两个菜单内容渲染出来
    renderModelMenus();
    syncModelLabels();

    // 触发器（事件委托：两个 composer 共用同一处理）
    $(document).on('click', '[data-model-trigger]', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var $btn  = $(this);
      var $menu = $btn.siblings('.model-menu');
      var open  = $btn.hasClass('is-open');
      // 先全部收起，再视情况打开当前
      closeAllModelMenus();
      if (!open) openModelMenu($btn, $menu);
    });

    // 点菜单项
    $(document).on('click', '.model-menu-item', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var id = $(this).data('model-id');
      if (id) selectModel(String(id));
      closeAllModelMenus();
    });

    // 点弹层内部不关
    $(document).on('click', '.model-menu', function (e) {
      e.stopPropagation();
    });

    // 点空白处 / 按 ESC 关
    $(document).on('click', function () { closeAllModelMenus(); });
    $(document).on('keydown', function (e) {
      if (e.key === 'Escape') closeAllModelMenus();
    });
  }

  function renderModelMenus() {
    var html = MODELS.map(function (m) {
      var selected = (m.id === currentModelId);
      return (
        '<button type="button" class="model-menu-item' + (selected ? ' is-selected' : '') + '" ' +
                'role="option" aria-selected="' + selected + '" data-model-id="' + m.id + '">' +
          '<span class="mm-ic">✧</span>' +
          '<span class="mm-name">' + escapeHtml(m.label) + '</span>' +
          '<span class="mm-check"><i class="fa fa-check"></i></span>' +
        '</button>'
      );
    }).join('');
    $('.model-menu').html(html);
  }

  function openModelMenu($btn, $menu) {
    $btn.addClass('is-open').attr('aria-expanded', 'true');
    $menu.removeAttr('hidden');
    // 下一帧再加 is-open，触发过渡动画
    requestAnimationFrame(function () { $menu.addClass('is-open'); });
  }

  function closeAllModelMenus() {
    $('.chip-model.is-open').removeClass('is-open').attr('aria-expanded', 'false');
    $('.model-menu.is-open').removeClass('is-open');
    // 等过渡结束再 hidden，防闪烁
    setTimeout(function () {
      $('.model-menu').not('.is-open').attr('hidden', 'hidden');
    }, 160);
  }

  function selectModel(id) {
    var m = MODELS.find(function (x) { return x.id === id; });
    if (!m) return;
    currentModelId = id;
    syncModelLabels();
    renderModelMenus();   // 重新渲染所有菜单的勾选态
  }

  function syncModelLabels() {
    var m = MODELS.find(function (x) { return x.id === currentModelId; }) || MODELS[0];
    $('[data-model-label]').text(m.label);
  }

  /* ===================================================
   * 其它绑定
   * ================================================= */
  function bindMisc() {
    // Messages 区折叠：用 class 控制 SVG 旋转，避免重写 .caret 内容
    $msgToggle.on('click', function () {
      $msgList.slideToggle(160);
      $(this).toggleClass('is-collapsed');
    });

    // 「+ 新消息」：开启新会话槽位，回到欢迎页
    // 历史会话保留在 sessions 里，侧边栏不变；新 sessionId 会在用户首次发消息时分配
    $newChatBtn.on('click', function (e) {
      e.preventDefault();
      goToWelcome();
    });

    // 侧边栏会话项点击：切到该会话
    // 用事件委托，自动覆盖动态新增的 .session-item
    $msgList.on('click', '.session-item', function () {
      var id = $(this).data('id');
      if (id) loadSession(String(id));
    });

    // 「使用统计」点击：切到统计页
    $statsToggle.on('click', function (e) {
      e.preventDefault();
      goToStats();
    });
  }

  /* ===================================================
   * 视图切换：回到欢迎页（保留所有历史会话）
   * ================================================= */
  function goToWelcome() {
    currentSessionId = null;
    $msgList.find('.session-item').removeClass('active');
    $statsToggle.removeClass('is-active');
    $chatView.addClass('hidden');
    $statsView.addClass('hidden');
    $welcomeView.removeClass('hidden');
    $chatList.empty();              // 清掉对话视图，避免下一次加载时叠加
    $chatInput.val('').css('height', 'auto');
    $welcomeInput.val('').css('height', 'auto').focus();
  }

  /* ===================================================
   * 视图切换：加载并渲染指定 session 的全部历史
   * ================================================= */
  function loadSession(id) {
    var sess = sessions[id];
    if (!sess) return;

    currentSessionId = id;

    // 切换到对话视图
    $welcomeView.addClass('hidden');
    $statsView.addClass('hidden');
    $chatView.removeClass('hidden');
    $statsToggle.removeClass('is-active');

    // 重渲染消息列表
    $chatList.empty();
    sess.messages.forEach(function (m) {
      if (m.role === 'user') {
        appendUserMessage(m.content, m.attachments || []);
      } else if (m.role === 'assistant') {
        appendFinalAssistantMessage(m.content);
      }
    });

    // 侧边栏 active 高亮
    $msgList.find('.session-item').removeClass('active');
    if (sess.$item) sess.$item.addClass('active');

    // 输入区清空 + 聚焦，便于继续追问
    $chatInput.val('').css('height', 'auto').focus();
    scrollToBottom();
  }

  /* ===================================================
   * 视图切换：使用统计页
   * ================================================= */
  function goToStats() {
    currentSessionId = null;
    $msgList.find('.session-item').removeClass('active');
    $welcomeView.addClass('hidden');
    $chatView.addClass('hidden');
    $statsView.removeClass('hidden');
    $statsToggle.addClass('is-active');

    renderStatsCards();
    renderUsageTable();
  }

  /* ===================================================
   * 发送消息主流程
   * ================================================= */
  function sendMessage(text) {
    // 0. 快照本次发送携带的附件，并立即清空待发送队列 + UI
    var attachmentsAtSend = pendingAttachments.slice();
    pendingAttachments = [];
    renderAttachmentChips();

    // 1. 切换到对话视图（首条消息时）
    if ($welcomeView.is(':visible')) {
      $welcomeView.addClass('hidden');
      $chatView.removeClass('hidden');
    }

    // 2. 准备 session：不存在则创建（默认标题），存在则沿用
    var isFirstMessage = false;
    if (!currentSessionId) {
      currentSessionId = 's_' + Date.now();
      sessions[currentSessionId] = {
        id: currentSessionId,
        title: DEFAULT_SESSION_TITLE,
        messages: [],
        $item: null
      };
      ensureSessionsParent();
      addSessionItem(currentSessionId, DEFAULT_SESSION_TITLE);
      isFirstMessage = true;
    } else if (sessions[currentSessionId].messages.length === 0) {
      // 同一 sessionId 下首条消息（理论分支，保险）
      isFirstMessage = true;
    }

    // 3. 首条消息：用前 8 字（或不足直接用）覆盖默认标题；
    //    若用户没输入文字仅发了附件，用首个文件名做标题
    if (isFirstMessage) {
      var titleSource = text || (attachmentsAtSend[0] && attachmentsAtSend[0].name) || DEFAULT_SESSION_TITLE;
      var newTitle = titleSource.length > TITLE_MAX_LEN
        ? titleSource.slice(0, TITLE_MAX_LEN) + '…'
        : titleSource;
      sessions[currentSessionId].title = newTitle;
      updateSessionItemTitle(currentSessionId, newTitle);
    }

    // 4. 渲染 + 持久化用户消息
    //    注意：只把元数据 (name/size/type) 写进历史，不持有原始 File 对象
    appendUserMessage(text, attachmentsAtSend);
    sessions[currentSessionId].messages.push({
      role: 'user',
      content: text,
      attachments: attachmentsAtSend.map(function (a) {
        return { name: a.name, size: a.size, type: a.type };
      })
    });

    // 5. 清空输入框
    $welcomeInput.val('').css('height', 'auto');
    $chatInput.val('').css('height', 'auto');

    // 6. 渲染助手占位（带工具调用 + loading）
    var $assistant = appendAssistantPlaceholder();

    // 7. 捕获本次发送时的 sessionId，避免回调时用户已切到别的会话
    var sessionIdAtSend = currentSessionId;
    var startedAt = Date.now();

    // 7.1 附件上传（演示模式下是 no-op；接真后端时自动生效）
    //     这里不 await，按 fire-and-forget 处理；如未来需要"先上传完再触发对话"，
    //     可改成 uploadAttachments(...).done(function(){ $.ajax(...) })。
    uploadAttachments(attachmentsAtSend, sessionIdAtSend);

    $.ajax({
      url: FAKE_API_URL,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        sessionId: sessionIdAtSend,
        message: text,
        model: currentModelId,
        // 仅传元数据给对话接口，真正的文件由 uploadAttachments 负责
        attachments: attachmentsAtSend.map(function (a) {
          return { name: a.name, size: a.size, type: a.type };
        }),
        timestamp: startedAt
      }),
      timeout: 15000
    })
      .done(function (/* resp */) {
        // 真实场景：使用 resp 渲染。当前演示固定回答。
      })
      .fail(function (xhr, status) {
        console.warn('[fake-api] request failed:', status);
      })
      .always(function () {
        var elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));

        // 永远写入原 session（即使用户已切换走）
        if (sessions[sessionIdAtSend]) {
          sessions[sessionIdAtSend].messages.push({
            role: 'assistant',
            content: FIXED_ANSWER
          });
        }

        // 仅当用户仍停留在该 session 时，才在 DOM 里替换占位
        if (currentSessionId === sessionIdAtSend) {
          finalizeAssistantMessage($assistant, FIXED_ANSWER, elapsed);
        }
        // 否则占位节点已被切换会话时的 $chatList.empty() 清掉，无需操作
      });
  }

  /* ===================================================
   * 渲染：用户消息
   * ================================================= */
  function appendUserMessage(text, attachments) {
    var hasText = !!(text && String(text).length > 0);
    var hasAtts = attachments && attachments.length > 0;

    var html =
      '<div class="msg msg-user">' +
        '<div class="avatar avatar-user">L</div>' +
        '<div class="msg-body">' +
          '<div class="user-name-tag">Lin Yun</div>' +
          (hasAtts ? '<div class="user-attachments"></div>' : '') +
          (hasText ? '<div class="bubble"></div>' : '') +
        '</div>' +
      '</div>';
    var $node = $(html);
    if (hasText) $node.find('.bubble').text(text);
    if (hasAtts) {
      var attHtml = attachments.map(function (a) {
        return (
          '<div class="user-attachment-chip" title="' + escapeHtml(a.name) + '">' +
            '<span class="att-ic"><i class="fa fa-file-o"></i></span>' +
            '<span class="att-meta">' +
              '<span class="att-name">' + escapeHtml(a.name) + '</span>' +
              '<span class="att-size">' + formatFileSize(a.size) + '</span>' +
            '</span>' +
          '</div>'
        );
      }).join('');
      $node.find('.user-attachments').html(attHtml);
    }
    $chatList.append($node);
    scrollToBottom();
  }

  /* ===================================================
   * 渲染：助手占位（含工具调用 + loading）
   * ================================================= */
  function appendAssistantPlaceholder() {
    var html =
      '<div class="msg msg-assistant">' +
        '<div class="avatar"><img src="assets/logo.svg" alt="bot"/></div>' +
        '<div class="msg-body">' +
          '<div class="msg-header"><span class="name">' + ASSISTANT_NAME + '</span></div>' +
          '<div class="msg-status js-status">' +
            '<span class="js-status-text">处理中...</span>' +
            '<span class="caret-sm">▾</span>' +
          '</div>' +
          '<div class="tool-list">' +
            '<div class="tool-item">' +
              '<span class="tool-ic">›</span>' +
              '<span class="tool-name">Read</span>' +
              '<span class="tool-arg">…6136-5293-817403/agent-core/skills/alibaba-hot-product-insight/SKILL.md</span>' +
              '<span class="tool-caret">›</span>' +
            '</div>' +
            '<div class="tool-item">' +
              '<span class="tool-ic">›</span>' +
              '<span class="tool-name">Cron list</span>' +
              '<span class="tool-caret">›</span>' +
            '</div>' +
            '<div class="tool-item">' +
              '<span class="tool-ic">›</span>' +
              '<span class="tool-name">Bash</span>' +
              '<span class="tool-arg">Read skill memory for hot product insight</span>' +
              '<span class="tool-arg">python /Users/linyun/.claw/accounts/1755404055/agen…</span>' +
            '</div>' +
          '</div>' +
          '<div class="loading-dots js-loading"><span></span><span></span><span></span></div>' +
          '<div class="msg-text js-text" style="display:none"></div>' +
        '</div>' +
      '</div>';
    var $node = $(html);
    $chatList.append($node);
    scrollToBottom();
    return $node;
  }

  /* ===================================================
   * 渲染：助手最终答案（更新进行中的占位节点）
   * ================================================= */
  function finalizeAssistantMessage($node, answer, elapsedSec) {
    $node.find('.js-status-text').text('已处理 ' + elapsedSec + '秒');
    $node.find('.js-loading').remove();
    $node.find('.js-text').show().text(answer);
    scrollToBottom();
  }

  /* ===================================================
   * 渲染：从历史回放助手最终答案（无工具调用、无 loading）
   * ================================================= */
  function appendFinalAssistantMessage(answer) {
    var html =
      '<div class="msg msg-assistant">' +
        '<div class="avatar"><img src="assets/logo.svg" alt="bot"/></div>' +
        '<div class="msg-body">' +
          '<div class="msg-header"><span class="name">' + ASSISTANT_NAME + '</span></div>' +
          '<div class="msg-text"></div>' +
        '</div>' +
      '</div>';
    var $node = $(html);
    $node.find('.msg-text').text(answer);
    $chatList.append($node);
    return $node;
  }

  /* ===================================================
   * 左侧 Messages 区会话登记
   * ================================================= */
  function ensureSessionsParent() {
    if ($msgList.find('.session-parent').length === 0) {
      $msgList.append(
        '<div class="session-parent">' +
          '<span class="session-icon">A</span>' +
          '<span class="session-title">' + ASSISTANT_NAME + '</span>' +
          '<span class="unread">1</span>' +
        '</div>'
      );
    }
  }

  function addSessionItem(id, title) {
    $msgList.find('.session-item').removeClass('active');
    var $item = $(
      '<div class="session-item active" data-id="' + id + '">' +
        '<span class="session-title"></span>' +
        '<span class="caret-sm" style="color:#9aa0a6">○</span>' +
      '</div>'
    );
    $item.find('.session-title').text(title);
    $msgList.append($item);

    if (sessions[id]) sessions[id].$item = $item;
    // 点击切换由 bindMisc 里的事件委托统一处理
  }

  function updateSessionItemTitle(id, title) {
    var sess = sessions[id];
    if (sess && sess.$item) sess.$item.find('.session-title').text(title);
  }

  /* ===================================================
   * 工具函数
   * ================================================= */
  function scrollToBottom() {
    requestAnimationFrame(function () {
      $chatScroll.scrollTop($chatScroll[0].scrollHeight);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* =====================================================
   * 使用统计：渲染上栏概览卡 + 下栏明细表 + 分页
   * ===================================================== */
  function renderStatsCards() {
    var s = USAGE_STATS;
    var remaining = Math.max(0, s.quotaTotal - s.quotaUsed);
    var remainPct = s.quotaTotal > 0 ? (remaining / s.quotaTotal) * 100 : 0;

    var cards = [
      {
        tone: 'tone-balance',
        label: '本月剩余额度',
        value: '$' + formatMoney(remaining),
        sub:
          '<div class="stat-card-bar"><div class="stat-card-bar-fill" style="width:' +
          remainPct.toFixed(1) + '%"></div></div>' +
          '<span>' + remainPct.toFixed(1) + '% / $' + formatMoney(s.quotaTotal) + '</span>',
        icon:
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
            '<rect x="3" y="6" width="14" height="12" rx="2"/>' +
            '<rect x="17" y="9" width="3" height="6" rx="1"/>' +
          '</svg>'
      },
      {
        tone: 'tone-cost',
        label: '总费用',
        value: '$' + formatMoney(s.quotaUsed),
        sub: '本月累计消费',
        icon:
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M12 4v16M16 8c0-2-2-3-4-3s-4 1-4 3 2 3 4 3 4 1 4 3-2 3-4 3-4-1-4-3"/>' +
          '</svg>'
      },
      {
        tone: 'tone-req',
        label: '总请求数',
        value: formatNumber(s.requestCount),
        sub: '次调用',
        icon:
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
            '<rect x="4"  y="13" width="3" height="7" rx="1"/>' +
            '<rect x="10.5" y="9"  width="3" height="11" rx="1"/>' +
            '<rect x="17" y="5"  width="3" height="15" rx="1"/>' +
          '</svg>'
      },
      {
        tone: 'tone-in',
        label: '输入 Tokens',
        value: formatNumber(s.inputTokens),
        sub: 'Prompt 总量',
        icon:
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M12 4v14M6 12l6 6 6-6"/>' +
          '</svg>'
      },
      {
        tone: 'tone-out',
        label: '输出 Tokens',
        value: formatNumber(s.outputTokens),
        sub: '回复总量',
        icon:
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M12 20V6M6 12l6-6 6 6"/>' +
          '</svg>'
      }
    ];

    var html = cards.map(function (c) {
      return (
        '<div class="stat-card ' + c.tone + '">' +
          '<div class="stat-card-head">' +
            '<span class="stat-card-ic">' + c.icon + '</span>' +
            '<span class="stat-card-label">' + escapeHtml(c.label) + '</span>' +
          '</div>' +
          '<div class="stat-card-value">' + c.value + '</div>' +
          '<div class="stat-card-sub">' + c.sub + '</div>' +
        '</div>'
      );
    }).join('');

    $statsCards.html(html);
  }

  function renderUsageTable() {
    var total = USAGE_RECORDS.length;
    var pageSize = USAGE_PAGE_SIZE;
    var totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (usagePage > totalPages) usagePage = totalPages;
    if (usagePage < 1) usagePage = 1;

    $usageMeta.text('共 ' + total + ' 条 · 第 ' + usagePage + ' / ' + totalPages + ' 页');

    var start = (usagePage - 1) * pageSize;
    var slice = USAGE_RECORDS.slice(start, start + pageSize);

    if (slice.length === 0) {
      $usageTbody.html('<tr><td colspan="4" class="usage-empty">暂无使用记录</td></tr>');
    } else {
      var rowsHtml = slice.map(function (r) {
        return (
          '<tr>' +
            '<td class="cell-time">' + escapeHtml(r.time) + '</td>' +
            '<td class="cell-prompt" title="' + escapeHtml(r.prompt) + '">' + escapeHtml(r.prompt) + '</td>' +
            '<td class="cell-tokens">' + formatNumber(r.tokens) + '</td>' +
            '<td class="cell-cost">$' + formatMoney(r.cost) + '</td>' +
          '</tr>'
        );
      }).join('');
      $usageTbody.html(rowsHtml);
    }

    renderUsagePager(totalPages);
  }

  function renderUsagePager(totalPages) {
    var html = '';
    html += '<span class="page-info">每页 ' + USAGE_PAGE_SIZE + ' 条</span>';
    html += '<button type="button" data-page="prev"' + (usagePage <= 1 ? ' disabled' : '') + '>上一页</button>';

    // 紧凑分页：始终显示首末页 + 当前页前后各 1 页，中间用 …
    var pages = buildPageList(usagePage, totalPages);
    pages.forEach(function (p) {
      if (p === '…') {
        html += '<span class="page-ellipsis">…</span>';
      } else {
        html += '<button type="button" data-page="' + p + '"' +
                (p === usagePage ? ' class="is-active"' : '') + '>' + p + '</button>';
      }
    });

    html += '<button type="button" data-page="next"' + (usagePage >= totalPages ? ' disabled' : '') + '>下一页</button>';
    $usagePager.html(html);
  }

  // 生成紧凑页码序列：1 ... cur-1 cur cur+1 ... N
  function buildPageList(cur, total) {
    if (total <= 7) {
      var arr = [];
      for (var i = 1; i <= total; i++) arr.push(i);
      return arr;
    }
    var pages = new Set([1, total, cur, cur - 1, cur + 1]);
    var sorted = Array.from(pages).filter(function (p) { return p >= 1 && p <= total; }).sort(function (a, b) { return a - b; });
    var result = [];
    for (var j = 0; j < sorted.length; j++) {
      if (j > 0 && sorted[j] - sorted[j - 1] > 1) result.push('…');
      result.push(sorted[j]);
    }
    return result;
  }

  // 分页按钮事件委托
  $(document).on('click', '#usagePager button', function () {
    var raw = $(this).data('page');
    var totalPages = Math.max(1, Math.ceil(USAGE_RECORDS.length / USAGE_PAGE_SIZE));
    if (raw === 'prev') usagePage = Math.max(1, usagePage - 1);
    else if (raw === 'next') usagePage = Math.min(totalPages, usagePage + 1);
    else usagePage = parseInt(raw, 10) || 1;
    renderUsageTable();
    // 滚回表格顶部，避免长页时翻页后视觉迷失
    var scroll = $('#statsView .stats-scroll')[0];
    if (scroll) scroll.scrollTo({ top: scroll.scrollTop, behavior: 'auto' });
  });

  /* —— 数字 / 金额格式化 —— */
  function formatNumber(n) {
    return Number(n).toLocaleString('en-US');
  }
  function formatMoney(n) {
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* —— 生成 mock 使用明细：随机分布在过去 7 天，最后按时间倒序排列 —— */
  function generateMockUsageRecords(count) {
    var sample = [
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
    var now = Date.now();
    var windowMs = 7 * 24 * 60 * 60 * 1000;   // 过去 7 天

    var arr = [];
    for (var i = 0; i < count; i++) {
      var ts = now - Math.floor(Math.random() * windowMs);
      var tokens = 1500 + Math.round(Math.random() * 6500);
      var cost = +(tokens / 1000 * 0.003).toFixed(2);   // 单价：每 1k tokens $0.003
      arr.push({
        ts: ts,
        time: formatDateTime(new Date(ts)),
        prompt: sample[i % sample.length],
        tokens: tokens,
        cost: cost
      });
    }

    // 按时间戳倒序：最新请求排在最前
    arr.sort(function (a, b) { return b.ts - a.ts; });
    return arr;
  }

  function formatDateTime(d) {
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
           ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  /* =====================================================
   * 「联系我们」弹窗（与主站 ../js/main.js 行为一致）
   * ===================================================== */
  var $contactModal = $('#contactModal');

  function openContactModal() {
    if (!$contactModal.length) return;
    $contactModal.addClass('is-open').attr('aria-hidden', 'false');
    $('body').addClass('contact-modal-open');
    setTimeout(function () {
      $contactModal.find('.contact-modal-close').trigger('focus');
    }, 50);
  }
  function closeContactModal() {
    if (!$contactModal.length) return;
    $contactModal.removeClass('is-open').attr('aria-hidden', 'true');
    $('body').removeClass('contact-modal-open');
  }

  $(document).on('click', '[data-open-contact-modal]', function (e) {
    e.preventDefault();
    openContactModal();
  });
  $(document).on('click', '[data-close-contact-modal]', function (e) {
    e.preventDefault();
    closeContactModal();
  });
  $(document).on('keydown', function (e) {
    if (e.key === 'Escape' && $contactModal.hasClass('is-open')) {
      closeContactModal();
    }
  });

  function showCopyToast() {
    var $toast = $('#cmToast');
    $toast.addClass('is-show');
    clearTimeout(showCopyToast._t);
    showCopyToast._t = setTimeout(function () {
      $toast.removeClass('is-show');
    }, 1600);
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(showCopyToast).catch(legacyCopy);
    } else {
      legacyCopy();
    }
    function legacyCopy() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showCopyToast(); } catch (err) {}
      document.body.removeChild(ta);
    }
  }
  $(document).on('click', '.cm-copy', function (e) {
    e.preventDefault();
    e.stopPropagation();
    var text = $(this).data('copy');
    if (text) copyText(String(text));
  });

  /* =====================================================
   * 「技能」管理弹窗
   * ===================================================== */
  var $skillsModal = $('#skillsModal');
  var $skillsList  = $('#skillsList');
  var $skillsCount = $('#skillsCount');

  function openSkillsModal() {
    if (!$skillsModal.length) return;
    renderSkills();
    $skillsModal.addClass('is-open').attr('aria-hidden', 'false');
    $('body').addClass('skills-modal-open');
  }
  function closeSkillsModal() {
    if (!$skillsModal.length) return;
    $skillsModal.removeClass('is-open').attr('aria-hidden', 'true');
    $('body').removeClass('skills-modal-open');
  }

  function renderSkills() {
    $skillsCount.text(SKILLS.length);
    if (SKILLS.length === 0) {
      $skillsList.html('<div class="skills-empty">暂无已安装的技能</div>');
      return;
    }
    var html = SKILLS.map(function (s) {
      var version = s.version
        ? '<span class="skill-version">' + escapeHtml(s.version) + '</span>'
        : '';
      return (
        '<div class="skill-row' + (s.enabled ? '' : ' is-disabled') + '" data-skill-id="' + s.id + '">' +
          '<span class="skill-icon" aria-hidden="true">' +
            '<i class="fa fa-file-text-o"></i>' +
          '</span>' +
          '<div class="skill-meta">' +
            '<div class="skill-title-row">' +
              '<span class="skill-title">' + escapeHtml(s.title) + '</span>' +
              version +
            '</div>' +
            '<div class="skill-desc" title="' + escapeHtml(s.desc) + '">' + escapeHtml(s.desc) + '</div>' +
          '</div>' +
          '<label class="skill-toggle" aria-label="启用/停用 ' + escapeHtml(s.title) + '">' +
            '<input type="checkbox"' + (s.enabled ? ' checked' : '') + ' />' +
            '<span class="slider"></span>' +
          '</label>' +
          '<button type="button" class="skill-remove" aria-label="移除该技能" title="移除">' +
            '<i class="fa fa-times"></i>' +
          '</button>' +
        '</div>'
      );
    }).join('');
    $skillsList.html(html);
  }

  /* —— 事件绑定（事件委托） —— */
  $(document).on('click', '[data-open-skills]', function (e) {
    e.preventDefault();
    openSkillsModal();
  });
  $(document).on('click', '[data-close-skills]', function (e) {
    e.preventDefault();
    closeSkillsModal();
  });
  $(document).on('keydown', function (e) {
    if (e.key === 'Escape' && $skillsModal.hasClass('is-open')) closeSkillsModal();
  });

  // 切换技能开关
  $skillsList.on('change', '.skill-toggle input', function () {
    var id = parseInt($(this).closest('.skill-row').data('skill-id'), 10);
    var skill = SKILLS.find(function (s) { return s.id === id; });
    if (skill) {
      skill.enabled = this.checked;
      $(this).closest('.skill-row').toggleClass('is-disabled', !skill.enabled);
    }
  });

  // 移除技能（直接从列表里删，演示用；真实场景建议二次确认）
  $skillsList.on('click', '.skill-remove', function () {
    var $row = $(this).closest('.skill-row');
    var id = parseInt($row.data('skill-id'), 10);
    SKILLS = SKILLS.filter(function (s) { return s.id !== id; });
    $row.css({ transition: 'opacity 180ms ease, transform 180ms ease', opacity: 0, transform: 'translateX(8px)' });
    setTimeout(function () {
      $row.remove();
      $skillsCount.text(SKILLS.length);
      if (SKILLS.length === 0) {
        $skillsList.html('<div class="skills-empty">暂无已安装的技能</div>');
      }
    }, 180);
  });

  // 刷新按钮：纯视觉旋转一圈，作为反馈
  $(document).on('click', '#skillsRefreshBtn', function () {
    var $btn = $(this);
    if ($btn.hasClass('is-spinning')) return;
    $btn.addClass('is-spinning');
    setTimeout(function () { $btn.removeClass('is-spinning'); }, 700);
  });

  /* =====================================================
   * Demo 受限功能提示弹窗
   * 任何带 [data-demo-notice="<feature名>"] 的元素被点击后弹窗
   * ===================================================== */
  var $demoNotice = $('#demoNoticeModal');
  var $demoNoticeFeature = $('#demoNoticeFeature');

  function openDemoNotice(featureName) {
    if (!$demoNotice.length) return;
    $demoNoticeFeature.text(featureName ? '「' + featureName + '」' : '该功能');
    $demoNotice.addClass('is-open').attr('aria-hidden', 'false');
    $('body').addClass('notice-modal-open');
    setTimeout(function () {
      $demoNotice.find('.notice-btn-ghost').trigger('focus');
    }, 50);
  }
  function closeDemoNotice() {
    if (!$demoNotice.length) return;
    $demoNotice.removeClass('is-open').attr('aria-hidden', 'true');
    $('body').removeClass('notice-modal-open');
  }

  $(document).on('click', '[data-demo-notice]', function (e) {
    e.preventDefault();
    openDemoNotice($(this).data('demo-notice'));
  });
  $(document).on('click', '[data-close-notice]', function (e) {
    e.preventDefault();
    closeDemoNotice();
  });
  $(document).on('keydown', function (e) {
    if (e.key === 'Escape' && $demoNotice.hasClass('is-open')) closeDemoNotice();
  });
  // 弹窗里的「联系我们」：先关 notice，再开 contact
  $(document).on('click', '#demoNoticeContact', function (e) {
    e.preventDefault();
    closeDemoNotice();
    openContactModal();
  });
})(jQuery);
