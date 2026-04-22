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
    '建议优先布局 SKU、配套发布短视频素材，并结合店铺装修做主题专区，以承接增量流量。';

  // 助手元信息
  var ASSISTANT_NAME = '国际站生意助手';

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

  /* ----------- 状态 ----------- */
  var currentSessionId = null;   // 当前会话 id
  var sessions = {};             // sessionId -> { title, messages: [] }

  /* ===================================================
   * 初始化
   * ================================================= */
  $(function () {
    renderPrompts();
    bindTabs();
    bindComposer($welcomeInput, $welcomeSend);
    bindComposer($chatInput, $chatSend);
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
        if (text) sendMessage(text);
      }
    });

    $sendBtn.on('click', function () {
      var text = $.trim($input.val());
      if (text) sendMessage(text);
    });
  }

  /* ===================================================
   * 其它绑定
   * ================================================= */
  function bindMisc() {
    // Messages 区折叠
    $msgToggle.on('click', function () {
      var $caret = $(this).find('.caret');
      $msgList.toggle();
      $caret.text($msgList.is(':visible') ? '▾' : '▸');
    });

    // 新消息：回到欢迎页
    $newChatBtn.on('click', function (e) {
      e.preventDefault();
      currentSessionId = null;
      $('.session-item').removeClass('active');
      $chatView.addClass('hidden');
      $welcomeView.removeClass('hidden');
      $welcomeInput.val('').css('height', 'auto').focus();
    });
  }

  /* ===================================================
   * 发送消息主流程
   * ================================================= */
  function sendMessage(text) {
    // 1. 切换到对话视图（首条消息时）
    if ($welcomeView.is(':visible')) {
      $welcomeView.addClass('hidden');
      $chatView.removeClass('hidden');
    }

    // 2. 创建会话（如不存在）
    if (!currentSessionId) {
      currentSessionId = 's_' + Date.now();
      var title = text.length > 18 ? text.slice(0, 18) + '…' : text;
      sessions[currentSessionId] = { title: title, messages: [] };
      ensureSessionsParent();
      addSessionItem(currentSessionId, title);
    }

    // 3. 渲染用户消息
    appendUserMessage(text);
    sessions[currentSessionId].messages.push({ role: 'user', content: text });

    // 4. 清空输入框
    $welcomeInput.val('').css('height', 'auto');
    $chatInput.val('').css('height', 'auto');

    // 5. 渲染助手占位（带工具调用 + loading）
    var $assistant = appendAssistantPlaceholder();

    // 6. 发起「假 URL」HTTP 请求
    var startedAt = Date.now();

    $.ajax({
      url: FAKE_API_URL,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        sessionId: currentSessionId,
        message: text,
        timestamp: startedAt
      }),
      timeout: 15000
    })
      .done(function (resp) {
        // 真实场景：使用 resp 渲染。当前演示固定回答。
        // console.log('[fake-api] response:', resp);
      })
      .fail(function (xhr, status) {
        // 失败也用固定回答兜底
        console.warn('[fake-api] request failed:', status);
      })
      .always(function () {
        var elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        finalizeAssistantMessage($assistant, FIXED_ANSWER, elapsed);
        sessions[currentSessionId].messages.push({
          role: 'assistant',
          content: FIXED_ANSWER
        });
      });
  }

  /* ===================================================
   * 渲染：用户消息
   * ================================================= */
  function appendUserMessage(text) {
    var html =
      '<div class="msg msg-user">' +
        '<div class="avatar avatar-user">L</div>' +
        '<div class="msg-body">' +
          '<div class="user-name-tag">Lin Xie</div>' +
          '<div class="bubble"></div>' +
        '</div>' +
      '</div>';
    var $node = $(html);
    $node.find('.bubble').text(text);
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
              '<span class="tool-arg">python /Users/linxie/.claw/accounts/1755404055/agen…</span>' +
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
   * 渲染：助手最终答案
   * ================================================= */
  function finalizeAssistantMessage($node, answer, elapsedSec) {
    $node.find('.js-status-text').text('已处理 ' + elapsedSec + '秒');
    $node.find('.js-loading').remove();
    $node.find('.js-text').show().text(answer);
    scrollToBottom();
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
    $('.session-item').removeClass('active');
    var $item = $(
      '<div class="session-item active" data-id="' + id + '">' +
        '<span class="session-title"></span>' +
        '<span class="caret-sm" style="color:#9aa0a6">○</span>' +
      '</div>'
    );
    $item.find('.session-title').text(title);
    $msgList.append($item);

    $item.on('click', function () {
      // 简化版：仅切换样式，不重新渲染历史
      $('.session-item').removeClass('active');
      $(this).addClass('active');
    });
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
})(jQuery);
