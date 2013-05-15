## A Generic Promise implementation for TypeScript

Promises are a concept to structure asynchronous program and avoid callback hell. While they are not as full featured like Rx for example, they are attractive because their implementation is rather simple.

### Installing Promise.ts

Assuming that you are using Visual Studio,

	- [install the nuget package](http://nuget.org/packages/Promise.TypeScript/).

	- Then refer the Promise.ts file like:

		/// <reference path="Scripts/Promise.ts"/>

	- and then pollute the global scope a little:

		var defer = P.defer;
		var when = P.when;
		interface Promise<Value> extends P.Promise<Value> {}

To avoid putting the above code before into every TypeScript file, it's possible to put the reference and the aliases into your main application or module file that is then referenced from all other files. 
	
### Using Promise.ts

#### Creating Functions that return Promises

The pattern for creating promises is as follows: First a so called deferred is created to represent a precursor to a promise, then the deferred instance is bound to the callbacks, and then it returns the promise which can then be composed by the caller.

For example:
	
	function readBlob(blob: Blob): Promise<ArrayBuffer>
	{
		var d = defer<ArrayBuffer>();

		var reader = new FileReader();

		reader.onerror = d.reject;
		reader.onabort = () => {
			d.reject({ message: "aborted" });
		}
		reader.onloadend = () => {
			d.resolve(this.reader.result);
		}

		reader.readAsArrayBuffer(blob);

		return d.promise();
	}

The function above starts the reading operation and returns a promise that represents the the future result.

#### Composing Promises

The returned promise can now be composed with other methods that return promises:

	readBlob(blob).then(bytes => writeFile("name", bytes));

While `then` always expects a `Promise<>` return type, `thenConvert` does not:

	readBlob(blob).thenConvert(bytes => bytes.reverse());

returns a promise that represents the reading of the block and the reversing of the read bytes. The returned promise gets resolved as soon the conversion function finishes.

Starting parallel processes is also straightforward:

	var blobReader = readBlob(blob);
	var f1 = blobReader.then(bytes => writeFile("name", bytes));
	var f2 = blobReader.then(bytes => writeFile("name2", bytes));

Would then write the received bytes to the file "name" and "name2" at the same time.

Note that it is also possible to retrieve the result directly from the `blobReader` instance:

	var f1 = blobReader.then(() => writeFile("name1", blobReader.result));
	
.. which could simplify some more complex composition scenarios.

And when we need to bring them together, the `when` combinator takes a number of promises and returns one that resolves when all promises are resolved:

	when(f1, f2).then(() => commitToDatabaseThatAllFilesAreWritten());

Note that the returning type of `when` is `Promise<any[]>`, which resolves to an array that contains the results `when` was waiting for.

#### Adding Handlers

In addition to the composition features, there are low level primitive functions that can be used to register certain handlers:

	p.done(value => {});

registers a handler that is called when the promise is resolved.

	p.fail(err => {});

registers a handler that is called when the promise is rejected.

	p.always((value?, err?) => {});

registers a handler that is called when either the promise is resolved or rejected.

When multiple handlers of the same kinds are registered at the same promise, they are all called in their registration order.

### Ideas

- An explicit parallel combinator.
- Instead of `any[]`, use Tuples for the return type of `when()`. Because TypeScript does not have a standard library, someone needs to create `Tuple<>` types. BTW: What about creating a standard library that can be distributed as a number of nuget packages similar to the [DefinitelyTyped](https://github.com/borisyankov/DefinitelyTyped) repository? 
- Some looping or recursing construct that avoids eating stack space. The [recur special form](http://clojure.org/special_forms#recur) in Clojure looks like a good idea to start from.
- Progress notifications anyone?

### Roadmap

I built this Promise implementation, because I am planning a fairly large TypeScript project that requires a lot of asynchronous coordination. So I will try to push this forward over the next few weeks and will probably extend it beyond what existing Promise implementations have to offer. 

But of course, the ultimate feature limiter will always be simplicitly.

### Design & Implementation Details

I've decided to make it a bit harder to compose deferreds by not adding the composition methods to the `Deferred<Value>` interface. This makes the implementation simpler and has the additional advantage that implementors need to think and explicitly call promise() before they can starting composing.

I've decided against all exception handling for now, because I have never used promises before and don't know what exactly programmers would expect. Obviously this might change for a future version.

### License

Copyright (c) 2012, Armin Sander All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

Neither the name of Armin Sander nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL ARMIN SANDER BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.