/// <reference path="Scripts/typings/qunit/qunit.d.ts"/>
/// <reference path="Promise.ts"/>

module PromiseTests {

	var defer = P.defer;
	var when = P.when;
	var promise = P.promise;
	interface Promise<T> extends P.Promise<T> {}

	// state

	test("when resolve: status===Resolved", () =>
	{
		var d = defer<number>();
		d.resolve(0);
		ok(d.status === P.Status.Resolved);
	} );

	test("when reject: status===Resolved", () =>
	{
		var d = defer<number>();
		d.reject({ message: "na" });
		ok(d.status === P.Status.Rejected);
	} );

	// double resolve reject

	test("when resolved twice throw", () =>
	{
		var d = defer<number>();
		d.resolve(0);
		throws(() =>
		{
			d.resolve(1);
		} );
	} );

	test("when rejected twice throw", () =>
	{
		var d = defer<number>();
		d.reject({ message: "nana" });

		throws(() =>
		{
			d.reject({ message: "ohoh" });
		} );
	} );

	// done / fail / always handlers
	
	test("when resolve: done", () =>
	{
		var d = defer<number>();
		d.done(() => {
			ok(true);
		} );

		d.resolve(1);
	} );

	test("when already resolved: done", () =>
	{
		var d = defer<number>();
		d.resolve(1);
		d.done(() => {
			ok(true);
		} );
	} );

	test("when rejected: fail", () =>
	{
		var d = defer<number>();
		d.fail(() => {
			ok(true);
		} );
		d.reject({ message: "na" });
	} );

	test("when already rejected rejected: fail", () =>
	{
		var d = defer<number>();
		d.reject({ message: "na" });
		d.fail(() => {
			ok(true);
		} );
	} );

	test("when rejected, call always", () =>
	{
		var d = defer<number>();
		d.reject({ message: "na" });
		d.always((v?, err?) => {
			ok(!v && err.message === "na");
		} );
	} );

	test("when resolved, call always", () =>
	{
		var d = defer<number>();
		d.resolve(10);
		d.always((v?, err?) => {
			ok(!err && v === 10);
		} );
	} );

	// values and errors

	test("actually passes the value to the done", () =>
	{
		var d = defer<number>();
		d.done((value) => {
			ok(4711===value);
		} );
		d.resolve(4711);
	} );

	test("actually passes the error message to the fail handler", () =>
	{
		var d = defer<number>();
		d.fail((err) => {
			ok("nana" === err.message);
		} );
		d.reject({ message: "nana" });
	} );

	// handler sequencing

	test("two done handler are called in sequence", () =>
	{
		expect(2);

		var d = defer<number>();
		var seq = 0;

		d.done(() =>
		{
			ok(0 === seq++);
		} );

		d.done(() =>
		{
			ok(1 === seq++);
		} );

		d.resolve(0);
	} );

	test("two fail handler are called in sequence", () =>
	{
		expect(2);

		var d = defer<number>();
		var seq = 0;

		d.fail(() =>
		{
			ok(0 === seq++);
		} );

		d.fail(() =>
		{
			ok(1 === seq++);
		} );

		d.reject({ message: "" });
	} );

	// then

	test("then receives the value", () =>
	{
		var d = defer<number>();
		var d2 = d.promise().then(n => {
			ok(n === 10);
			return defer<number>().promise();
		});

		d.resolve(10);
	} );

	test("combined resolve", () =>
	{
		expect(2);

		var d = defer<number>();
		var p = d.promise().then(n => {
			ok(n === 10);
			var d2 = defer<number>();
			d2.resolve(4);
			return d2.promise();
		} );

		d.resolve(10);
		p.done(n => ok(n === 4));
	} );

	// when

	test("when no arguments given, when resolves immediately", () =>
	{
		var p = when();
		p.done(v => {
			ok(!v.length);
		} );
	} );

	test("when all are resolved, when resolves", () =>
	{
		expect(3);

		var d = defer<number>();
		var d2 = defer<bool>();

		var p = when(d.promise(), d2.promise());
		p.done(v =>
		{
			ok(v.length === 2);
			ok(v[0] === 10);
			ok(v[1] === true);
		} );

		d.resolve(10);
		d2.resolve(true);
	} );

	test("when first fails, when fails", () =>
	{
		var d = defer<number>();
		var d2 = defer<bool>();

		var p = when(d.promise(), d2.promise());
		p.fail(err =>
		{
			ok(true);
		} );

		d.reject({ message: "nana" });
	} );

	test("when second fails, when fails", () =>
	{
		var d = defer<number>();
		var d2 = defer<bool>();

		var p = when(d.promise(), d2.promise());
		p.fail(err =>
		{
			ok(true);
		} );

		d2.reject({ message: "nana" });
	} );

	// result / error

	test("accessing the result property of a resolved promise does not throw", () =>
	{
		var p = promise(1);
		ok(1 === p.result);
	} );

	test("accessing the result of an unfulfilled or rejected promise throws", () =>
	{
		var d = defer<number>();
		var p = d.promise();
		throws(() =>
		{
			p.result;
		} );

		d.reject({ message: "no!" });

		throws(() =>
		{
			p.result;
		} );
	} );

	
	test("accessing the error property of a rejected promise does not throw", () =>
	{
		var d = defer<number>();
		d.reject({ message: "rejected" });

		ok(d.error.message === "rejected");
	} );

	test("accessing the error property of an unfulfilled or resolved promise throws", () =>
	{
		var d = defer<number>();
		var p = d.promise();
		throws(() =>
		{
			p.error;
		} );

		d.resolve(1);

		throws(() =>
		{
			p.error;
		} );
	} );

}
