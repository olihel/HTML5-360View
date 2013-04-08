(function () {
  var w = window;
  var $doc = $(document);

  var IS_IE = !!navigator.userAgent.match(/MSIE/);
  var IS_FF = !!navigator.userAgent.match(/Firefox/);

  var CLEAR_SRC = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

  var EVENT_MOVESTART = Modernizr.touch ? 'touchstart' : 'mousedown';
  var EVENT_MOVE = Modernizr.touch ? 'touchmove' : 'mousemove';
  var EVENT_MOVESTOP = Modernizr.touch ? 'touchend' : 'mouseup';

  var MOVEMENT_PARAMS = {
    direction: 1,                             // direction of movement (1=normal | -1=reversed)
    damping:   Modernizr.touch ?  7.0 : 3.0,  // dampen pixel position difference between mouse move events (divisor)
    maxMove:   Modernizr.touch ? 40.0 : 2.0,  // limit pixel position difference between mouse move events (applied after dampening)
    inertia:   Modernizr.touch ?  2.9 : 1.1   // fading of movement on mouse up (multiplier)
  };

  var Threesixty = function ($node) {
    var $canvas = $node.children('.canvas');
    var imageSrc = $canvas.data('src');
    var $imgContainer = $('<div>');
    var $status = $node.children('.status');
    var canvasCtx = Modernizr.canvas ? $canvas[0].getContext('2d') : null;
    var width = ~~$canvas.attr('width');
    var height = ~~$canvas.attr('height');
    var totalImg = ~~$canvas.data('views');
    var currentFrame = 0;
    var currentFrameRaw = 0;
    var previousFrame = null;
    var imageURLs = [];
    var movement = 0;
    var isDragging = false;
    var animationID = null;
    var timerID;
    var imagesLoadedNum;
    var $images;
    var $imgNode;

    (function init() {
      var imgTags = [totalImg];
      var imgTagsNum = totalImg;

      while (imgTagsNum) {
        imgTags[--imgTagsNum] = ['<img src="', '" />'].join(CLEAR_SRC);
      }
      $imgContainer = $('<div>').append(imgTags.join(''));
      $images = $imgContainer.children('img');

      if (!Modernizr.canvas) {
        $imgNode = $('<img>').attr({width: width, height: height});
        $canvas.after($imgNode);
      }
    }());




    // MOVING

    var updateView = function () {
      if (currentFrame === previousFrame) {
        return;
      }
      previousFrame = currentFrame;

      if (Modernizr.canvas) {
        canvasCtx.drawImage($images[currentFrame], 0, 0);
      } else {
        $imgNode.attr('src', imageURLs[currentFrame]);
      }
    };

    var animationLoop = function () {
      if (movement > 0) {
        currentFrameRaw = (Math.round(currentFrameRaw + movement) < totalImg) ? (currentFrameRaw + movement) : 0;
      } else if (movement < 0) {
        currentFrameRaw = (Math.round(currentFrameRaw + movement) > 0) ? (currentFrameRaw + movement) : totalImg - 1;
      }

      currentFrame = Math.round(currentFrameRaw);

      updateView();

      if (movement) {
        if (isDragging) {
          movement = 0;
        } else if (Math.abs(movement) < 0.1) {
          movement = 0;
        } else {
          movement = movement / MOVEMENT_PARAMS.inertia;
        }
      }

      animationID = w.requestAnimationFrame(animationLoop);
    };

    var endMovement = function () {
      isDragging = false;
      $node.toggleClass('moving', false);
      $doc.off(EVENT_MOVE);
      $doc.off(EVENT_MOVESTOP);
    };

    var stopAnimation = function () {
      if (animationID !== null) {
        w.cancelAnimationFrame(animationID);
        animationID = null;
        endMovement();
      }
      movement = 0;
      $node.off(EVENT_MOVESTART);
    };

    var startAnimation = function () {
      animationLoop();

      $node.on(EVENT_MOVESTART, function (e) {
        var pos = Modernizr.touch ? e.originalEvent.touches[0] || e.originalEvent.changedTouches[0] : e;
        var lastPageX = pos.pageX;
        var lastPageY = pos.pageY;

        $node.toggleClass('moving', true);

        movement = 0;
        isDragging = true;

        $doc.on(EVENT_MOVE, function (e) {
          var pos = Modernizr.touch ? e.originalEvent.touches[0] || e.originalEvent.changedTouches[0] : e;
          if (!Modernizr.touch || (Math.abs(pos.pageY - lastPageY) < 4)) {
            e.preventDefault();
          }
          movement = (lastPageX - pos.pageX) / MOVEMENT_PARAMS.damping * MOVEMENT_PARAMS.direction;
          movement = Math.min(Math.max(movement, -MOVEMENT_PARAMS.maxMove), MOVEMENT_PARAMS.maxMove);
          lastPageX = pos.pageX;
          lastPageY = pos.pageY;
        });

        $doc.on(EVENT_MOVESTOP, endMovement);
      });
    };




    // LOADING

    var updateImageURLs = function () {
      var i, len;
      for (i = 0, len = totalImg; i < len; ++i) {
        imageURLs[i] = imageSrc.replace(/\{\{frame\}\}/g, i);
      }
    };

    var onImageLoaded = function () {
      if (imagesLoadedNum < totalImg) {
        $status.css('width', [100 / totalImg * ++imagesLoadedNum, '%'].join(''));
      } else {
        w.setTimeout(function () {
          startAnimation();
          $node.addClass('loaded');
          if (!Modernizr.cssanimations) {
            w.clearTimeout(timerID);
            timerID = w.setTimeout(function () {
            }, 2000);
          }
        }, 0);
      }
    };

    var loadImage = function (elm, src, callback) {
      var $elm = $(elm);
      $elm.one('load', callback);
      $elm.attr('src', src);
      if ((elm.complete && (!IS_FF || $elm.height())) || (elm.readyState === 'complete') || (elm.readyState === 4)) {
        $elm.trigger('load');
        if (IS_IE) {
          elm.src = elm.src;  // fix missing IE9 event
        }
      }
    };

    return {
      resetView: function () {
        stopAnimation();

        $imgContainer.find('img').each(function (idx, elm) {
          $(this).off('load');
          if (idx !== currentFrame) {
            elm.src = CLEAR_SRC;
          }
        });

        $status.css('width', 0);
        w.setTimeout(function () {
          $node.removeClass('loaded');
        }, 0);

        updateImageURLs();

        loadImage($imgContainer.find('img').eq(currentFrame)[0], imageURLs[currentFrame], function () {
          previousFrame = null;
          updateView();

          imagesLoadedNum = 1;
          $imgContainer.find('img').each(function (idx, elm) {
            loadImage(elm, imageURLs[idx], onImageLoaded);
          });
        });
      }
    };
  };




  $(document).ready(function () {
    $('.js_360').each(function () {
      var threeSixty = new Threesixty($(this));
      threeSixty.resetView();
    });
  });
}());
