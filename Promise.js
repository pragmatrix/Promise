var P;
(function (P) {
    function defer() {
        return new DeferredI();
    }
    P.defer = defer;
    function resolve(v) {
        if (typeof v === "undefined") { v = {}; }
        return defer().resolve(v).promise();
    }
    P.resolve = resolve;
    function reject(err) {
        return defer().reject(err).promise();
    }
    P.reject = reject;
    function unfold(unspool, seed) {
        var d = defer();
        var elements = [];
        unfoldCore(elements, d, unspool, seed);
        return d.promise();
    }
    P.unfold = unfold;
    function unfoldCore(elements, deferred, unspool, seed) {
        var result = unspool(seed);
        if (!result) {
            deferred.resolve(elements);
            return;
        }
        while(result.next && result.promise.status == P.Status.Resolved) {
            elements.push(result.promise.result);
            result = unspool(result.next);
            if (!result) {
                deferred.resolve(elements);
                return;
            }
        }
        result.promise.done(function (v) {
            elements.push(v);
            if (!result.next) {
                deferred.resolve(elements);
            } else {
                unfoldCore(elements, deferred, unspool, result.next);
            }
        }).fail(function (e) {
            deferred.reject(e);
        });
    }
    (function (Status) {
        Status._map = [];
        Status._map[0] = "Unfulfilled";
        Status.Unfulfilled = 0;
        Status._map[1] = "Rejected";
        Status.Rejected = 1;
        Status._map[2] = "Resolved";
        Status.Resolved = 2;
    })(P.Status || (P.Status = {}));
    var Status = P.Status;
    function when() {
        var promises = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            promises[_i] = arguments[_i + 0];
        }
        var allDone = defer();
        if (!promises.length) {
            allDone.resolve([]);
            return allDone.promise();
        }
        var resolved = 0;
        var results = [];
        promises.forEach(function (p, i) {
            p.done(function (v) {
                results[i] = v;
                ++resolved;
                if (resolved === promises.length && allDone.status != Status.Rejected) {
                    allDone.resolve(results);
                }
            }).fail(function (e) {
                allDone.reject(new Error("when: one or more promises were rejected"));
            });
        });
        return allDone.promise();
    }
    P.when = when;
    var PromiseI = (function () {
        function PromiseI(deferred) {
            this.deferred = deferred;
        }
        Object.defineProperty(PromiseI.prototype, "status", {
            get: function () {
                return this.deferred.status;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PromiseI.prototype, "result", {
            get: function () {
                return this.deferred.result;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PromiseI.prototype, "error", {
            get: function () {
                return this.deferred.error;
            },
            enumerable: true,
            configurable: true
        });
        PromiseI.prototype.done = function (f) {
            this.deferred.done(f);
            return this;
        };
        PromiseI.prototype.fail = function (f) {
            this.deferred.fail(f);
            return this;
        };
        PromiseI.prototype.always = function (f) {
            this.deferred.always(f);
            return this;
        };
        PromiseI.prototype.then = function (f) {
            return this.deferred.then(f);
        };
        PromiseI.prototype.thenConvert = function (f) {
            return this.deferred.thenConvert(f);
        };
        return PromiseI;
    })();    
    var DeferredI = (function () {
        function DeferredI() {
            this._resolved = function (_) {
            };
            this._rejected = function (_) {
            };
            this._status = Status.Unfulfilled;
            this._error = {
                message: ""
            };
            this._promise = new PromiseI(this);
        }
        DeferredI.prototype.promise = function () {
            return this._promise;
        };
        Object.defineProperty(DeferredI.prototype, "status", {
            get: function () {
                return this._status;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DeferredI.prototype, "result", {
            get: function () {
                if (this._status != Status.Resolved) {
                    throw new Error("Promise: result not available");
                }
                return this._result;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DeferredI.prototype, "error", {
            get: function () {
                if (this._status != Status.Rejected) {
                    throw new Error("Promise: rejection reason not available");
                }
                return this._error;
            },
            enumerable: true,
            configurable: true
        });
        DeferredI.prototype.then = function (f) {
            var d = defer();
            this.done(function (v) {
                var p2 = f(v);
                p2.done(function (v2) {
                    return d.resolve(v2);
                }).fail(function (err) {
                    return d.reject(err);
                });
            }).fail(function (err) {
                return d.reject(err);
            });
            return d.promise();
        };
        DeferredI.prototype.thenConvert = function (f) {
            var d = defer();
            this.done(function (v) {
                return d.resolve(f(v));
            }).fail(function (err) {
                return d.reject(err);
            });
            return d.promise();
        };
        DeferredI.prototype.done = function (f) {
            if (this.status === Status.Resolved) {
                f(this._result);
                return this;
            }
            if (this.status !== Status.Unfulfilled) {
                return this;
            }
            var prev = this._resolved;
            this._resolved = function (v) {
                prev(v);
                f(v);
            };
            return this;
        };
        DeferredI.prototype.fail = function (f) {
            if (this.status === Status.Rejected) {
                f(this._error);
                return this;
            }
            if (this.status !== Status.Unfulfilled) {
                return this;
            }
            var prev = this._rejected;
            this._rejected = function (e) {
                prev(e);
                f(e);
            };
            return this;
        };
        DeferredI.prototype.always = function (f) {
            this.done(function (v) {
                return f(v);
            }).fail(function (err) {
                return f(null, err);
            });
            return this;
        };
        DeferredI.prototype.resolve = function (result) {
            if (this._status !== Status.Unfulfilled) {
                throw new Error("tried to resolve a fulfilled promise");
            }
            this._result = result;
            this._status = Status.Resolved;
            this._resolved(result);
            this.detach();
            return this;
        };
        DeferredI.prototype.reject = function (err) {
            if (this._status !== Status.Unfulfilled) {
                throw new Error("tried to reject a fulfilled promise");
            }
            this._error = err;
            this._status = Status.Rejected;
            this._rejected(err);
            this.detach();
            return this;
        };
        DeferredI.prototype.detach = function () {
            this._resolved = function (_) {
            };
            this._rejected = function (_) {
            };
        };
        return DeferredI;
    })();    
})(P || (P = {}));
