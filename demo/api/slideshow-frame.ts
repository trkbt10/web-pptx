/**
 * Slideshow Frame - Self-contained slideshow engine for iframe embedding
 *
 * This script runs inside a sandboxed iframe and handles:
 * - Fetching slide data from API (self-contained)
 * - Dual-layer slide rendering (current + next for transitions)
 * - ECMA-376 slide transitions (21 types)
 * - Step-by-step animation execution
 *
 * Communication via postMessage:
 *
 * Parent → iframe:
 *   { type: "init", fileId: string }  // Initialize with file ID
 *   { type: "next" }                   // Advance to next step/slide
 *   { type: "prev" }                   // Go to previous step/slide
 *   { type: "goto", slideNumber: number } // Jump to specific slide
 *
 * iframe → Parent:
 *   { type: "ready" }
 *   { type: "stateChange", currentSlide, currentStep, totalSlides, totalSteps }
 *   { type: "error", message: string }
 */

export function generateSlideshowFrameScript(
  width: number,
  height: number
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000;
    }

    .stage {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .slide-layer {
      position: absolute;
      width: ${width}px;
      height: ${height}px;
      background: #fff;
      transform-origin: center center;
      overflow: hidden;
    }

    .slide-layer > * {
      width: 100% !important;
      height: 100% !important;
    }
  </style>
</head>
<body>
  <div class="stage">
    <div id="layer0" class="slide-layer"></div>
    <div id="layer1" class="slide-layer"></div>
  </div>

  <script>
  (function() {
    'use strict';

    const WIDTH = ${width};
    const HEIGHT = ${height};

    // =============================================================================
    // State - 全てiframe内で管理
    // =============================================================================

    let fileId = null;
    let currentSlideNum = 1;
    let currentStepIndex = -1;  // -1 = 初期状態（アニメーション前）
    let totalSlides = 1;
    let slideData = null;       // 現在のスライドデータ
    let isTransitioning = false;

    // 2つのレイヤー
    const layers = [
      document.getElementById('layer0'),
      document.getElementById('layer1')
    ];
    let activeIndex = 0;

    function getActiveLayer() { return layers[activeIndex]; }
    function getInactiveLayer() { return layers[1 - activeIndex]; }

    // =============================================================================
    // Utilities
    // =============================================================================

    function getScale() {
      const stage = document.querySelector('.stage');
      const scaleX = stage.clientWidth / WIDTH;
      const scaleY = stage.clientHeight / HEIGHT;
      return Math.min(scaleX, scaleY);
    }

    function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    function notifyState() {
      parent.postMessage({
        type: 'stateChange',
        currentSlide: currentSlideNum,
        currentStep: currentStepIndex,
        totalSlides: totalSlides,
        totalSteps: slideData ? slideData.steps.length : 0
      }, '*');
    }

    function notifyError(message) {
      parent.postMessage({ type: 'error', message: message }, '*');
    }

    // =============================================================================
    // Layer Management
    // =============================================================================

    function initializeLayers() {
      const scale = getScale();
      layers[0].style.transform = 'scale(' + scale + ')';
      layers[0].style.zIndex = '2';
      layers[0].style.opacity = '1';

      layers[1].style.transform = 'scale(' + scale + ')';
      layers[1].style.zIndex = '1';
      layers[1].style.opacity = '0';
    }

    function fitSlides() {
      const scale = getScale();
      layers[0].style.transform = 'scale(' + scale + ')';
      layers[1].style.transform = 'scale(' + scale + ')';
    }

    window.addEventListener('resize', fitSlides);
    initializeLayers();

    // =============================================================================
    // API Fetching
    // =============================================================================

    async function fetchSlideData(slideNum) {
      if (!fileId) return null;
      try {
        const response = await fetch('/api/slideshow/' + encodeURIComponent(fileId) + '/' + slideNum);
        if (!response.ok) throw new Error('Failed to fetch slide ' + slideNum);
        return await response.json();
      } catch (err) {
        notifyError(err.message);
        return null;
      }
    }

    // =============================================================================
    // Slide Loading
    // =============================================================================

    function loadSlideToLayer(layer, data) {
      layer.innerHTML = data.htmlContent;

      // 初期状態で非表示にすべきシェイプを隠す
      (data.initiallyHiddenShapes || []).forEach(function(id) {
        const el = layer.querySelector('[data-ooxml-id="' + id + '"]');
        if (el) {
          el.style.opacity = '0';
          el.style.visibility = 'hidden';
        }
      });
    }

    // =============================================================================
    // Transitions
    // =============================================================================

    async function executeTransition(nextData) {
      const type = slideData?.transition?.type || 'fade';
      const dur = slideData?.transition?.duration || 500;
      const scale = getScale();

      const outgoing = getActiveLayer();
      const incoming = getInactiveLayer();

      // 1. incoming に次のスライドをロード
      loadSlideToLayer(incoming, nextData);

      // 2. incoming の初期状態を設定（トランジションなし）
      incoming.style.transition = 'none';
      incoming.style.zIndex = '3';
      incoming.style.opacity = '0';
      incoming.style.transform = 'scale(' + scale + ')';
      incoming.style.clipPath = '';
      incoming.style.filter = '';

      // 3. トランジションスタイルを取得・適用
      const styles = getTransitionStyles(type, scale);
      Object.assign(outgoing.style, styles.outgoing.initial);
      Object.assign(incoming.style, styles.incoming.initial);

      // 4. reflow を強制
      void incoming.offsetHeight;
      void outgoing.offsetHeight;

      // 5. トランジションを設定
      outgoing.style.transition = 'all ' + dur + 'ms ease-in-out';
      incoming.style.transition = 'all ' + dur + 'ms ease-in-out';

      // 6. 次のフレームで最終状態を適用（アニメーション開始）
      await new Promise(function(resolve) {
        requestAnimationFrame(function() {
          Object.assign(outgoing.style, styles.outgoing.final);
          Object.assign(incoming.style, styles.incoming.final);
          resolve();
        });
      });

      // 7. アニメーション完了を待つ
      await delay(dur + 50);

      // 8. 役割を入れ替え
      activeIndex = 1 - activeIndex;

      // 9. 新しいアクティブレイヤーの状態を確定
      const newActive = getActiveLayer();
      const newInactive = getInactiveLayer();

      newActive.style.transition = 'none';
      newActive.style.zIndex = '2';
      newActive.style.opacity = '1';
      newActive.style.transform = 'scale(' + scale + ')';
      newActive.style.clipPath = '';
      newActive.style.filter = '';

      newInactive.style.transition = 'none';
      newInactive.style.zIndex = '1';
      newInactive.style.opacity = '0';
      newInactive.style.transform = 'scale(' + scale + ')';
      newInactive.style.clipPath = '';
      newInactive.style.filter = '';
      newInactive.innerHTML = '';
    }

    function getTransitionStyles(type, scale) {
      var s = scale || 1;
      switch (type) {
        case 'fade':
          return {
            outgoing: { initial: { opacity: '1' }, final: { opacity: '0' } },
            incoming: { initial: { opacity: '0' }, final: { opacity: '1' } }
          };
        case 'push':
          return {
            outgoing: { initial: { transform: 'scale(' + s + ') translateX(0)' }, final: { transform: 'scale(' + s + ') translateX(-100%)' } },
            incoming: { initial: { opacity: '1', transform: 'scale(' + s + ') translateX(100%)' }, final: { transform: 'scale(' + s + ') translateX(0)' } }
          };
        case 'wipe':
          return {
            outgoing: { initial: { opacity: '1' }, final: { opacity: '1' } },
            incoming: { initial: { opacity: '1', clipPath: 'inset(0 100% 0 0)' }, final: { clipPath: 'inset(0 0 0 0)' } }
          };
        case 'cover':
          return {
            outgoing: { initial: { opacity: '1' }, final: { opacity: '1' } },
            incoming: { initial: { opacity: '1', transform: 'scale(' + s + ') translateX(100%)' }, final: { transform: 'scale(' + s + ') translateX(0)' } }
          };
        case 'circle':
          return {
            outgoing: { initial: { opacity: '1' }, final: { opacity: '1' } },
            incoming: { initial: { opacity: '1', clipPath: 'circle(0% at 50% 50%)' }, final: { clipPath: 'circle(100% at 50% 50%)' } }
          };
        case 'diamond':
          return {
            outgoing: { initial: { opacity: '1' }, final: { opacity: '1' } },
            incoming: { initial: { opacity: '1', clipPath: 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)' }, final: { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' } }
          };
        case 'zoom':
          return {
            outgoing: { initial: { opacity: '1', transform: 'scale(' + s + ')' }, final: { opacity: '0', transform: 'scale(' + (s * 0.5) + ')' } },
            incoming: { initial: { opacity: '0', transform: 'scale(' + (s * 1.5) + ')' }, final: { opacity: '1', transform: 'scale(' + s + ')' } }
          };
        case 'dissolve':
          return {
            outgoing: { initial: { opacity: '1', filter: 'blur(0)' }, final: { opacity: '0', filter: 'blur(8px)' } },
            incoming: { initial: { opacity: '0', filter: 'blur(8px)' }, final: { opacity: '1', filter: 'blur(0)' } }
          };
        case 'split':
          return {
            outgoing: { initial: { opacity: '1' }, final: { opacity: '1' } },
            incoming: { initial: { opacity: '1', clipPath: 'inset(0 50% 0 50%)' }, final: { clipPath: 'inset(0 0 0 0)' } }
          };
        default:
          return {
            outgoing: { initial: { opacity: '1' }, final: { opacity: '0' } },
            incoming: { initial: { opacity: '1' }, final: { opacity: '1' } }
          };
      }
    }

    // =============================================================================
    // Animation Execution
    // =============================================================================

    async function executeStep(stepIndex) {
      if (!slideData || stepIndex >= slideData.steps.length) return;

      const step = slideData.steps[stepIndex];
      for (var i = 0; i < step.animations.length; i++) {
        await processNode(step.animations[i]);
      }
    }

    async function processNode(node) {
      if (!node || typeof node !== 'object') return;

      var nodeType = String(node.type || 'unknown');
      var children = Array.isArray(node.children) ? node.children : [];
      var nodeDelay = typeof node.delay === 'number' ? node.delay : 0;

      if (nodeDelay > 0) await delay(nodeDelay);

      switch (nodeType) {
        case 'parallel':
          await Promise.all(children.map(processNode));
          break;
        case 'sequence':
          for (var i = 0; i < children.length; i++) {
            await processNode(children[i]);
          }
          break;
        case 'set':
          await processSet(node);
          break;
        case 'animate':
          await processAnimate(node);
          break;
        case 'animateEffect':
          await processAnimateEffect(node);
          break;
        default:
          for (var j = 0; j < children.length; j++) {
            await processNode(children[j]);
          }
      }
    }

    async function processSet(node) {
      var target = node.target;
      if (!target || !target.shapeId) return;

      var el = getActiveLayer().querySelector('[data-ooxml-id="' + target.shapeId + '"]');
      if (!el) return;

      if (node.attribute === 'style.visibility' && node.value === 'visible') {
        el.style.visibility = 'visible';
      }
      if (node.attributeNames && node.attributeNames.includes('style.visibility')) {
        el.style.visibility = 'visible';
      }

      await delay(typeof node.duration === 'number' ? node.duration : 1);
    }

    async function processAnimate(node) {
      var target = node.target;
      if (!target || !target.shapeId) return;

      var el = getActiveLayer().querySelector('[data-ooxml-id="' + target.shapeId + '"]');
      if (!el) return;

      var duration = node.duration === 'indefinite' ? 1000 :
                     typeof node.duration === 'number' ? node.duration : 1000;

      el.style.transition = 'all ' + duration + 'ms ease-out';
      await delay(duration);
    }

    async function processAnimateEffect(node) {
      var target = node.target;
      if (!target || !target.shapeId) return;

      var el = getActiveLayer().querySelector('[data-ooxml-id="' + target.shapeId + '"]');
      if (!el) return;

      var filter = String(node.filter || 'fade');
      var duration = node.duration === 'indefinite' ? 1000 :
                     typeof node.duration === 'number' ? node.duration : 1000;

      applyEffect(el, filter, duration, true);
      await delay(duration);
    }

    function applyEffect(el, filter, duration, entrance) {
      var type = (filter.match(/^(\\w+)/) || ['fade'])[0].toLowerCase();

      el.style.transition = 'none';
      el.style.visibility = 'visible';
      if (entrance) {
        el.style.opacity = '0';
      }
      void el.offsetHeight;
      requestAnimationFrame(function() {
        el.style.transition = 'opacity ' + duration + 'ms ease-out';
        el.style.opacity = entrance ? '1' : '0';
      });
    }

    // =============================================================================
    // Navigation Commands
    // =============================================================================

    async function init(fid) {
      fileId = fid;
      currentSlideNum = 1;
      currentStepIndex = -1;

      // 最初のスライドを取得
      slideData = await fetchSlideData(1);
      if (!slideData) return;

      totalSlides = slideData.totalSlides;

      // アクティブレイヤーに表示
      loadSlideToLayer(getActiveLayer(), slideData);

      notifyState();
    }

    async function next() {
      if (isTransitioning || !slideData) return;

      const totalSteps = slideData.steps.length;

      if (currentStepIndex < totalSteps - 1) {
        // 次のアニメーションステップ
        currentStepIndex++;
        await executeStep(currentStepIndex);
        notifyState();
      } else if (currentSlideNum < totalSlides) {
        // 次のスライドへトランジション
        isTransitioning = true;

        const nextData = await fetchSlideData(currentSlideNum + 1);
        if (nextData) {
          await executeTransition(nextData);

          slideData = nextData;
          currentSlideNum++;
          currentStepIndex = -1;
          notifyState();
        }

        isTransitioning = false;
      }
    }

    async function prev() {
      if (isTransitioning || !slideData) return;

      if (currentStepIndex > -1) {
        // アニメーションをリセット
        currentStepIndex = -1;
        loadSlideToLayer(getActiveLayer(), slideData);
        notifyState();
      } else if (currentSlideNum > 1) {
        // 前のスライドへ
        isTransitioning = true;

        const prevData = await fetchSlideData(currentSlideNum - 1);
        if (prevData) {
          await executeTransition(prevData);

          slideData = prevData;
          currentSlideNum--;
          currentStepIndex = -1;

          // 前のスライドは全アニメーション完了状態で表示
          showAllShapes();
          notifyState();
        }

        isTransitioning = false;
      }
    }

    async function goto(slideNum) {
      if (isTransitioning || !slideData) return;
      if (slideNum < 1 || slideNum > totalSlides || slideNum === currentSlideNum) return;

      isTransitioning = true;

      const targetData = await fetchSlideData(slideNum);
      if (targetData) {
        await executeTransition(targetData);

        slideData = targetData;
        currentSlideNum = slideNum;
        currentStepIndex = -1;
        notifyState();
      }

      isTransitioning = false;
    }

    function showAllShapes() {
      var elements = getActiveLayer().querySelectorAll('[data-ooxml-id]');
      elements.forEach(function(el) {
        el.style.transition = 'none';
        el.style.opacity = '1';
        el.style.visibility = 'visible';
        el.style.transform = '';
        el.style.clipPath = '';
        el.style.filter = '';
      });
    }

    // =============================================================================
    // Message Handler
    // =============================================================================

    window.addEventListener('message', function(event) {
      var data = event.data;
      if (!data || typeof data !== 'object') return;

      switch (data.type) {
        case 'init':
          init(data.fileId);
          break;
        case 'next':
          next();
          break;
        case 'prev':
          prev();
          break;
        case 'goto':
          goto(data.slideNumber);
          break;
      }
    });

    // Notify parent that frame is ready
    parent.postMessage({ type: 'ready' }, '*');
  })();
  </script>
</body>
</html>
`;
}
