module P {
	export enum Status {
		Unfulfilled,
		Rejected,
		Resolved
	}

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

	export function defer<Value>(): Deferred<Value>
	{
		return new DeferredI<Value>();
	}

	export interface ErrorMessage
	{
		message: string;
	}

	export interface DeferredOrPromise<Value>
	{
		status: Status;
		result?: Value;
		error?: ErrorMessage;
	}

	export interface Promise<Value> extends DeferredOrPromise<Value>
	{
		done(f: (v: Value) => void ): Promise<Value>;
		fail(f: (err: ErrorMessage) => void ): Promise<Value>;
		always(f: (v?: Value, err?: ErrorMessage) => void ): Promise<Value>;

		then<T2>(f: (v: Value) => Promise<T2>): Promise<T2>;
		convert<T2>(f: (v: Value) => T2): Promise<T2>;
	}

	export interface Deferred<Value> extends DeferredOrPromise<Value>
	{
		done(f: (v: Value) => void ): Deferred<Value>;
		fail(f: (err: ErrorMessage) => void ): Deferred<Value>;
		always(f: (v?: Value, err?: ErrorMessage) => void ): Deferred<Value>;

		resolve(result: Value);
		reject(err: ErrorMessage);
		promise() : Promise<Value>;
	}

	class PromiseI<Value> implements Promise<Value>
	{
		constructor(private deferred: DeferredI<Value>)
		{ }

		get status(): Status { return this.deferred.status; }
		get result(): Value { return this.deferred.result; }
		get error(): ErrorMessage { return this.deferred.error; }

		done(f: (v: Value) => void ): Promise<Value> {
			this.deferred.done(f);
			return this;
		}
		fail(f: (err: ErrorMessage) => void ): Promise<Value> {
			this.deferred.fail(f);
			return this;
		}
		always(f: (v?: Value, err?: ErrorMessage) => void ): Promise<Value> {
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

	class DeferredI<Value> implements Deferred<Value>{

		private _resolved: (v: Value) => void = _ => { };
		private _rejected: (err:ErrorMessage) => void = _ => { };

		private _status: Status = Status.Unfulfilled;
		private _result: Value;
		private _error: ErrorMessage = { message: "" };
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

		get error(): ErrorMessage{
			return this._error;
		}

		then<T2>(f: (v:Value) => Promise<T2>): Promise<T2>
		{
			var d = defer<Value>();

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

		convert<T2>(f: (v:Value) => T2) : Promise<T2>
		{
			var d = defer<T>();

			this
				.done(v => d.resolve(f(v)))
				.fail(d.reject);

			return d.promise();
		}

		done(f: (v:Value) => void ): Deferred<Value>
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

		fail(f: (err: ErrorMessage) => void ) : Deferred<Value>
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

		always(f: (v?:Value, err?:ErrorMessage) => void ) : Deferred<Value>
		{
			this
				.done(v => f(v))
				.fail(v => f(null, v));

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

		reject(err: ErrorMessage) {
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