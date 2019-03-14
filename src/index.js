import Transform from "css3transform";
import AlloyTouch from "../lib/alloyTouch";
// import './index.css';
/**
 *
 * @param {base64} data
 * @param {number} pointX
 * @param {number} pointY
 * @param {string} className
 */
function cut4Pieces(data, pointX, pointY, imgWidth, imgHeight, className) {
  // 初始化容器 dom 节点
  var container = document.createElement("div");
  container.setAttribute("class", className);

  var leftTopContainer = document.createElement("div");
  var rightTopContainer = document.createElement("div");
  var leftBottomContainer = document.createElement("div");
  var rightBottomContainer = document.createElement("div");

  leftTopContainer.setAttribute("class", "img-left-top-container");
  rightTopContainer.setAttribute("class", "img-right-top-container");
  leftBottomContainer.setAttribute("class", "img-left-bottom-container");
  rightBottomContainer.setAttribute("class", "img-right-bottom-container");

  var topContainer = document.createElement("div");
  var bottomContainer = document.createElement("div");
  topContainer.setAttribute("class", "img-top-container");
  bottomContainer.setAttribute("class", "img-bottom-container");

  container.append(topContainer);
  container.append(bottomContainer);

  topContainer.append(leftTopContainer);
  topContainer.append(rightTopContainer);
  bottomContainer.append(leftBottomContainer);
  bottomContainer.append(rightBottomContainer);

  var sourceCanvas = document.createElement("canvas");
  var dpr = window.devicePixelRatio;

  sourceCanvas.width = dpr * imgWidth;
  sourceCanvas.height = dpr * imgHeight;

  var sourceCtx = sourceCanvas.getContext("2d");
  var sourceImg = new Image(dpr * imgWidth, dpr * imgHeight);

  var imgMap = {
    leftTop: new Image(pointX, pointY),
    rightTop: new Image(imgWidth - pointX, pointY),
    leftBottom: new Image(pointX, imgHeight - pointY),
    rightBottom: new Image(imgWidth - pointX, imgHeight - pointY)
  };

  // 配置各个容器的滚动
  Transform(imgMap.rightBottom, true);
  Transform(imgMap.leftBottom, true);
  Transform(imgMap.rightTop, true);

  imgMap.rightBottom.alloyTouchY = new AlloyTouch({
    touch: rightBottomContainer,
    vertical: true,
    target: imgMap.rightBottom,
    property: "translateY",
    initialValue: 0,
    min: -(imgHeight - pointY - window.innerHeight),
    max: 0,
    change: function(value) {
      if (imgMap.leftBottom.alloyTouch) {
        imgMap.leftBottom.alloyTouch.to(value, 0);
      }
    },
    canCrossBorderMax: false,
    touchEnd: function(evt, current, obj) {
      if (current >= 0) {
        return false;
      }
      return true;
    }
  });

  imgMap.rightBottom.alloyTouchX = new AlloyTouch({
    touch: rightBottomContainer,
    vertical: false,
    target: imgMap.rightBottom,
    property: "translateX",
    initialValue: 0,
    min: -(imgWidth - pointX - window.innerWidth),
    max: 0,
    change: function(value) {
      if (imgMap.rightTop.alloyTouch) {
        imgMap.rightTop.alloyTouch.to(value, 0);
      }
    },
    canCrossBorderMax: false,
    touchEnd: function(evt, current) {
      if (current >= 0) {
        return false;
      }
      return true;
    }
  });

  imgMap.leftBottom.alloyTouch = new AlloyTouch({
    touch: leftBottomContainer,
    vertical: true,
    target: imgMap.leftBottom,
    property: "translateY",
    initialValue: 0,
    max: 0,
    fixed: true
  });

  imgMap.rightTop.alloyTouch = new AlloyTouch({
    touch: rightTopContainer,
    vertical: true,
    target: imgMap.rightTop,
    property: "translateX",
    initialValue: 0,
    max: 0,
    fixed: true
  });

  // 在图片初始化完毕之后，将图片挂载至容器
  imgMap.leftTop.onload = function() {
    leftTopContainer.append(imgMap.leftTop);
    if (checkAllFinsh(imgMap.leftTop, imgMap)) {
      appendContainer(container, document.body);
    }
  };
  imgMap.rightTop.onload = function() {
    rightTopContainer.append(imgMap.rightTop);
    if (checkAllFinsh(imgMap.rightTop, imgMap)) {
      appendContainer(container, document.body);
    }
  };
  imgMap.leftBottom.onload = function() {
    leftBottomContainer.append(imgMap.leftBottom);
    if (checkAllFinsh(imgMap.leftBottom, imgMap)) {
      appendContainer(container, document.body);
    }
  };
  imgMap.rightBottom.onload = function() {
    rightBottomContainer.append(imgMap.rightBottom);
    if (checkAllFinsh(imgMap.rightBottom, imgMap)) {
      appendContainer(container, document.body);
    }
  };

  // 在原图片 load 之后，执行具体的切割操作
  sourceImg.onload = function() {
    sourceCtx.drawImage(sourceImg, 0, 0, dpr * imgWidth, dpr * imgHeight);
    var imgData = sourceCtx.getImageData(0, 0, dpr * imgWidth, dpr * imgHeight);

    imgMap.leftTop.src = getRectImageData(imgData, 0, 0, pointX, pointY);

    imgMap.rightTop.src = getRectImageData(
      imgData,
      pointX,
      0,
      imgWidth - pointX,
      pointY
    );

    imgMap.leftBottom.src = getRectImageData(
      imgData,
      0,
      pointY,
      pointX,
      imgHeight - pointY
    );

    imgMap.rightBottom.src = getRectImageData(
      imgData,
      pointX,
      pointY,
      imgWidth - pointX,
      imgHeight - pointY
    );
  };
  sourceImg.src = data;
}

function getRectImageData(imgData, leftTopX, leftTopY, width, height) {
  var dpr = window.devicePixelRatio;
  var data = "";
  var pieceCanvas = document.createElement("canvas");
  var pieceCtx = pieceCanvas.getContext("2d");
  pieceCanvas.width = dpr * width;
  pieceCanvas.height = dpr * height;
  pieceCanvas.style.width = width;
  pieceCanvas.style.height = height;
  pieceCtx.rect(0, 0, dpr * width, dpr * height);
  pieceCtx.scale(dpr, dpr);
  pieceCtx.fillStyle = "white";
  pieceCtx.fill();
  pieceCtx.putImageData(imgData, -dpr * leftTopX, -dpr * leftTopY);
  data = pieceCanvas.toDataURL("image/jpeg", 1);
  return data;
}

function checkAllFinsh(obj, objMap) {
  obj.finished = true;
  var allLoaded = true;
  objectForEach(objMap, function(item) {
    if (!item.finished) {
      allLoaded = false;
      return;
    }
  });
  return allLoaded;
}

function objectForEach(obj, func) {
  var keys = Object.keys(obj);
  for (var index = 0; index < keys.length; index++) {
    var key = keys[index];
    func(obj[key]);
  }
}

function appendContainer(dom, mountPoint) {
  if (!dom.appended) {
    mountPoint.append(dom);
    dom.appended = true;
  }
}

if (typeof module !== "undefined" && typeof exports === "object") {
  module.exports = cut4Pieces;
} else {
  window.cut4Pieces = cut4Pieces;
}

export default cut4Pieces;