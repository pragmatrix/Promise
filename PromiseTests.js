var PromiseTests;
(function (PromiseTests) {
    var defer = P.defer;
    var when = P.when;
    test("when resolve: status===Resolved", function () {
        var d = defer();
        d.resolve(0);
        ok(d.status === P.Status.Resolved);
    });
    test("when reject: status===Resolved", function () {
        var d = defer();
        d.reject({
            message: "na"
        });
        ok(d.status === P.Status.Rejected);
    });
    test("when resolved twice throw", function () {
        var d = defer();
        d.resolve(0);
        throws(function () {
            d.resolve(1);
        });
    });
    test("when rejected twice throw", function () {
        var d = defer();
        d.reject({
            message: "nana"
        });
        throws(function () {
            d.reject({
                message: "ohoh"
            });
        });
    });
    test("when resolve: done", function () {
        var d = defer();
        d.done(function () {
            ok(true);
        });
        d.resolve(1);
    });
    test("when already resolved: done", function () {
        var d = defer();
        d.resolve(1);
        d.done(function () {
            ok(true);
        });
    });
    test("when rejected: fail", function () {
        var d = defer();
        d.fail(function () {
            ok(true);
        });
        d.reject({
            message: "na"
        });
    });
    test("when already rejected rejected: fail", function () {
        var d = defer();
        d.reject({
            message: "na"
        });
        d.fail(function () {
            ok(true);
        });
    });
    test("when rejected, call always", function () {
        var d = defer();
        d.reject({
            message: "na"
        });
        d.always(function (v, err) {
            ok(!v && err.message === "na");
        });
    });
    test("when resolved, call always", function () {
        var d = defer();
        d.resolve(10);
        d.always(function (v, err) {
            ok(!err && v === 10);
        });
    });
    test("actually passes the value to the done", function () {
        var d = defer();
        d.done(function (value) {
            ok(4711 === value);
        });
        d.resolve(4711);
    });
    test("actually passes the error message to the fail handler", function () {
        var d = defer();
        d.fail(function (err) {
            ok("nana" === err.message);
        });
        d.reject({
            message: "nana"
        });
    });
    test("two done handler are called in sequence", function () {
        expect(2);
        var d = defer();
        var seq = 0;
        d.done(function () {
            ok(0 === seq++);
        });
        d.done(function () {
            ok(1 === seq++);
        });
        d.resolve(0);
    });
    test("two fail handler are called in sequence", function () {
        expect(2);
        var d = defer();
        var seq = 0;
        d.fail(function () {
            ok(0 === seq++);
        });
        d.fail(function () {
            ok(1 === seq++);
        });
        d.reject({
            message: ""
        });
    });
    test("then receives the value", function () {
        var d = defer();
        var d2 = d.promise().then(function (n) {
            ok(n === 10);
            return defer().promise();
        });
        d.resolve(10);
    });
    test("combined resolve", function () {
        expect(2);
        var d = defer();
        var p = d.promise().then(function (n) {
            ok(n === 10);
            var d2 = defer();
            d2.resolve(4);
            return d2.promise();
        });
        d.resolve(10);
        p.done(function (n) {
            return ok(n === 4);
        });
    });
    test("then: first rejected: first and outer fails", function () {
        expect(2);
        var first = defer();
        var outer = first.promise().then(function (n) {
            ok(false);
            return defer().promise();
        });
        first.fail(function (err) {
            ok(true);
        });
        outer.fail(function (err) {
            ok(true);
        });
        first.reject({
            message: "fail"
        });
    });
    test("then: first resolved and second rejected: second fails and outer fails", function () {
        expect(2);
        var first = defer();
        var second = defer();
        var outer = first.promise().then(function (n) {
            return second.promise();
        });
        second.fail(function (err) {
            ok(true);
        });
        outer.fail(function (err) {
            ok(true);
        });
        first.resolve(1);
        second.reject({
            message: "fail"
        });
    });
    test("when no arguments given, when resolves immediately", function () {
        var p = when();
        p.done(function (v) {
            ok(!v.length);
        });
    });
    test("when all are resolved, when resolves", function () {
        expect(3);
        var d = defer();
        var d2 = defer();
        var p = when(d.promise(), d2.promise());
        p.done(function (v) {
            ok(v.length === 2);
            ok(v[0] === 10);
            ok(v[1] === true);
        });
        d.resolve(10);
        d2.resolve(true);
    });
    test("when first fails, when fails", function () {
        var d = defer();
        var d2 = defer();
        var p = when(d.promise(), d2.promise());
        p.fail(function (err) {
            ok(true);
        });
        d.reject({
            message: "nana"
        });
    });
    test("when second fails, when fails", function () {
        var d = defer();
        var d2 = defer();
        var p = when(d.promise(), d2.promise());
        p.fail(function (err) {
            ok(true);
        });
        d2.reject({
            message: "nana"
        });
    });
    test("accessing the result property of a resolved promise does not throw", function () {
        var p = P.resolve(1);
        ok(1 === p.result);
    });
    test("accessing the result of an unfulfilled or rejected promise throws", function () {
        var d = defer();
        var p = d.promise();
        throws(function () {
            p.result;
        });
        d.reject({
            message: "no!"
        });
        throws(function () {
            p.result;
        });
    });
    test("accessing the error property of a rejected promise does not throw", function () {
        var d = defer();
        d.reject({
            message: "rejected"
        });
        ok(d.error.message === "rejected");
    });
    test("accessing the error property of an unfulfilled or resolved promise throws", function () {
        var d = defer();
        var p = d.promise();
        throws(function () {
            p.error;
        });
        d.resolve(1);
        throws(function () {
            p.error;
        });
    });
})(PromiseTests || (PromiseTests = {}));
