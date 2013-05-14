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
			return allDone;
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

		return allDone;
	}

	export function defer<T>(): Deferred<T>
	{
		return new Deferred<T>();
	}

	export interface ErrorMessage
	{
		message: string;
	}

	export interface Promise<T>
	{
		then<T2>(f: (v: T) => Promise<T2>): Promise<T2>;
		convert<T2>(f: (v: T) => T2): Promise<T2>;

		done(f: (v: T) => void ): Promise<T>;
		fail(f: (err: ErrorMessage) => void ): Promise<T>;
		always(f: (v?: T, err?: ErrorMessage) => void ): Promise<T>;

		status: Status;
		result?: T;
		error?: ErrorMessage;
	}

	export class Deferred<T> implements Promise<T>{

		private _resolved: (v: T) => void = _ => { };
		private _rejected: (err:ErrorMessage) => void = _ => { };

		private _status: Status = Status.Unfulfilled;
		private _result: T;
		private _error: ErrorMessage = { message: "" };

		promise(): Promise<T> {
			return this;
		}

		get status(): Status {
			return this._status;
		}

		get result(): T {
			return this._result;
		}

		get error(): ErrorMessage{
			return this._error;
		}

		then<T2>(f: (v:T) => Promise<T2>): Promise<T2>
		{
			var d = defer<T>();

			this
				.done(v =>
				{
					var p2 = f(v);
					p2
						.done(v2 => d.resolve(v2))
						.fail(d.reject);
				} )
				.fail(d.reject);

			return d;
		}

		convert<T2>(f: (v:T) => T2) : Promise<T2>
		{
			var d = defer<T>();

			this
				.done(v => d.resolve(f(v)))
				.fail(d.reject);

			return d;
		}

		done(f: (v:T) => void ): Promise<T>
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

		fail(f: (err: ErrorMessage) => void ) : Promise<T>
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

		always(f: (v?:T, err?:ErrorMessage) => void ) : Promise<T>
		{
			this
				.done(v => f(v))
				.fail(v => f(null, v));

			return this;
		}

		resolve(result: T) {
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