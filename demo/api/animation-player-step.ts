/**
 * Step-based Animation Player for Slideshow
 *
 * Generates JavaScript code to be embedded in the slide iframe
 * for step-by-step animation execution via postMessage.
 *
 * Protocol:
 *   Parent → iframe:
 *     { type: "initialize", hiddenShapes: string[] }
 *     { type: "executeStep", stepIndex: number, animations: TimeNode[] }
 *     { type: "reset" }
 *     { type: "showAll" }
 *
 *   iframe → Parent:
 *     { type: "ready" }
 *     { type: "stepComplete", stepIndex: number }
 */

export function generateStepPlayerScript(): string {
  return `
(function() {
  'use strict';

  // =============================================================================
  // Effect Implementations
  // =============================================================================

  function buildTransition(properties, duration, easing) {
    return properties.map(p => p + ' ' + duration + 'ms ' + easing).join(', ');
  }

  function applyFade(el, duration, entrance, easing) {
    el.style.transition = 'none';
    el.style.opacity = entrance ? '0' : '1';
    void el.offsetHeight;
    requestAnimationFrame(() => {
      el.style.transition = buildTransition(['opacity'], duration, easing);
      el.style.opacity = entrance ? '1' : '0';
    });
  }

  function applySlide(el, duration, direction, entrance, easing) {
    const transforms = {
      left: 'translateX(-100%)',
      right: 'translateX(100%)',
      up: 'translateY(-100%)',
      down: 'translateY(100%)'
    };
    const startTransform = transforms[direction] || 'translateX(-100%)';
    const endTransform = 'translateX(0) translateY(0)';

    el.style.transition = 'none';
    if (entrance) {
      el.style.opacity = '0';
      el.style.transform = startTransform;
    } else {
      el.style.opacity = '1';
      el.style.transform = endTransform;
    }
    void el.offsetHeight;
    requestAnimationFrame(() => {
      el.style.transition = buildTransition(['transform', 'opacity'], duration, easing);
      if (entrance) {
        el.style.opacity = '1';
        el.style.transform = endTransform;
      } else {
        el.style.opacity = '0';
        el.style.transform = startTransform;
      }
    });
  }

  function applyWipe(el, duration, direction, entrance, easing) {
    const clipPaths = {
      right: { start: 'inset(0 100% 0 0)', end: 'inset(0 0 0 0)' },
      left: { start: 'inset(0 0 0 100%)', end: 'inset(0 0 0 0)' },
      down: { start: 'inset(0 0 100% 0)', end: 'inset(0 0 0 0)' },
      up: { start: 'inset(100% 0 0 0)', end: 'inset(0 0 0 0)' }
    };
    const clip = clipPaths[direction] || clipPaths.right;

    el.style.transition = 'none';
    el.style.opacity = '1';
    el.style.clipPath = entrance ? clip.start : clip.end;
    void el.offsetHeight;
    requestAnimationFrame(() => {
      el.style.transition = buildTransition(['clip-path'], duration, easing);
      el.style.clipPath = entrance ? clip.end : clip.start;
    });
  }

  function applyBox(el, duration, direction, entrance, easing) {
    const center = 'inset(50% 50% 50% 50%)';
    const full = 'inset(0 0 0 0)';

    el.style.transition = 'none';
    el.style.opacity = '1';
    el.style.clipPath = entrance ? (direction === 'in' ? center : full) : full;
    void el.offsetHeight;
    requestAnimationFrame(() => {
      el.style.transition = buildTransition(['clip-path'], duration, easing);
      el.style.clipPath = full;
    });
  }

  function applyCircle(el, duration, direction, entrance, easing) {
    const center = 'circle(0% at 50% 50%)';
    const full = 'circle(100% at 50% 50%)';

    el.style.transition = 'none';
    el.style.opacity = '1';
    el.style.clipPath = entrance ? center : full;
    void el.offsetHeight;
    requestAnimationFrame(() => {
      el.style.transition = buildTransition(['clip-path'], duration, easing);
      el.style.clipPath = full;
    });
  }

  function applyDiamond(el, duration, direction, entrance, easing) {
    const center = 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)';
    const full = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';

    el.style.transition = 'none';
    el.style.opacity = '1';
    el.style.clipPath = entrance ? center : full;
    void el.offsetHeight;
    requestAnimationFrame(() => {
      el.style.transition = buildTransition(['clip-path'], duration, easing);
      el.style.clipPath = full;
    });
  }

  function applyDissolve(el, duration, entrance, easing) {
    el.style.transition = 'none';
    if (entrance) {
      el.style.opacity = '0';
      el.style.filter = 'blur(8px) contrast(0.5)';
    } else {
      el.style.opacity = '1';
      el.style.filter = 'blur(0px) contrast(1)';
    }
    void el.offsetHeight;
    requestAnimationFrame(() => {
      el.style.transition = buildTransition(['opacity', 'filter'], duration, easing);
      if (entrance) {
        el.style.opacity = '1';
        el.style.filter = 'blur(0px) contrast(1)';
      } else {
        el.style.opacity = '0';
        el.style.filter = 'blur(8px) contrast(0.5)';
      }
    });
  }

  function applyWheel(el, duration, entrance, easing) {
    el.style.transition = 'none';
    el.style.transformOrigin = 'center center';
    el.style.opacity = '1';
    if (entrance) {
      el.style.clipPath = 'polygon(50% 50%, 50% 0%, 50% 0%)';
      el.style.transform = 'rotate(-360deg)';
    }
    void el.offsetHeight;
    requestAnimationFrame(() => {
      el.style.transition = buildTransition(['transform', 'clip-path'], duration, easing);
      el.style.clipPath = 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%)';
      el.style.transform = 'rotate(0deg)';
    });
  }

  function parseFilterToEffectType(filter) {
    const match = filter.match(/^(\\w+)/);
    return (match && match[1]) ? match[1].toLowerCase() : 'fade';
  }

  function parseFilterDirection(filter) {
    const match = filter.match(/\\((\\w+)\\)/);
    const dir = (match && match[1]) ? match[1].toLowerCase() : 'in';
    const dirMap = {
      in: 'in', out: 'out',
      left: 'left', right: 'right', up: 'up', down: 'down',
      horizontal: 'horizontal', vertical: 'vertical',
      fromleft: 'left', fromright: 'right', fromtop: 'up', frombottom: 'down'
    };
    return dirMap[dir] || 'in';
  }

  function applyEffect(el, filter, duration, entrance, easing) {
    const type = parseFilterToEffectType(filter);
    const direction = parseFilterDirection(filter);

    switch (type) {
      case 'fade': applyFade(el, duration, entrance, easing); break;
      case 'slide': applySlide(el, duration, direction, entrance, easing); break;
      case 'wipe': applyWipe(el, duration, direction, entrance, easing); break;
      case 'box': applyBox(el, duration, direction, entrance, easing); break;
      case 'circle': applyCircle(el, duration, direction, entrance, easing); break;
      case 'diamond': applyDiamond(el, duration, direction, entrance, easing); break;
      case 'dissolve': applyDissolve(el, duration, entrance, easing); break;
      case 'wheel': applyWheel(el, duration, entrance, easing); break;
      default: applyFade(el, duration, entrance, easing);
    }
  }

  // =============================================================================
  // Element Helpers
  // =============================================================================

  function findElement(shapeId) {
    return document.querySelector('[data-ooxml-id="' + shapeId + '"]');
  }

  function showElement(el) {
    el.style.transition = 'none';
    el.style.opacity = '1';
    el.style.visibility = 'visible';
    el.style.transform = '';
    el.style.clipPath = '';
    el.style.filter = '';
  }

  function hideElement(el) {
    el.style.transition = 'none';
    el.style.opacity = '0';
    el.style.visibility = 'hidden';
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // =============================================================================
  // Animation Execution
  // =============================================================================

  async function processSet(node) {
    const target = node.target;
    if (!target || !target.shapeId) return;

    const el = findElement(target.shapeId);
    if (!el) return;

    const attr = node.attribute;
    const attrs = node.attributeNames;

    if (attr === 'style.visibility' && node.value === 'visible') {
      el.style.visibility = 'visible';
    }
    if (attrs && attrs.includes('style.visibility')) {
      el.style.visibility = 'visible';
    }

    const duration = typeof node.duration === 'number' ? node.duration : 1;
    await delay(duration);
  }

  async function processAnimate(node) {
    const target = node.target;
    if (!target || !target.shapeId) return;

    const el = findElement(target.shapeId);
    if (!el) return;

    const duration = node.duration === 'indefinite' ? 1000 :
                     typeof node.duration === 'number' ? node.duration : 1000;
    const attrs = node.attributeNames;

    el.style.transition = 'all ' + duration + 'ms ease-out';

    if (attrs && (attrs.includes('ppt_x') || attrs.includes('ppt_y'))) {
      const toX = typeof node.to === 'string' && node.to.includes('x') ? parseFloat(node.to) : 0;
      const toY = typeof node.to === 'string' && node.to.includes('y') ? parseFloat(node.to) : 0;
      el.style.transform = 'translate(' + toX + 'px, ' + toY + 'px)';
    }

    if (attrs && attrs.includes('style.opacity')) {
      el.style.opacity = String(node.to || 1);
    }

    await delay(duration);
  }

  async function processAnimateEffect(node) {
    const target = node.target;
    if (!target || !target.shapeId) return;

    const el = findElement(target.shapeId);
    if (!el) return;

    const filter = String(node.filter || 'fade');
    const duration = node.duration === 'indefinite' ? 1000 :
                     typeof node.duration === 'number' ? node.duration : 1000;

    applyEffect(el, filter, duration, true, 'ease-out');
    await delay(duration);
  }

  async function processAnimateMotion(node) {
    const target = node.target;
    if (!target || !target.shapeId) return;

    const el = findElement(target.shapeId);
    if (!el) return;

    const path = String(node.path || '');
    const duration = typeof node.duration === 'number' ? node.duration : 2000;

    const match = path.match(/L\\s*([\\-\\d.]+)\\s+([\\-\\d.]+)/);
    if (match) {
      const endX = parseFloat(match[1]) * 100;
      const endY = parseFloat(match[2]) * 100;
      el.style.transition = 'transform ' + duration + 'ms ease-in-out';
      el.style.transform = 'translate(' + endX + 'px, ' + endY + 'px)';
    }

    await delay(duration);
  }

  async function processAnimateRotation(node) {
    const target = node.target;
    if (!target || !target.shapeId) return;

    const el = findElement(target.shapeId);
    if (!el) return;

    const by = typeof node.by === 'number' ? node.by : 360;
    const duration = typeof node.duration === 'number' ? node.duration : 1000;

    el.style.transition = 'transform ' + duration + 'ms ease-in-out';
    el.style.transformOrigin = 'center center';
    el.style.transform = 'rotate(' + by + 'deg)';

    await delay(duration);
  }

  async function processAnimateScale(node) {
    const target = node.target;
    if (!target || !target.shapeId) return;

    const el = findElement(target.shapeId);
    if (!el) return;

    const toX = typeof node.toX === 'number' ? node.toX : 1;
    const toY = typeof node.toY === 'number' ? node.toY : 1;
    const duration = typeof node.duration === 'number' ? node.duration : 1000;

    el.style.transition = 'transform ' + duration + 'ms ease-in-out';
    el.style.transformOrigin = 'center center';
    el.style.transform = 'scale(' + toX + ', ' + toY + ')';

    await delay(duration);
  }

  async function processNode(node) {
    if (!node || typeof node !== 'object') return;

    const nodeType = String(node.type || 'unknown');
    const children = Array.isArray(node.children) ? node.children : [];

    const nodeDelay = typeof node.delay === 'number' ? node.delay : 0;
    if (nodeDelay > 0) {
      await delay(nodeDelay);
    }

    switch (nodeType) {
      case 'parallel':
        await Promise.all(children.map(child => processNode(child)));
        break;

      case 'sequence':
        for (const child of children) {
          await processNode(child);
        }
        break;

      case 'exclusive':
        if (children.length > 0) {
          await processNode(children[0]);
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

      case 'animateMotion':
        await processAnimateMotion(node);
        break;

      case 'animateRotation':
        await processAnimateRotation(node);
        break;

      case 'animateScale':
        await processAnimateScale(node);
        break;

      case 'animateColor':
        if (node.target && node.target.shapeId) {
          const el = findElement(node.target.shapeId);
          if (el) {
            const duration = typeof node.duration === 'number' ? node.duration : 1000;
            el.style.transition = 'background-color ' + duration + 'ms ease-in-out';
            await delay(duration);
          }
        }
        break;

      default:
        for (const child of children) {
          await processNode(child);
        }
    }
  }

  // =============================================================================
  // Step Execution
  // =============================================================================

  let hiddenShapes = [];

  function initialize(shapes) {
    hiddenShapes = shapes || [];
    hiddenShapes.forEach(function(id) {
      const el = findElement(id);
      if (el) hideElement(el);
    });
    parent.postMessage({ type: 'initialized' }, '*');
  }

  async function executeStep(stepIndex, animations) {
    // Process all animations in this step
    for (const anim of animations) {
      await processNode(anim);
    }
    parent.postMessage({ type: 'stepComplete', stepIndex: stepIndex }, '*');
  }

  function reset() {
    // Hide initially hidden shapes
    hiddenShapes.forEach(function(id) {
      const el = findElement(id);
      if (el) hideElement(el);
    });
    parent.postMessage({ type: 'reset' }, '*');
  }

  function showAll() {
    document.querySelectorAll('[data-ooxml-id]').forEach(function(el) {
      showElement(el);
    });
    parent.postMessage({ type: 'showingAll' }, '*');
  }

  // =============================================================================
  // Message Handler
  // =============================================================================

  window.addEventListener('message', function(event) {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    switch (data.type) {
      case 'initialize':
        initialize(data.hiddenShapes);
        break;
      case 'executeStep':
        executeStep(data.stepIndex, data.animations || []);
        break;
      case 'reset':
        reset();
        break;
      case 'showAll':
        showAll();
        break;
    }
  });

  // Notify parent that player is ready
  window.addEventListener('load', function() {
    parent.postMessage({ type: 'ready' }, '*');
  });

  // Also notify immediately if document is already loaded
  if (document.readyState === 'complete') {
    parent.postMessage({ type: 'ready' }, '*');
  }
})();
`;
}
