/**
 * Site language switch (zh / en). Default: zh.
 * Elements: [data-i18n], [data-i18n-html], [data-i18n-aria], [data-i18n-alt], [data-i18n-title]
 */
(function () {
	'use strict';

	var STORAGE_KEY = 'skylang-lang';
	var DEFAULT_LANG = 'zh';

	var EN = {
		'page.title': 'LINGYUN AI',
		'brand.name': 'LINGYUN AI',
		'brand.home': 'LINGYUN AI — Back to home',
		'lang.switch': 'Switch language',

		'nav.services': 'Products',
		'nav.demo': 'Experience Center',
		'nav.about': 'About Us',
		'nav.contact': 'Contact',

		'hero.title1': ' Professional Enterprise AI Assistants',
		'hero.title2': 'Bridging the Last Mile of AI to Enterprise',
		'hero.cta1': 'Explore Services',
		'hero.cta2': 'Try Demo Now',
		'hero.cta3': 'Contact Us',

		'case.title': 'Use Cases',
		'case.tab1': 'Smart Support',
		'case.tab2': 'Data Analysis',
		'case.tab3': 'Long-form Summary',
		'case.tab4': 'Industry Expert',

		'case1.title': 'Enterprise-integrated, precise smart customer service',
		'case1.head': 'Live Support · AI Assistant',
		'case1.user': 'My trip was cancelled. How do I refund my flight ticket?',
		'case1.ai':
			'<p><span class="hl">Refund a flight ticket</span> — follow these steps:</p>' +
			'<ol>' +
			'<li><span class="hl">Open Orders</span>: In the App, tap "Me" at the bottom right, then "All Orders"; or on the website go to "Me" → "Order Management".</li>' +
			'<li><span class="hl">Find the order</span>: Locate the flight ticket you need to refund in the order list.</li>' +
			'<li><span class="hl">Request a refund</span>: Tap "Change / Refund" next to the order, open order details, then tap "Refund".</li>' +
			'<li><span class="hl">Confirm and submit</span>: Review the refund fee and refund amount in the dialog, then tap "Confirm Refund".</li>' +
			'<li><span class="hl">Await review &amp; refund</span>: Ctrip support typically reviews within 1–3 business days. After approval, the airline processes the refund; funds usually arrive in 7–15 business days.</li>' +
			'</ol>',

		'case2.title': 'Strong quantitative skills for business report analysis',
		'case2.head': 'Data Analysis · AI Assistant',
		'case2.chart.kline': 'Candlestick · Daily',
		'case2.chart.aria': 'Stock index trend',
		'case2.user': 'Describe the trend of this stock index over the past 3 months.',
		'case2.ai':
			'<p>Starting before <span class="hl">2025-01</span>, the index first rose, peaked at <span class="hl">3494.87</span>, then declined. During the decline there were minor rebounds, but the overall downtrend was clear, reaching a relative low of <span class="hl">3140.98</span> near the end of <span class="hl">Jan 2025</span>.</p>' +
			'<p>From early <span class="hl">2025-02</span>, the index rebounded somewhat, then stayed volatile through February with mixed ups and downs.</p>' +
			'<p>In <span class="hl">2025-03</span>, frequent swings continued.</p>',

		'case3.title': 'Capture key points from long documents to boost efficiency',
		'case3.head': 'Contract Analysis · AI Assistant',
		'case3.file': 'Standard House Lease Contract.txt',
		'case3.user': 'What potential risks does this contract pose to Party B?',
		'case3.ai':
			'<p>This contract presents multiple risks for Party B, covering <span class="hl">breach, property use, cost bearing, safety liability, and termination</span>. Party B should review carefully before signing and negotiate amendments with Party A if needed.</p>' +
			'<ol>' +
			'<li><span class="hl">Breach risk</span>: Party B must strictly follow terms on rent, use, and renewal. Late rent beyond five days allows Party A to reclaim the property, forfeit the deposit, and require immediate move-out.</li>' +
			'<li><span class="hl">Property-use risk</span>: Party B is responsible for the property and fixtures. Damage caused by Party B must be repaired and compensated; failure to restore at lease end may lead to deposit deductions.</li>' +
			'<li><span class="hl">Cost risk</span>: Party B pays utilities and related fees. Disputes or unreasonable charges fall on Party B. Late rent also incurs penalties.</li>' +
			'<li><span class="hl">Safety liability</span>: During the lease, Party B bears full safety responsibility for fires, falling objects, burglary, etc., even if caused by negligence — with potential financial and legal exposure.</li>' +
			'</ol>',

		'case4.title': 'Learn from industry knowledge bases to become an expert assistant',
		'case4.head': 'TCM Diagnosis · AI Assistant',
		'case4.user': 'I have serious dampness lately — please prescribe a herbal tea formula.',
		'case4.rx': 'Prescription',
		'case4.herbs': 'Herbs',
		'case4.herbs.val':
			'Poria (Fuling) 15g, Coix seed (Yiyiren) 30g, Atractylodes (Cangzhu) 10g, White atractylodes (Baizhu) 15g, Alisma (Zexie) 10g, Agastache (Huoxiang) 10g (add late), Eupatorium (Peilan) 10g (add late), Tangerine peel (Chenpi) 10g, Magnolia bark (Houpo) 10g, Honey-fried licorice (Zhigancao) 6g.',
		'case4.usage': 'Usage',
		'case4.usage.val':
			'Soak the herbs in 1000–1200 ml water for 30 minutes. Bring to a boil on high heat, then simmer on low for 30–40 minutes. Take 300–400 ml of decoction, split into two warm doses morning and evening. Add Huoxiang and Peilan in the last 5–10 minutes to reduce loss of volatile compounds.',
		'case4.explain': 'Formula notes',
		'case4.explain.val':
			'<span class="hl">Poria</span> drains dampness and strengthens the spleen; <span class="hl">Coix seed</span> drains dampness, fortifies the spleen, and clears obstruction — together as sovereign herbs. <span class="hl">Cangzhu &amp; Baizhu</span> dry dampness and tonify the spleen; <span class="hl">Alisma</span> drains dampness via urination — as minister herbs. <span class="hl">Huoxiang &amp; Peilan</span> aromatically transform dampness; <span class="hl">Chenpi</span> regulates qi and dries phlegm; <span class="hl">Houpo</span> dries dampness and directs qi downward — as assistants. <span class="hl">Honey-fried licorice</span> harmonizes as the envoy. Overall effect: <span class="hl">strengthen spleen, dispel dampness, and aromatically resolve turbidity</span>.',

		'claw.title': 'Customize Your Exclusive AI — Claw Lobster',
		'claw.sub': 'Tailored Agent apps for your business scenarios',
		'claw.f1.title': 'Custom Enterprise AI Assistant',
		'claw.f1.desc': 'Combine internal knowledge bases and workflows into a ready-to-use conversational assistant.',
		'claw.f2.title': 'Open Claw Deployment',
		'claw.f2.desc': 'Open-source Agent framework with one-click private deployment, flexible model and system integration.',
		'claw.f3.title': 'On-prem Large Model Deployment',
		'claw.f3.desc': 'Local inference for mainstream open-source models — data stays in-house, secure and controllable.',
		'claw.cta': 'Try Demo Now',
		'claw.alt': 'Claw lobster mascot',

		'about.title': 'About Us',
		'about.h1': 'Top-tier University Team',
		'about.h1.sub': 'Tsinghua · CMU core members',
		'about.h2': '10K-GPU Cluster Training',
		'about.h2.sub': 'Hands-on H100 / A100 experience',
		'about.h3': 'Cross-domain Delivery',
		'about.h3.sub': 'Q&A Search · Intelligent Creation',
		'about.p1':
			'Our team brings together seasoned software engineers and algorithm researchers, with members from Tsinghua University, Carnegie Mellon University (CMU), and other leading institutions worldwide.',
		'about.p2':
			'In AI and large models, the team has deep hands-on experience: from training foundation models on 10K-GPU clusters (H100, A100) to post-training such as fine-tuning and reinforcement learning. We have also delivered results in Q&A search, intelligent creation, and more — driving industry progress and lasting value for clients.',
		'about.avatar': 'Tsinghua University emblem',

		'contact.title': 'Contact Us',
		'contact.person': 'Mr. Liu: 13609756994',
		'copyright': 'Copyright © 2025 SkyLang AI | Beijing ICP No. 2025115658',

		'modal.title': 'Contact Us',
		'modal.sub': 'Reach out anytime — we will arrange a Demo and consulting session',
		'modal.phone': 'Phone',
		'modal.phone.val': 'Mr. Liu · 13609756994',
		'modal.email': 'Email',
		'modal.copyPhone': 'Copy phone',
		'modal.copyEmail': 'Copy email',
		'modal.copied': 'Copied to clipboard',
		'modal.close': 'Close',
		'backToTop': 'Back to top'
	};

	function currentLang() {
		try {
			var saved = localStorage.getItem(STORAGE_KEY);
			if (saved === 'en' || saved === 'zh') return saved;
		} catch (e) {}
		return DEFAULT_LANG;
	}

	function cacheOriginals() {
		document.querySelectorAll('[data-i18n]').forEach(function (el) {
			if (el.getAttribute('data-i18n-zh') == null) {
				el.setAttribute('data-i18n-zh', el.textContent);
			}
		});
		document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
			if (el.getAttribute('data-i18n-zh-html') == null) {
				el.setAttribute('data-i18n-zh-html', el.innerHTML);
			}
		});
		document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
			if (el.getAttribute('data-i18n-zh-aria') == null) {
				el.setAttribute('data-i18n-zh-aria', el.getAttribute('aria-label') || '');
			}
		});
		document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
			if (el.getAttribute('data-i18n-zh-alt') == null) {
				el.setAttribute('data-i18n-zh-alt', el.getAttribute('alt') || '');
			}
		});
		document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
			if (el.getAttribute('data-i18n-zh-title') == null) {
				el.setAttribute('data-i18n-zh-title', document.title);
			}
		});
	}

	function applyLang(lang) {
		if (lang !== 'en' && lang !== 'zh') lang = DEFAULT_LANG;

		document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
		document.documentElement.setAttribute('data-lang', lang);

		document.querySelectorAll('[data-i18n]').forEach(function (el) {
			var key = el.getAttribute('data-i18n');
			if (lang === 'en' && EN[key] != null) {
				el.textContent = EN[key];
			} else {
				var zh = el.getAttribute('data-i18n-zh');
				if (zh != null) el.textContent = zh;
			}
		});

		document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
			var key = el.getAttribute('data-i18n-html');
			if (lang === 'en' && EN[key] != null) {
				el.innerHTML = EN[key];
			} else {
				var zhHtml = el.getAttribute('data-i18n-zh-html');
				if (zhHtml != null) el.innerHTML = zhHtml;
			}
		});

		document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
			var key = el.getAttribute('data-i18n-aria');
			if (lang === 'en' && EN[key] != null) {
				el.setAttribute('aria-label', EN[key]);
			} else {
				var zhAria = el.getAttribute('data-i18n-zh-aria');
				if (zhAria != null) el.setAttribute('aria-label', zhAria);
			}
		});

		document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
			var key = el.getAttribute('data-i18n-alt');
			if (lang === 'en' && EN[key] != null) {
				el.setAttribute('alt', EN[key]);
			} else {
				var zhAlt = el.getAttribute('data-i18n-zh-alt');
				if (zhAlt != null) el.setAttribute('alt', zhAlt);
			}
		});

		var titleEl = document.querySelector('[data-i18n-title]');
		if (titleEl) {
			var tKey = titleEl.getAttribute('data-i18n-title');
			if (lang === 'en' && EN[tKey] != null) {
				document.title = EN[tKey];
			} else {
				var zhTitle = titleEl.getAttribute('data-i18n-zh-title');
				if (zhTitle != null) document.title = zhTitle;
			}
		}

		try {
			localStorage.setItem(STORAGE_KEY, lang);
		} catch (e) {}

		document.dispatchEvent(
			new CustomEvent('skylang:langchange', { detail: { lang: lang } })
		);
	}

	function toggleLang() {
		applyLang(currentLang() === 'en' ? 'zh' : 'en');
	}

	function bindSwitch() {
		var btn = document.getElementById('langSwitch');
		if (!btn) return;
		btn.addEventListener('click', function (e) {
			e.preventDefault();
			toggleLang();
		});
	}

	cacheOriginals();
	applyLang(currentLang());
	bindSwitch();

	window.SkyLangI18n = {
		getLang: currentLang,
		setLang: applyLang,
		toggle: toggleLang
	};
})();
