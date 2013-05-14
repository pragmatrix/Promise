/**
	Module P: Generic Promises for TypeScript
*/

module P {

	/**
		Create a new "Deferred", which is a Promise may be resolved or rejected.
	*/

	export function defer<Value>(): Deferred<Value>
	{
		return new DeferredI<Value>();
	}

	/**
		The status of a Promise. Initially a Promise is Unfulfilled and may
		change to Rejected or Resolved.
	 
		Once a promise is either Rejected or Resolved, it can not change it's 
		status anymore.
	*/

	export enum Status {
		Unfulfilled,
		Rejected,
		Resolved
	}

	/**
		If a promise gets rejected, at least an message that indicates the error or
		reason for the rejection must be provided.
	*/

	interface Rejection
	{
		message: string;
	}

	/**
		Both Promise<T> and Deferred<T> share these properties.
	*/

	interface DeferredOrPromise<Value>
	{
		/// The current status of the promise.
		status: Status;

		/// If the promise got resolved, the result of the promise.
		result?: Value;

		/// If the promise got rejected, the rejection message.
		error?: Rejection;
	}

	/**
		A Promise<Value> supports basic composition and the registration of handlers that are called when the 
		promise is fulfilled.

		When multiple handlers are registered with done(), fail(), or always(), they are called in the 
		same order as they were registered.
	*/

	export interface Promise<Value> extends DeferredOrPromise<Value>
	{
		/// Chain a promise after this promise and return a new promise that represents
		/// the chain.
		then<T2>(f: (v: Value) => Promise<T2>): Promise<T2>;
		/// Convert the resulting value if the promise gets resolved and return a new
		/// promise that represents the converted result.
		convert<T2>(f: (v: Value) => T2): Promise<T2>;

		/// Add a handler that is called when the promise gets resolved.
		done(f: (v: Value) => void ): Promise<Value>;
		/// Add a handler that is called when the promise gets rejected.
		fail(f: (err: Rejection) => void ): Promise<Value>;
		/// Add a handler that is called when the promise gets fulfilled (either resolved or rejected).
		always(f: (v?: Value, err?: Rejection) => void ): Promise<Value>;
	}

	/**
		Deferred<Value> supports the explicit resolving and rejecting of the 
		promise and the registration of fulfillment handlers.

		A Deferred<Value> should be only visible to the function that initially sets up
		an asynchronous process. Callers of that function should only use the Promise<Value> that
		is returned by promise().
	*/

	export interface Deferred<Value> extends DeferredOrPromise<Value>
	{
		/// Returns the encapsulated promise of this deferred instance.
		/// The returned promise supports composition but removes the ability to resolve or reject
		/// the promise.
		promise(): Promise<Value>;

		/// Resolve this promise.
		resolve(result: Value);
		/// Reject this promise.
		reject(err: { message: string });

		done(f: (v: Value) => void ): Deferred<Value>;
		fail(f: (err: Rejection) => void ): Deferred<Value>;
		always(f: (v?: Value, err?: Rejection) => void ): Deferred<Value>;
	}

	/**
		Creates a promise that gets resolved at the time all the Promises in the argument list get resolved.
		And as soon one of the arguments gets rejected, the resulting Promise gets rejected.
		If no promises were provided, the resulting promise is immediately resolved.
	*/

	export function when(...promises: Promise[]): Promise<any[]>
	{
		var allDone = defer<any[]>();
		if (!promises.length) {
			allDone.resolve([]);
			return allDone.promise();
		}

		var resolved = 0;
		var results = [];

		promises.forEach((p, i) => {
			p
				.done(v => {
					results[i] = v;
					++resolved;
					if (resolved === promises.length && allDone.status != Status.Rejected)
						allDone.resolve(results);
				} )
				.fail(e => {
					allDone.reject(new Error("when: one or more promises were rejected"));
				} );
		} );

		return allDone.promise();
	}

	/**
		Implementation of a promise.

		The Promise<Value> instance is a proxy to the Deferred<Value> instance.
	*/

	class PromiseI<Value> implements Promise<Value>
	{
		constructor(private deferred: DeferredI<Value>)
		{ }

		get status(): Status { return this.deferred.status; }
		get result(): Value { return this.deferred.result; }
		get error(): Rejection { return this.deferred.error; }

		done(f: (v: Value) => void ): Promise<Value> {
			this.deferred.done(f);
			return this;
		}
		fail(f: (err: Rejection) => void ): Promise<Value> {
			this.deferred.fail(f);
			return this;
		}
		always(f: (v?: Value, err?: Rejection) => void ): Promise<Value> {
			this.deferred.always(f);
			return this;
		}

		then<T2>(f: (v: Value) => Promise<T2>): Promise<T2> {
			return this.deferred.then(f);
		}

		convert<T2>(f: (v: Value) => T2): Promise<T2> {
			return this.deferred.convert(f);
		}
	}

	/**
		Implementation of a deferred.
	*/

	class DeferredI<Value> implements Deferred<Value>{

		private _resolved: (v: Value) => void = _ => { };
		private _rejected: (err: Rejection) => void = _ => { };

		private _status: Status = Status.Unfulfilled;
		private _result: Value;
		private _error: Rejection = { message: "" };
		private _promise: Promise<Value>;

		constructor() {
			this._promise = new PromiseI<Value>(this);
		}

		promise(): Promise<Value> {
			return this._promise;
		}

		get status(): Status {
			return this._status;
		}

		get result(): Value {
			return this._result;
		}

		get error(): Rejection {
			return this._error;
		}

		then<T2>(f: (v: Value) => Promise<T2>): Promise<T2>
		{
			var d = defer<T2>();

			this
				.done(v =>
				{
					var p2 = f(v);
					p2
						.done(v2 => d.resolve(v2))
						.fail(d.reject);
				} )
				.fail(d.reject);

			return d.promise();
		}

		convert<T2>(f: (v: Value) => T2): Promise<T2>
		{
			var d = defer<T2>();

			this
				.done(v => d.resolve(f(v)))
				.fail(d.reject);

			return d.promise();
		}

		done(f: (v: Value) => void ): Deferred<Value>
		{
			if (this.status === Status.Resolved) {
				f(this._result);
				return this;
			}

			if (this.status !== Status.Unfulfilled)
				return this;

			var prev = this._resolved;
			this._resolved = v => { prev(v); f(v); }

			return this;
		}

		fail(f: (err: Rejection) => void ): Deferred<Value>
		{
			if (this.status === Status.Rejected) {
				f(this._error);
				return this;
			}

			if (this.status !== Status.Unfulfilled)
				return this;

			var prev = this._rejected;
			this._rejected = e => { prev(e); f(e); }

			return this;
		}

		always(f: (v?: Value, err?: Rejection) => void ): Deferred<Value>
		{
			this
				.done(v => f(v))
				.fail(err => f(null, err));

			return this;
		}

		resolve(result: Value) {
			if (this._status !== Status.Unfulfilled)
				throw new Error("tried to resolve a fulfilled promise");

			this._result = result;
			this._status = Status.Resolved;
			this._resolved(result);

			this.detach();
		}

		reject(err: Rejection) {
			if (this._status !== Status.Unfulfilled)
				throw new Error("tried to reject a fulfilled promise");

			this._error = err;
			this._status = Status.Rejected;
			this._rejected(err);

			this.detach();
		}

		private detach()
		{
			this._resolved = _ => { };
			this._rejected = _ => { };
		}
	}
}