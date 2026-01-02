/**
 * @file Browser Animation Player
 *
 * Self-contained animation engine for PPTX animations.
 * All 15 effects from MS-OE376 Part 4 Section 4.6.3.
 *
 * @see MS-OE376 Part 4 Section 4.6.3
 * @see ECMA-376 Part 1, Section 19.5 (Animation)
 */

(function(global) {
  'use strict';

  // =========================================================================
  // Animation Engine Core
  // =========================================================================

  function easeOut(t) {
    return 1 - (1 - t) * (1 - t);
  }

  function lerp(from, to, progress) {
    return from + (to - from) * progress;
  }

  /**
   * Core animate function - returns Promise
   */
  function animate(duration, onUpdate, onComplete) {
    return new Promise(function(resolve) {
      var startTime = performance.now();

      function frame(currentTime) {
        var elapsed = currentTime - startTime;
        var rawProgress = duration > 0 ? Math.min(elapsed / duration, 1) : 1;
        var easedProgress = easeOut(rawProgress);

        onUpdate(easedProgress);

        if (rawProgress < 1) {
          requestAnimationFrame(frame);
        } else {
          if (onComplete) onComplete();
          resolve();
        }
      }

      requestAnimationFrame(frame);
    });
  }

  // =========================================================================
  // Effect Implementations - MS-OE376 Part 4 Section 4.6.3 Compliant
  // =========================================================================

  /**
   * Fade effect - simple opacity transition
   * @see MS-OE376 Part 4 Section 4.6.3 - fade filter
   */
  function animateFade(el, duration, direction) {
    var isIn = direction !== 'out';
    el.style.visibility = 'visible';
    el.style.opacity = isIn ? '0' : '1';

    return animate(duration, function(progress) {
      var opacity = isIn ? progress : 1 - progress;
      el.style.opacity = String(opacity);
    });
  }

  /**
   * Slide effect - fly in/out from direction
   * @see MS-OE376 Part 4 Section 4.6.3 - slide filter
   */
  function animateSlide(el, duration, direction) {
    var offsets = {
      left: { x: -100, y: 0 },
      right: { x: 100, y: 0 },
      up: { x: 0, y: -100 },
      down: { x: 0, y: 100 }
    };
    var offset = offsets[direction] || offsets.left;

    el.style.visibility = 'visible';
    el.style.opacity = '0';
    el.style.transform = 'translate(' + offset.x + '%, ' + offset.y + '%)';

    return animate(duration, function(progress) {
      var x = lerp(offset.x, 0, progress);
      var y = lerp(offset.y, 0, progress);
      el.style.transform = 'translate(' + x + '%, ' + y + '%)';
      el.style.opacity = String(progress);
    });
  }

  /**
   * Wipe effect - reveal with clip-path
   * @see MS-OE376 Part 4 Section 4.6.3 - wipe filter
   */
  function animateWipe(el, duration, direction) {
    var clips = {
      right: { top: 0, right: 100, bottom: 0, left: 0 },
      left: { top: 0, right: 0, bottom: 0, left: 100 },
      down: { top: 0, right: 0, bottom: 100, left: 0 },
      up: { top: 100, right: 0, bottom: 0, left: 0 }
    };
    var clip = clips[direction] || clips.right;

    el.style.visibility = 'visible';
    el.style.opacity = '1';
    el.style.clipPath = 'inset(' + clip.top + '% ' + clip.right + '% ' + clip.bottom + '% ' + clip.left + '%)';

    return animate(duration, function(progress) {
      var top = lerp(clip.top, 0, progress);
      var right = lerp(clip.right, 0, progress);
      var bottom = lerp(clip.bottom, 0, progress);
      var left = lerp(clip.left, 0, progress);
      el.style.clipPath = 'inset(' + top + '% ' + right + '% ' + bottom + '% ' + left + '%)';
    });
  }

  /**
   * Blinds effect - horizontal or vertical blinds
   * @see MS-OE376 Part 4 Section 4.6.3 - blinds filter
   */
  function animateBlinds(el, duration, direction) {
    var isHorizontal = direction === 'horizontal';
    var gradientDir = isHorizontal ? 'to bottom' : 'to right';

    el.style.visibility = 'visible';
    el.style.opacity = '1';
    el.style.maskImage = 'repeating-linear-gradient(' + gradientDir + ', black, black 50%, transparent 50%, transparent)';
    el.style.webkitMaskImage = el.style.maskImage;
    el.style.maskRepeat = 'repeat';
    el.style.maskSize = isHorizontal ? '100% 0px' : '0px 100%';
    el.style.webkitMaskSize = el.style.maskSize;

    return animate(duration, function(progress) {
      var size = lerp(0, 20, progress);
      el.style.maskSize = isHorizontal ? '100% ' + size + 'px' : size + 'px 100%';
      el.style.webkitMaskSize = el.style.maskSize;
    });
  }

  /**
   * Box effect - expand/contract from center
   * @see MS-OE376 Part 4 Section 4.6.3 - box filter
   */
  function animateBox(el, duration, direction) {
    var isIn = direction === 'in';
    var startInset = isIn ? 50 : 0;
    var endInset = isIn ? 0 : 50;

    el.style.visibility = 'visible';
    el.style.opacity = '1';
    el.style.clipPath = 'inset(' + startInset + '% ' + startInset + '% ' + startInset + '% ' + startInset + '%)';

    return animate(duration, function(progress) {
      var inset = lerp(startInset, endInset, progress);
      el.style.clipPath = 'inset(' + inset + '% ' + inset + '% ' + inset + '% ' + inset + '%)';
    });
  }

  /**
   * Circle effect - circular reveal from center
   * @see MS-OE376 Part 4 Section 4.6.3 - circle filter
   */
  function animateCircle(el, duration, direction) {
    var isIn = direction === 'in';
    var startRadius = isIn ? 0 : 75;
    var endRadius = isIn ? 75 : 0;

    el.style.visibility = 'visible';
    el.style.opacity = '1';
    el.style.clipPath = 'circle(' + startRadius + '% at 50% 50%)';

    return animate(duration, function(progress) {
      var radius = lerp(startRadius, endRadius, progress);
      el.style.clipPath = 'circle(' + radius + '% at 50% 50%)';
    });
  }

  /**
   * Diamond effect - diamond-shaped reveal from center
   * @see MS-OE376 Part 4 Section 4.6.3 - diamond filter
   */
  function animateDiamond(el, duration, direction) {
    var isIn = direction === 'in';
    var startSize = isIn ? 0 : 50;
    var endSize = isIn ? 50 : 0;

    el.style.visibility = 'visible';
    el.style.opacity = '1';

    function setDiamond(size) {
      el.style.clipPath = 'polygon(50% ' + (50 - size) + '%, ' + (50 + size) + '% 50%, 50% ' + (50 + size) + '%, ' + (50 - size) + '% 50%)';
    }

    setDiamond(startSize);

    return animate(duration, function(progress) {
      var size = lerp(startSize, endSize, progress);
      setDiamond(size);
    });
  }

  /**
   * Dissolve effect - pixelated dissolve (approximated with blur)
   * @see MS-OE376 Part 4 Section 4.6.3 - dissolve filter
   */
  function animateDissolve(el, duration, direction) {
    var isIn = direction !== 'out';

    el.style.visibility = 'visible';
    el.style.opacity = isIn ? '0' : '1';
    el.style.filter = isIn ? 'blur(8px)' : 'blur(0px)';

    return animate(duration, function(progress) {
      var opacity = isIn ? progress : 1 - progress;
      var blur = isIn ? lerp(8, 0, progress) : lerp(0, 8, progress);
      el.style.opacity = String(opacity);
      el.style.filter = 'blur(' + blur + 'px)';
    });
  }

  /**
   * Strips effect - diagonal strips
   * @see MS-OE376 Part 4 Section 4.6.3 - strips filter
   */
  function animateStrips(el, duration, direction) {
    var angles = {
      downRight: '135deg',
      downLeft: '225deg',
      upRight: '45deg',
      upLeft: '315deg'
    };
    var angle = angles[direction] || '135deg';

    el.style.visibility = 'visible';
    el.style.opacity = '1';
    el.style.maskImage = 'repeating-linear-gradient(' + angle + ', black 0px, black 10px, transparent 10px, transparent 20px)';
    el.style.webkitMaskImage = el.style.maskImage;
    el.style.maskSize = '200% 200%';
    el.style.webkitMaskSize = el.style.maskSize;
    el.style.maskPosition = '-100% -100%';
    el.style.webkitMaskPosition = el.style.maskPosition;

    return animate(duration, function(progress) {
      var pos = lerp(-100, 0, progress);
      el.style.maskPosition = pos + '% ' + pos + '%';
      el.style.webkitMaskPosition = el.style.maskPosition;
    });
  }

  /**
   * Wheel effect - rotating wheel reveal
   * @see MS-OE376 Part 4 Section 4.6.3 - wheel filter
   */
  function animateWheel(el, duration) {
    el.style.visibility = 'visible';
    el.style.opacity = '1';
    el.style.transformOrigin = 'center center';
    el.style.clipPath = 'polygon(50% 50%, 50% 0%, 50% 0%)';
    el.style.transform = 'rotate(-360deg)';

    return animate(duration, function(progress) {
      var angle = lerp(-360, 0, progress);
      el.style.transform = 'rotate(' + angle + 'deg)';

      // Expand clip from wedge to full
      if (progress < 0.25) {
        var rightX = lerp(50, 100, progress * 4);
        el.style.clipPath = 'polygon(50% 50%, 50% 0%, ' + rightX + '% 0%)';
      } else if (progress < 0.5) {
        var bottomY = lerp(0, 100, (progress - 0.25) * 4);
        el.style.clipPath = 'polygon(50% 50%, 50% 0%, 100% 0%, 100% ' + bottomY + '%)';
      } else if (progress < 0.75) {
        var leftX = lerp(100, 0, (progress - 0.5) * 4);
        el.style.clipPath = 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, ' + leftX + '% 100%)';
      } else {
        var topY = lerp(100, 0, (progress - 0.75) * 4);
        el.style.clipPath = 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% ' + topY + '%)';
      }
    }, function() {
      el.style.clipPath = 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%)';
      el.style.transform = 'rotate(0deg)';
    });
  }

  /**
   * Plus effect - plus/cross shape from center
   * @see MS-OE376 Part 4 Section 4.6.3 - plus filter
   */
  function animatePlus(el, duration, direction) {
    var isIn = direction === 'in';
    var startSize = isIn ? 0 : 50;
    var endSize = isIn ? 50 : 0;

    el.style.visibility = 'visible';
    el.style.opacity = '1';

    function setPlus(size) {
      var inner = 50 - size;
      var outer = 50 + size;
      el.style.clipPath = 'polygon(' + inner + '% 0%, ' + outer + '% 0%, ' + outer + '% ' + inner + '%, 100% ' + inner + '%, 100% ' + outer + '%, ' + outer + '% ' + outer + '%, ' + outer + '% 100%, ' + inner + '% 100%, ' + inner + '% ' + outer + '%, 0% ' + outer + '%, 0% ' + inner + '%, ' + inner + '% ' + inner + '%)';
    }

    setPlus(startSize);

    return animate(duration, function(progress) {
      var size = lerp(startSize, endSize, progress);
      setPlus(size);
    });
  }

  /**
   * Barn effect - barn door opening/closing
   * @see MS-OE376 Part 4 Section 4.6.3 - barn filter
   */
  function animateBarn(el, duration, direction) {
    var isHorizontal = direction === 'inHorizontal' || direction === 'outHorizontal';
    var isInward = direction === 'inHorizontal' || direction === 'inVertical';

    el.style.visibility = 'visible';
    el.style.opacity = '1';

    if (isInward) {
      if (isHorizontal) {
        el.style.clipPath = 'inset(0% 50% 0% 50%)';
      } else {
        el.style.clipPath = 'inset(50% 0% 50% 0%)';
      }
    } else {
      el.style.clipPath = 'inset(0% 0% 0% 0%)';
    }

    return animate(duration, function(progress) {
      var p = isInward ? progress : 1 - progress;
      var inset = lerp(50, 0, p);
      if (isHorizontal) {
        el.style.clipPath = 'inset(0% ' + inset + '% 0% ' + inset + '%)';
      } else {
        el.style.clipPath = 'inset(' + inset + '% 0% ' + inset + '% 0%)';
      }
    });
  }

  /**
   * Randombar effect - random horizontal or vertical bars
   * @see MS-OE376 Part 4 Section 4.6.3 - randombar filter
   */
  function animateRandombar(el, duration, direction) {
    var isHorizontal = direction === 'horizontal';
    var gradientDir = isHorizontal ? 'to bottom' : 'to right';

    el.style.visibility = 'visible';
    el.style.opacity = '1';
    el.style.maskImage = 'repeating-linear-gradient(' + gradientDir + ', black 0px, black 8px, transparent 8px, transparent 16px, black 16px, black 20px, transparent 20px, transparent 32px)';
    el.style.webkitMaskImage = el.style.maskImage;
    el.style.maskSize = isHorizontal ? '100% 0%' : '0% 100%';
    el.style.webkitMaskSize = el.style.maskSize;

    return animate(duration, function(progress) {
      var size = lerp(0, 100, progress);
      el.style.maskSize = isHorizontal ? '100% ' + size + '%' : size + '% 100%';
      el.style.webkitMaskSize = el.style.maskSize;
    });
  }

  /**
   * Wedge effect - wedge shape from center
   * @see MS-OE376 Part 4 Section 4.6.3 - wedge filter
   */
  function animateWedge(el, duration) {
    el.style.visibility = 'visible';
    el.style.opacity = '1';
    el.style.clipPath = 'polygon(50% 50%, 50% 50%, 50% 50%)';

    return animate(duration, function(progress) {
      var spread = lerp(0, 100, progress);
      el.style.clipPath = 'polygon(50% 50%, ' + (50 - spread) + '% 0%, ' + (50 + spread) + '% 0%)';
    }, function() {
      el.style.clipPath = 'polygon(50% 50%, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%)';
    });
  }

  /**
   * Checkerboard effect - checkerboard pattern reveal
   * @see MS-OE376 Part 4 Section 4.6.3 - checkerboard filter
   */
  function animateCheckerboard(el, duration, direction) {
    var isAcross = direction === 'across';

    el.style.visibility = 'visible';
    el.style.opacity = '1';
    el.style.maskImage = 'repeating-conic-gradient(from 0deg, black 0deg 90deg, transparent 90deg 180deg)';
    el.style.webkitMaskImage = el.style.maskImage;
    el.style.maskSize = '40px 40px';
    el.style.webkitMaskSize = el.style.maskSize;
    el.style.maskPosition = isAcross ? '-100% 0%' : '0% -100%';
    el.style.webkitMaskPosition = el.style.maskPosition;

    return animate(duration, function(progress) {
      var pos = lerp(-100, 0, progress);
      el.style.maskPosition = isAcross ? pos + '% 0%' : '0% ' + pos + '%';
      el.style.webkitMaskPosition = el.style.maskPosition;
    });
  }

  // =========================================================================
  // Filter Parsing (MS-OE376 Part 4 Section 4.6.3)
  // =========================================================================

  var EFFECT_TYPE_MAP = {
    fade: 'fade',
    slide: 'slide',
    wipe: 'wipe',
    blinds: 'blinds',
    box: 'box',
    checkerboard: 'checkerboard',
    circle: 'circle',
    diamond: 'diamond',
    dissolve: 'dissolve',
    strips: 'strips',
    wheel: 'wheel',
    plus: 'plus',
    barn: 'barn',
    randombar: 'randombar',
    wedge: 'wedge'
  };

  var DIRECTION_MAP = {
    // Basic
    'in': 'in',
    'out': 'out',
    'left': 'left',
    'right': 'right',
    'up': 'up',
    'down': 'down',
    // PowerPoint slide directions
    'fromleft': 'left',
    'fromright': 'right',
    'fromtop': 'up',
    'frombottom': 'down',
    // Blinds/randombar
    'horizontal': 'horizontal',
    'vertical': 'vertical',
    // Checkerboard
    'across': 'across',
    // Strips
    'downleft': 'downLeft',
    'downright': 'downRight',
    'upleft': 'upLeft',
    'upright': 'upRight',
    // Barn
    'invertical': 'inVertical',
    'inhorizontal': 'inHorizontal',
    'outvertical': 'outVertical',
    'outhorizontal': 'outHorizontal',
    // Wheel spokes
    '1': '1',
    '2': '2',
    '3': '3',
    '4': '4',
    '8': '8'
  };

  function parseFilter(filter) {
    var match = filter.match(/^(\w+)(?:\((\w+)\))?/);
    var typeStr = (match && match[1]) ? match[1].toLowerCase() : 'fade';
    var dirStr = (match && match[2]) ? match[2].toLowerCase() : 'in';

    return {
      type: EFFECT_TYPE_MAP[typeStr] || 'fade',
      direction: DIRECTION_MAP[dirStr] || dirStr
    };
  }

  // =========================================================================
  // Effect Dispatcher
  // =========================================================================

  function applyEffect(el, effectType, duration, direction, log) {
    log('applyEffect: ' + effectType + ', dur=' + duration + ', dir=' + direction);

    switch (effectType) {
      case 'fade':
        return animateFade(el, duration, direction);
      case 'slide':
        return animateSlide(el, duration, direction);
      case 'wipe':
        return animateWipe(el, duration, direction);
      case 'blinds':
        return animateBlinds(el, duration, direction);
      case 'box':
        return animateBox(el, duration, direction);
      case 'circle':
        return animateCircle(el, duration, direction);
      case 'diamond':
        return animateDiamond(el, duration, direction);
      case 'dissolve':
        return animateDissolve(el, duration, direction);
      case 'strips':
        return animateStrips(el, duration, direction);
      case 'wheel':
        return animateWheel(el, duration, direction);
      case 'plus':
        return animatePlus(el, duration, direction);
      case 'barn':
        return animateBarn(el, duration, direction);
      case 'randombar':
        return animateRandombar(el, duration, direction);
      case 'wedge':
        return animateWedge(el, duration, direction);
      case 'checkerboard':
        return animateCheckerboard(el, duration, direction);
      default:
        return animateFade(el, duration, direction);
    }
  }

  // =========================================================================
  // Animation Player
  // =========================================================================

  function createPlayer(options) {
    var findElement = options.findElement;
    var log = options.log || function() {};

    // Extract animated shape IDs from timing tree
    function extractAnimatedShapeIds(node) {
      var ids = new Set();
      function traverse(n) {
        if (!n) return;
        if (n.target && n.target.shapeId) {
          ids.add(String(n.target.shapeId));
        }
        if (Array.isArray(n.children)) {
          n.children.forEach(traverse);
        }
      }
      traverse(node);
      return ids;
    }

    // Get node delay
    function getNodeDelay(node) {
      if (node.startConditions && node.startConditions.length > 0) {
        var cond = node.startConditions[0];
        if (cond.delay === 'indefinite') {
          return 500; // Auto-play after 500ms
        }
        if (typeof cond.delay === 'number') {
          return cond.delay;
        }
      }
      return 0;
    }

    // Process time node recursively
    async function processNode(node) {
      if (!node) return;

      var nodeDelay = getNodeDelay(node);
      if (nodeDelay > 0) {
        log('Waiting ' + nodeDelay + 'ms');
        await new Promise(function(r) { setTimeout(r, nodeDelay); });
      }

      var children = node.children || [];
      log('Processing: ' + node.type + ' (id=' + node.id + ', children=' + children.length + ')');

      switch (node.type) {
        case 'parallel':
          await Promise.all(children.map(function(child) { return processNode(child); }));
          break;

        case 'sequence':
          for (var i = 0; i < children.length; i++) {
            await processNode(children[i]);
          }
          break;

        case 'set':
          if (node.target && node.target.shapeId) {
            var el = findElement(node.target.shapeId);
            if (el) {
              log('Set: ' + node.attribute + ' = ' + node.value);
              if (node.attribute === 'style.visibility' && node.value === 'visible') {
                el.style.visibility = 'visible';
                el.style.opacity = '1';
              }
            }
          }
          await new Promise(function(r) { setTimeout(r, node.duration || 1); });
          break;

        case 'animate':
        case 'animateEffect':
          if (node.target && node.target.shapeId) {
            var el = findElement(node.target.shapeId);
            if (el) {
              var filter = node.filter || 'fade';
              var parsed = parseFilter(filter);
              var duration = node.duration === 'indefinite' ? 1000 : (node.duration || 1000);

              log('Effect: ' + filter + ' -> type=' + parsed.type + ', dir=' + parsed.direction + ', dur=' + duration);
              await applyEffect(el, parsed.type, duration, parsed.direction, log);
            }
          }
          break;

        case 'animateMotion':
          if (node.target && node.target.shapeId) {
            var el = findElement(node.target.shapeId);
            if (el && node.path) {
              var duration = node.duration || 2000;
              log('Motion: ' + node.path);
              el.style.visibility = 'visible';
              await animate(duration, function(progress) {
                el.style.transform = 'translate(' + (50 * progress) + 'px, ' + (50 * progress) + 'px)';
              });
            }
          }
          break;

        case 'animateRotation':
          if (node.target && node.target.shapeId) {
            var el = findElement(node.target.shapeId);
            if (el) {
              var duration = node.duration || 1000;
              var from = node.from || 0;
              var to = node.to || 360;
              log('Rotation: ' + from + ' -> ' + to);
              el.style.visibility = 'visible';
              el.style.transformOrigin = 'center center';
              await animate(duration, function(progress) {
                var angle = lerp(from, to, progress);
                el.style.transform = 'rotate(' + angle + 'deg)';
              });
            }
          }
          break;

        case 'animateScale':
          if (node.target && node.target.shapeId) {
            var el = findElement(node.target.shapeId);
            if (el) {
              var duration = node.duration || 1000;
              var fromX = node.fromX || 100;
              var fromY = node.fromY || 100;
              var toX = node.toX || 100;
              var toY = node.toY || 100;
              log('Scale: (' + fromX + ',' + fromY + ') -> (' + toX + ',' + toY + ')');
              el.style.visibility = 'visible';
              el.style.transformOrigin = 'center center';
              await animate(duration, function(progress) {
                var scaleX = lerp(fromX, toX, progress) / 100;
                var scaleY = lerp(fromY, toY, progress) / 100;
                el.style.transform = 'scale(' + scaleX + ', ' + scaleY + ')';
              });
            }
          }
          break;

        case 'animateColor':
          if (node.target && node.target.shapeId) {
            var el = findElement(node.target.shapeId);
            if (el) {
              log('AnimateColor: not fully implemented');
              el.style.visibility = 'visible';
            }
          }
          break;

        default:
          for (var i = 0; i < children.length; i++) {
            await processNode(children[i]);
          }
      }
    }

    // Store timing data for reset
    var currentTimingData = null;

    // Public API
    return {
      extractAnimatedShapeIds: extractAnimatedShapeIds,

      resetElement: function(el) {
        el.style.transition = 'none';
        el.style.opacity = '0';
        el.style.visibility = 'hidden';
        el.style.transform = '';
        el.style.clipPath = '';
        el.style.filter = '';
        el.style.maskImage = '';
        el.style.webkitMaskImage = '';
        el.style.maskSize = '';
        el.style.webkitMaskSize = '';
        el.style.maskPosition = '';
        el.style.webkitMaskPosition = '';
      },

      showElement: function(el) {
        el.style.transition = 'none';
        el.style.opacity = '1';
        el.style.visibility = 'visible';
        el.style.transform = '';
        el.style.clipPath = '';
        el.style.filter = '';
        el.style.maskImage = '';
        el.style.webkitMaskImage = '';
      },

      // Reset only animated shapes (keep non-animated visible)
      resetAnimatedShapes: function() {
        if (!currentTimingData) return;
        var self = this;
        var animatedIds = extractAnimatedShapeIds(currentTimingData.rootTimeNode);
        animatedIds.forEach(function(id) {
          var el = findElement(id);
          if (el) self.resetElement(el);
        });
        log('Reset ' + animatedIds.size + ' animated shapes');
      },

      // Set timing data (called before play or reset)
      setTimingData: function(data) {
        currentTimingData = data;
      },

      play: async function(timingData) {
        if (!timingData || !timingData.rootTimeNode) {
          log('No timing data');
          return;
        }

        var self = this;
        currentTimingData = timingData;
        var animatedIds = extractAnimatedShapeIds(timingData.rootTimeNode);
        log('Animated shapes: ' + Array.from(animatedIds).join(', '));

        // Reset only animated shapes
        animatedIds.forEach(function(id) {
          var el = findElement(id);
          if (el) self.resetElement(el);
        });

        await new Promise(function(r) { setTimeout(r, 100); });
        await processNode(timingData.rootTimeNode);
      }
    };
  }

  // Export
  global.PptxAnimationPlayer = {
    createPlayer: createPlayer,
    parseFilter: parseFilter
  };

})(typeof window !== 'undefined' ? window : this);
