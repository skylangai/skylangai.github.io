
(function($) {
	
	"use strict";
	


		/* ==============================================
	    Preloader -->
	     =============================================== */

	    $(window).on('load', function () {
	        $("#status").fadeOut();
	        $("#preloader").delay(350).fadeOut("slow");
	        $("body").delay(350).css({ "overflow": "visible" });

	    });

	/* ==============================================
	    Menu hide/show on scroll -->
	     =============================================== */
	    var ost = 0;
	    $(window).on('scroll', function() {

	        var cOst = $(this).scrollTop();

	        if(cOst > 300){
	              $('nav').addClass('nav-background');

	        }else{
	              $('nav').removeClass('nav-background');
	        }

	        if(cOst == 0)
	        {
	            $('.navbar').addClass('top-nav-collapse');

	        } else if(cOst > ost)
	        {
	            $('.navbar').addClass('top-nav-collapse').removeClass('default');
	        } else 
	        {
	            $('.navbar').addClass('default').removeClass('top-nav-collapse');
	        }
	        ost = cOst;
	    });

	    /* End of Menu hide/show on scroll */ 

	    /* ==============================================
	      Application case tabs
	      - Streams each .chat-bubble inside the active pane character-by-character
	        (preserving inner HTML structure: <p>, <ol>, <span class="hl">, etc.)
	      - Auto-advances to the next tab after stream completes + short pause
	      - Pauses cycle on hover; never interrupts an in-flight stream
	      =============================================== */
	    var STREAM_USER_DELAY  = 20;    // ms per char for user bubbles (typing)
	    var STREAM_AI_DELAY    = 9;    // ms per char for AI bubbles (faster stream)
	    var STREAM_INTER_GAP   = 280;   // ms gap between consecutive bubbles
	    var TAB_HOLD_AFTER_DONE = 2400; // ms to hold finished tab before advancing

	    var caseAutoPaused   = false;
	    var caseChainTimer   = null;   // schedules next tab after stream done
	    var streamTickTimers = [];     // active per-character setTimeouts
	    var streamingActive  = false;

	    function clearStreamTimers() {
	        while (streamTickTimers.length) {
	            clearTimeout(streamTickTimers.shift());
	        }
	    }
	    function clearChainTimer() {
	        if (caseChainTimer) { clearTimeout(caseChainTimer); caseChainTimer = null; }
	    }

	    // Walk DOM, collect text nodes in document order
	    function collectTextNodes(node, out) {
	        if (node.nodeType === 3) {
	            out.push(node);
	        } else if (node.nodeType === 1) {
	            for (var i = 0; i < node.childNodes.length; i++) {
	                collectTextNodes(node.childNodes[i], out);
	            }
	        }
	    }

	    // Reset bubble to its original HTML, then blank out all text nodes;
	    // returns an array of { node, text } snapshots to feed back gradually.
	    function prepareBubbleForStream($bubble) {
	        if (typeof $bubble.data('originalHtml') === 'undefined') {
	            $bubble.data('originalHtml', $bubble.html());
	        }
	        $bubble.html($bubble.data('originalHtml'));
	        var nodes = [];
	        collectTextNodes($bubble[0], nodes);
	        var snapshots = [];
	        for (var i = 0; i < nodes.length; i++) {
	            snapshots.push({ node: nodes[i], text: nodes[i].nodeValue });
	            nodes[i].nodeValue = '';
	        }
	        return snapshots;
	    }

	    // Stream every bubble in the given pane, in DOM order, then schedule next tab.
	    // All bubbles are blanked upfront so nothing leaks before its turn comes.
	    function streamPane(target) {
	        clearStreamTimers();
	        clearChainTimer();
	        streamingActive = false;

	        var $pane = $('#' + target);
	        if (!$pane.length) return;
	        var $bubbles = $pane.find('.chat-bubble');
	        if (!$bubbles.length) { scheduleNextTab(); return; }

	        // Pre-blank every bubble + cache snapshots so later bubbles don't flash
	        var queue = [];
	        $bubbles.each(function () {
	            queue.push({ $bubble: $(this), snapshots: prepareBubbleForStream($(this)) });
	        });

	        streamingActive = true;
	        var idx = 0;
	        function next() {
	            if (idx >= queue.length) {
	                streamingActive = false;
	                scheduleNextTab();
	                return;
	            }
	            var item = queue[idx];
	            var isUser = item.$bubble.closest('.chat-msg').hasClass('user');
	            var delay = isUser ? STREAM_USER_DELAY : STREAM_AI_DELAY;
	            streamSnapshots(item.snapshots, delay, function () {
	                idx++;
	                streamTickTimers.push(setTimeout(next, STREAM_INTER_GAP));
	            }, item.$bubble);
	        }
	        next();
	    }

	    // Stream pre-captured snapshots (after prepareBubbleForStream)
	    function streamSnapshots(snapshots, charDelay, onDone, $bubble) {
	        if ($bubble) $bubble.addClass('is-streaming');
	        var ni = 0, ci = 0;
	        function tick() {
	            if (ni >= snapshots.length) {
	                if ($bubble) $bubble.removeClass('is-streaming');
	                if (onDone) onDone();
	                return;
	            }
	            var s = snapshots[ni];
	            if (ci < s.text.length) {
	                var step = 1;
	                while (ci + step < s.text.length &&
	                       /\s/.test(s.text.charAt(ci + step - 1))) {
	                    step++;
	                }
	                ci += step;
	                s.node.nodeValue = s.text.substring(0, ci);
	                streamTickTimers.push(setTimeout(tick, charDelay));
	            } else {
	                s.node.nodeValue = s.text;
	                ni++; ci = 0;
	                streamTickTimers.push(setTimeout(tick, charDelay));
	            }
	        }
	        tick();
	    }

	    function scheduleNextTab() {
	        clearChainTimer();
	        if (caseAutoPaused) return;
	        caseChainTimer = setTimeout(function () {
	            if (caseAutoPaused) return;
	            nextCaseTab();
	        }, TAB_HOLD_AFTER_DONE);
	    }

	    function activateCaseTab($btn) {
	        if (!$btn || !$btn.length) return;
	        var target = $btn.data('tab');
	        $('.case-tab-btn').removeClass('active');
	        $btn.addClass('active');
	        $('.case-tab-pane').removeClass('active');
	        $('#' + target).addClass('active');
	        streamPane(target);
	    }

	    function nextCaseTab() {
	        var $btns = $('.case-tab-btn');
	        if (!$btns.length) return;
	        var idx = $btns.index($btns.filter('.active'));
	        var next = (idx + 1) % $btns.length;
	        activateCaseTab($btns.eq(next));
	    }

	    // Manual click — switch and restart cycle (re-streams new pane)
	    $(document).on('click', '.case-tab-btn', function () {
	        activateCaseTab($(this));
	    });

	    // Pause cycle on hover; do NOT interrupt an ongoing stream
	    $(document).on('mouseenter', '.case-tabs-nav, .case-tabs-content', function () {
	        caseAutoPaused = true;
	        clearChainTimer();
	    });
	    $(document).on('mouseleave', '.case-tabs-nav, .case-tabs-content', function () {
	        if ($('.case-tabs-nav:hover, .case-tabs-content:hover').length === 0) {
	            caseAutoPaused = false;
	            // If we're currently between streams (waiting), resume the schedule.
	            if (!streamingActive) scheduleNextTab();
	        }
	    });

	    // Kick off: stream the initially-active pane
	    var $initActive = $('.case-tab-btn.active').first();
	    if ($initActive.length) {
	        streamPane($initActive.data('tab'));
	    }
	    /* End of Application case tabs */
	    

	   /* ==============================================
	     Target menu section  -->
	     =============================================== */

	  $('.navbar, .home-btn, .holder ').find('a[href*="#"]:not([href="#"])').on('click', function () {
	        if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
	            var target = $(this.hash);
	            target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
	            if (target.length) {
	                $('html,body').animate({
	                    scrollTop: (target.offset().top - 0)
	                }, 1000);
	                if ($('.navbar-toggle').css('display') != 'none') {
	                    $(this).parents('.container').find(".navbar-toggle").trigger("click");
	                }
	                return false;
	            }
	        }     
	    });


    /* ==============================================
     Mailchimp  -->
     =============================================== */

    $('#mc-form').ajaxChimp({
        url: 'http://codextree.us10.list-manage.com/subscribe/post?u=b02e4f21e264536eff4820875&amp;id=4d57faf2cb'
            /* Replace Your AjaxChimp Subscription Link */
    });


     /* ==============================================
     scorll animation  -->
     =============================================== */

      window.sr = ScrollReveal();

      sr.reveal('.reveal-bottom', {
        origin: 'bottom',
        distance: '20px',
        duration: 800,
        delay: 400,
        opacity: 1,
        scale: 0,
        easing: 'linear',
        reset: true
      });

      sr.reveal('.reveal-top', {
        origin: 'top',
        distance: '20px',
        duration: 800,
        delay: 400,
        opacity: 1,
        scale: 0,
        easing: 'linear',
        reset: true
      });

      sr.reveal('.reveal-left', {
        origin: 'left',
        distance: '20px',
        duration: 800,
        delay: 400,
        opacity: 1,
        scale: 0,
        easing: 'linear',
        reset: true
      });

      sr.reveal('.reveal-right', {
        origin: 'right',
        distance: '20px',
        duration: 800,
        delay: 400,
        opacity: 1,
        scale: 0,
        easing: 'linear',
        reset: true
      });
        
      sr.reveal('.reveal-left-fade', {
        origin: 'left',
        distance: '20px',
        duration: 800,
        delay: 0,
        opacity: 0,
        scale: 0,
        easing: 'linear',
        mobile: false
      });

      sr.reveal('.reveal-right-fade', {
        origin: 'right',
        distance: '20px',
        duration: 800,
        delay: 0,
        opacity: 0,
        scale: 0,
        easing: 'linear',
        mobile: false
      });
        
      sr.reveal('.reveal-right-delay', {
        origin: 'right',
        distance: '20px',
        duration: 1000,
        delay: 0,
        opacity: 0,
        scale: 0,
        easing: 'linear',
        mobile: false
      }, 500);
        
      sr.reveal('.reveal-bottom-fade', {
        origin: 'bottom',
        distance: '20px',
        duration: 800,
        delay: 0,
        opacity: 0,
        scale: 0,
        easing: 'linear',
        mobile: false
      });


	
	
	
	
})(window.jQuery);



	  // google map
      function initMap() {
        var chicago = {lat: 41.85, lng: -87.65};
        var indianapolis = {lat: 39.79, lng: -86.14};

        var map = new google.maps.Map(document.getElementById('gmap'), {
          center: chicago,
          scrollwheel: false,
          zoom: 7
        });

        var directionsDisplay = new google.maps.DirectionsRenderer({
          map: map
        });

        // Set destination, origin and travel mode.
        var request = {
          destination: indianapolis,
          origin: chicago,
          travelMode: 'DRIVING'
        };

        // Pass the directions request to the directions service.
        var directionsService = new google.maps.DirectionsService();
        directionsService.route(request, function(response, status) {
          if (status == 'OK') {
            // Display the route on the map.
            directionsDisplay.setDirections(response);
          }
        });
      }
