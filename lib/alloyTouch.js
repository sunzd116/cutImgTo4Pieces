(function() {
  "use strict";

  if (!Date.now)
    Date.now = function() {
      return new Date().getTime();
    };

  var vendors = ["webkit", "moz"];
  for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
    var vp = vendors[i];
    window.requestAnimationFrame = window[vp + "RequestAnimationFrame"];
    window.cancelAnimationFrame =
      window[vp + "CancelAnimationFrame"] ||
      window[vp + "CancelRequestAnimationFrame"];
  }
  if (
    /iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) || // iOS6 is buggy
    !window.requestAnimationFrame ||
    !window.cancelAnimationFrame
  ) {
    var lastTime = 0;
    window.requestAnimationFrame = function(callback) {
      var now = Date.now();
      var nextTime = Math.max(lastTime + 16, now);
      return setTimeout(function() {
        callback((lastTime = nextTime));
      }, nextTime - now);
    };
    window.cancelAnimationFrame = clearTimeout;
  }
})();

(function() {
  function bind(element, type, callback) {
    element.addEventListener(type, callback, false);
  }

  function ease(x) {
    return Math.sqrt(1 - Math.pow(x - 1, 2));
  }

  function reverseEase(y) {
    return 1 - Math.sqrt(1 - y * y);
  }

  function preventDefaultTest(el, exceptions) {
    for (var i in exceptions) {
      if (exceptions[i].test(el[i])) {
        return true;
      }
    }
    return false;
  }

  var AlloyTouch = function(option) {
    this.reverse = this._getValue(option.reverse, false); // 反向滚动，如果变更属性为scrollTop就需要设为true
    this.element =
      typeof option.touch === "string"
        ? document.querySelector(option.touch)
        : option.touch; // 触发事件的元素
    this.target = this._getValue(option.target, this.element); // 实际运动的元素
    this.vertical = this._getValue(option.vertical, true);
    this.property = option.property;
    this.tickID = 0;

    this.initialValue = this._getValue(
      option.initialValue,
      this.target[this.property]
    );
    this.target[this.property] = this.initialValue;
    this.fixed = this._getValue(option.fixed, false); // 用户能否触发滚动（不影响手动调用to, _to方法）
    this.sensitivity = this._getValue(option.sensitivity, 1);
    this.moveFactor = this._getValue(option.moveFactor, 1);
    this.factor = this._getValue(option.factor, 1);
    this.outFactor = this._getValue(option.outFactor, 0.3);
    this.min = function() {
      if (option.min === undefined || open.min === null) return void 0;
      if (typeof option.min === "function") {
        return option.min();
      } else {
        return option.min;
      }
    };
    this.max = function() {
      if (option.max === undefined || open.max === null) return void 0;
      if (typeof option.max === "function") {
        return option.max();
      } else {
        return option.max;
      }
    };
    this.deceleration = this._getValue(option.deceleration, 0.0006); // 惯性运动的减速率，值越大，减速越剧烈
    this.maxRegion = this._getValue(option.maxRegion, 600);
    this.springMaxRegion = this._getValue(option.springMaxRegion, 60);
    this.maxSpeed = option.maxSpeed;
    this.hasMaxSpeed = !(this.maxSpeed === void 0);
    this.lockDirection = this._getValue(option.lockDirection, true);
    this.canCrossBorderMin = this._getValue(option.canCrossBorderMin, true);
    this.canCrossBorderMax = this._getValue(option.canCrossBorderMax, true);
    var noop = function() {};
    const alwaysTrue = function() {
      return true;
    };
    this.change = option.change || noop; // 移动过程中调用，包含用户滑动和回弹、惯性动画
    this.touchEnd = option.touchEnd || noop;
    this.touchStart = option.touchStart || noop;
    this.touchMove = option.touchMove || noop;
    this.touchCancel = option.touchCancel || noop;
    this.reboundEnd = option.reboundEnd || noop;
    this.animationEnd = option.animationEnd || noop;
    this.correctionEnd = option.correctionEnd || noop;
    this.tap = option.tap || noop;
    this.pressMove = option.pressMove || noop;
    this.shouldRebound = option.shouldRebound || alwaysTrue;

    this.preventDefault = this._getValue(option.preventDefault, true);
    this.preventDefaultException = {
      tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT)$/
    };
    this.hasMin = !(this.min() === void 0);
    this.hasMax = !(this.max() === void 0);
    // if (this.hasMin && this.hasMax && this.min() > this.max()) {
    //     throw "the min value can't be greater than the max value."
    // }
    this.isTouchStart = false;
    this.step = option.step;
    this.inertia = this._getValue(option.inertia, true); // 惯性运动

    this._calculateIndex();

    this.eventTarget = window;
    if (option.bindSelf) {
      this.eventTarget = this.element;
    }

    this._moveHandler = this._move.bind(this);
    bind(this.element, "touchstart", this._start.bind(this));
    bind(this.eventTarget, "touchend", this._end.bind(this));
    bind(this.eventTarget, "touchcancel", this._cancel.bind(this));
    this.eventTarget.addEventListener("touchmove", this._moveHandler, {
      passive: false,
      capture: false
    });
    this.x1 = this.x2 = this.y1 = this.y2 = null;
  };

  AlloyTouch.prototype = {
    isAtMax: function(offset) {
      var _offset = offset || 0;

      return this.hasMax && this.target[this.property] + _offset >= this.max();
    },
    isAtMin: function(offset) {
      var _offset = offset || 0;
      return this.hasMin && this.target[this.property] + _offset <= this.min();
    },
    _getValue: function(obj, defaultValue) {
      return obj === void 0 ? defaultValue : obj;
    },
    stop: function() {
      cancelAnimationFrame(this.tickID);
      // console.log('frame stoped: ' + this.tickID);
      this._calculateIndex();
    },
    _start: function(evt) {
      this.isTouchStart = true;
      this.touchStart.call(this, evt, this.target[this.property]);
      cancelAnimationFrame(this.tickID);
      this._calculateIndex();
      this.startTime = new Date().getTime();
      this.x1 = this.preX = evt.touches[0].pageX;
      this.y1 = this.preY = evt.touches[0].pageY;
      this.start = this.vertical ? this.preY : this.preX;
      this._firstTouchMove = true;
      this._preventMove = false;
    },
    _move: function(evt) {
      if (this.isTouchStart) {
        var len = evt.touches.length,
          currentX = evt.touches[0].pageX,
          currentY = evt.touches[0].pageY;

        if (this._firstTouchMove) {
          if (this.lockDirection) {
            var dDis =
              Math.abs(currentX - this.x1) - Math.abs(currentY - this.y1);
            if (dDis > 0 && this.vertical) {
              this._preventMove = true;
            } else if (dDis < 0 && !this.vertical) {
              this._preventMove = true;
            }
          }
          this._firstTouchMove = false;
        }

        if (!this._preventMove) {
          var d =
            (this.vertical ? currentY - this.preY : currentX - this.preX) *
            this.sensitivity;
          var f = this.moveFactor;
          if (this.isAtMax() && d > 0) {
            f = this.outFactor;
          } else if (this.isAtMin() && d < 0) {
            f = this.outFactor;
          }
          d *= f;
          this.preX = currentX;
          this.preY = currentY;
          
          // 取消滑动回弹
          if (this.hasMax && !this.canCrossBorderMax && this.target[this.property] + (this.reverse ? -d : d) > this.max()){
            var distance =  this.max() - this.target[this.property];
            d = this.reverse ? -distance : distance;
          }
          if (this.hasMin && !this.canCrossBorderMin && this.target[this.property] + (this.reverse ? -d : d) < this.min()){
            var distance =  this.min() - this.target[this.property];
            d = this.reverse ? -distance : distance;
          }

          if (!this.fixed) {
            this.target[this.property] += this.reverse ? -d : d;
          }
          this.change.call(this, this.target[this.property]);
          var timestamp = new Date().getTime();
          if (timestamp - this.startTime > 300) {
            this.startTime = timestamp;
            this.start = this.vertical ? this.preY : this.preX;
          }
          this.touchMove.call(this, evt, this.target[this.property]);
        }

        if (
          this.preventDefault &&
          !preventDefaultTest(evt.target, this.preventDefaultException)
        ) {
          evt.preventDefault();
        }

        if (len === 1) {
          if (this.x2 !== null) {
            evt.deltaX = currentX - this.x2;
            evt.deltaY = currentY - this.y2;
          } else {
            evt.deltaX = 0;
            evt.deltaY = 0;
          }
          this.pressMove.call(this, evt, this.target[this.property]);
        }
        this.x2 = currentX;
        this.y2 = currentY;
      }
    },
    _cancel: function(evt) {
      var current = this.target[this.property];
      this.touchCancel.call(this, evt, current);
      this._end(evt);
    },
    to: function(v, time, user_ease, callback = function() {}) {
      this._to(
        v,
        this._getValue(time, 600),
        user_ease || ease,
        this.change,
        function(value) {
          this._calculateIndex();
          this.reboundEnd.call(this, value);
          this.animationEnd.call(this, value);
          callback.call(this, value);
        }.bind(this)
      );
    },
    _calculateIndex: function() {
      if (this.hasMax && this.hasMin) {
        this.currentPage = Math.round(
          (this.max() - this.target[this.property]) / this.step
        );
      }
    },
    /**
     * touch移动结束时调用，若touchEnd返回false则不会进行惯性运动及越界回弹
     */
    _end: function(evt) {
      if (this.isTouchStart) {
        this.isTouchStart = false;
        var self = this,
          current = this.target[this.property],
          triggerTap =
            Math.abs(evt.changedTouches[0].pageX - this.x1) < 30 &&
            Math.abs(evt.changedTouches[0].pageY - this.y1) < 30;
        if (triggerTap) {
          this.tap.call(this, evt, current);
        }
        if (this.touchEnd.call(this, evt, current, this.currentPage) === false)
          return;
        if (this.hasMax && current > this.max()) {
          // 越界橡皮筋回弹
          if (!this.shouldRebound(current)) {
            return;
          }
          console.log("rebounce: " + current);
          this._to(
            this.max(),
            200,
            ease,
            this.change,
            function(value) {
              this.reboundEnd.call(this, value);
              this.animationEnd.call(this, value);
            }.bind(this)
          );
        } else if (this.hasMin && current < this.min()) {
          // 越界橡皮筋回弹
          if (!this.shouldRebound(current)) {
            return;
          }
          console.log("rebounce: " + current);
          this._to(
            this.min(),
            200,
            ease,
            this.change,
            function(value) {
              this.reboundEnd.call(this, value);
              this.animationEnd.call(this, value);
            }.bind(this)
          );
        } else if (
          this.inertia &&
          !triggerTap &&
          !this._preventMove &&
          !this.fixed
        ) {
          // 在界内的惯性运动
          var dt = new Date().getTime() - this.startTime;
          if (dt < 300) {
            console.log("inertia: " + current);
            var distance =
                ((this.vertical
                  ? evt.changedTouches[0].pageY
                  : evt.changedTouches[0].pageX) -
                  this.start) *
                this.sensitivity,
              speed = Math.abs(distance) / dt,
              actualSpeed = this.factor * speed;
            if (this.hasMaxSpeed && actualSpeed > this.maxSpeed) {
              actualSpeed = this.maxSpeed;
            }
            var direction = distance < 0 ? -1 : 1;
            if (this.reverse) {
              direction = -direction;
            }
            var destination =
              current +
              ((actualSpeed * actualSpeed) / (2 * this.deceleration)) *
                direction;

            var tRatio = 1;
            if (destination < this.min()) {
              if (destination < this.min() - this.maxRegion) {
                tRatio = reverseEase(
                  (current - this.min() + this.springMaxRegion) /
                    (current - destination)
                );
                destination = this.min() - this.springMaxRegion;
              } else {
                tRatio = reverseEase(
                  (current -
                    this.min() +
                    (this.springMaxRegion * (this.min() - destination)) /
                      this.maxRegion) /
                    (current - destination)
                );
                destination =
                  this.min() -
                  (this.springMaxRegion * (this.min() - destination)) /
                    this.maxRegion;
              }
            } else if (destination > this.max()) {
              if (destination > this.max() + this.maxRegion) {
                tRatio = reverseEase(
                  (this.max() + this.springMaxRegion - current) /
                    (destination - current)
                );
                destination = this.max() + this.springMaxRegion;
              } else {
                tRatio = reverseEase(
                  (this.max() +
                    (this.springMaxRegion * (destination - this.max())) /
                      this.maxRegion -
                    current) /
                    (destination - current)
                );
                destination =
                  this.max() +
                  (this.springMaxRegion * (destination - this.max())) /
                    this.maxRegion;
              }
            }
            var duration = Math.round(speed / self.deceleration) * tRatio;

            self._to(
              Math.round(destination),
              duration,
              ease,
              self.change,
              function(value) {
                if (self.hasMax && self.target[self.property] > self.max()) {
                  // 惯性运动越界后回弹
                  if (!this.shouldRebound(self.target[self.property])) {
                    return;
                  }
                  cancelAnimationFrame(self.tickID);
                  self._to(
                    self.max(),
                    600,
                    ease,
                    self.change,
                    self.animationEnd
                  );
                } else if (
                  self.hasMin &&
                  self.target[self.property] < self.min()
                ) {
                  // 惯性运动越界后回弹
                  if (!this.shouldRebound(self.target[self.property])) {
                    return;
                  }
                  cancelAnimationFrame(self.tickID);
                  self._to(
                    self.min(),
                    600,
                    ease,
                    self.change,
                    self.animationEnd
                  );
                } else {
                  if (self.step) {
                    self._correction();
                  } else {
                    self.animationEnd.call(self, value);
                  }
                }

                self.change.call(this, value);
              }
            );
          } else {
            self._correction();
          }
        } else {
          self._correction();
        }
        // if (this.preventDefault && !preventDefaultTest(evt.target, this.preventDefaultException)) {
        //     evt.preventDefault();
        // }
      }
      this.x1 = this.x2 = this.y1 = this.y2 = null;
    },
    _to: function(value, time, ease, onChange, onEnd) {
      // if (this.fixed) return;   // fixed不应该影响这里，否则会造成回弹动画卡在半路
      var el = this.target,
        property = this.property;
      var current = el[property];
      var dv = value - current;
      var beginTime = new Date();
      var self = this;
      var toTick = function() {
        var dt = new Date() - beginTime;
        if (dt >= time) {
          el[property] = value;
          onChange && onChange.call(self, value);
          onEnd && onEnd.call(self, value);
          return;
        }
        el[property] = dv * ease(dt / time) + current;
        self.tickID = requestAnimationFrame(toTick);
        //cancelAnimationFrame必须在 tickID = requestAnimationFrame(toTick);的后面
        onChange && onChange.call(self, el[property]);
      };
      toTick();
    },
    /**
     * 纠正位置，使其位于step的整数倍位置上
     */
    _correction: function() {
      if (this.step === void 0) return;
      var el = this.target,
        property = this.property;
      var current = el[property];
      var rpt = Math.floor(Math.abs(current / this.step));
      var dy = current % this.step;
      if (Math.abs(dy) > this.step / 2) {
        this._to(
          (current < 0 ? -1 : 1) * (rpt + 1) * this.step,
          400,
          ease,
          this.change,
          function(value) {
            this._calculateIndex();
            this.correctionEnd.call(this, value);
            this.animationEnd.call(this, value);
          }.bind(this)
        );
      } else {
        this._to(
          (current < 0 ? -1 : 1) * rpt * this.step,
          400,
          ease,
          this.change,
          function(value) {
            this._calculateIndex();
            this.correctionEnd.call(this, value);
            this.animationEnd.call(this, value);
          }.bind(this)
        );
      }
    }
  };

  if (typeof module !== "undefined" && typeof exports === "object") {
    module.exports = AlloyTouch;
  } else {
    window.AlloyTouch = AlloyTouch;
  }
})();
