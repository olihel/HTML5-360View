var Threesixty = function($node) {

  var $imgContainer = $("<div>"),
      $canvas       = $node.children(".canvas"),
      $status       = $node.children(".status"),
      canvasCtx     = Modernizr.canvas ? $canvas[0].getContext("2d") : null,
      width         = ~~$canvas.attr("width"),
      height        = ~~$canvas.attr("height"),
      totalImg      = ~~$canvas.data("views"),
      time          = ~~$canvas.data("time") || 0,
      aniFrame      = time ? Math.round( time / totalImg / (1000/60)) : 60/30,
      w = window, $images, $imgNode, running = 1, loop = 0, current = 0, completed = 0, imgSrc = [],

  prepareView = function() {
    !Modernizr.canvas && $canvas.after( $imgNode = $("<img>").attr({width:width,height:height}) );
    $images = $imgContainer.children("img");
    $imgContainer = null;
    $status.addClass("hide");

    updateView();
  },

  updateView = function() {
    if( aniFrame/++loop == 1 && !(loop = 0) ) {
      Modernizr.canvas ? canvasCtx.drawImage( $images[current], 0, 0)
                       : $imgNode.attr("src", imgSrc[current]);
      current = (current+1 < totalImg) ? current+1 : 0;
    }

    running && w.requestAnimFrame(updateView);
  };

  (function() {
    var temp = [],

    checkStart = function() {
      $status.css("width", [100/totalImg*++completed,"%"].join("") );
      (completed == totalImg) && prepareView();
    };

    for(var i=0, len = totalImg; i < len; ++i) {
      imgSrc.push( $canvas.data("src").replace(/{{i}}/g, i) );
      temp.push( ['<img src="','" />'].join( imgSrc[i] ) );
    }

    $imgContainer.append( temp.join("") ).find("img").each(function(idx,elm){
        elm.complete ? checkStart() : elm.onload = checkStart;
    });
  })();

  $node.on("click", function() {
    (running = !running) && running && updateView();
  });

};

window.requestAnimFrame = (function() {
  return  Modernizr.prefixed("requestAnimationFrame",window) ||
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();

$(document).ready(function(e) {
  $(".js_360").each(function() {
    Threesixty($(this));
  });
});
