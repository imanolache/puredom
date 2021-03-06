/**	Manages views, providing methods for loading, templating, caching and swapping.
 *	@constructor Creates a new TestSuite instance.
 *	@augments puredom.EventEmitter
 *	@param {Object} options		Hashmap of options to be given to the instance.
 */
puredom.TestSuite = function(options) {
	puredom.EventEmitter.call(this);
	this.list = {};
};


puredom.inherits(puredom.TestSuite, puredom.EventEmitter);

	
puredom.extend(puredom.TestSuite.prototype, /** @lends puredom.TestSuite# */ {
	
	/** Add a test to the suite.
	 *	@param {String} name	A human-readable name for the test
	 *	@param {Object} test	The test definition
	 *	@example:
	 *		suite.add("Example", {
	 *			prepare : function(test){},
	 *			run : function(test){
	 *				//-- *async* testing here --
	 *				test.finish(results);
	 *			},
	 *			cleanup : function(test){}
	 *		});
	 */
	add : function(name, test) {
		var id = this._getIdFromName(name);
		this.list[id] = {
			name : name,
			test : test,
			results : []
		};
	},
	

	/** Run the test that matches <code>name</code>.
	 *	@param {String} name	The name of a registered test to run
	 */
	run : function(name, callback, messageHandler) {
		var self = this,
			ob = this.get(name),
			test = ob && ob.test,
			passed = null,
			finish, onMessage, sandboxController, sandbox, finalResult;
		
		// Prepare-run-cleanup model:
		if (test && test.run) {
			onMessage = function(type, message) {
				if (type==='status') {
					finalResult = message;
				}
				if (type==='result') {
					passed = message===true;
				}
				else if (messageHandler) {
					self.fireEvent(type, name, message);
					messageHandler(type, message);
					return false;
				}
			};
			
			finish = function(results) {
				if (test.cleanup) {
					test.cleanup(sandbox);
				}
				
				if (results) {
					finalResult = results;
				}
				else if (sandbox.results) {
					finalResult = sandbox.results;
				}
				
				// Archive results:
				if (results) {
					ob.results.push({
						time : new Date().getTime(),
						results : results
					});
				}
				
				self.fireEvent('finish', name, finalResult, passed);
				if (callback) {
					callback(finalResult, passed);
				}
				sandboxController.destroy();
				self = finish = onMessage = finalResult = ob = test = sandboxController = sandbox = callback = messageHandler = null;
			};
			
			// Get a new sandbox controller:
			sandboxController = this._createSandboxController(ob);
			// simple events:
			sandboxController.messageHandler = onMessage;
			sandboxController.onfinish = finish;
			// get the sandbox itself:
			sandbox = sandboxController.getSandbox();
			
			if (test.prepare) {
				test.prepare(sandbox);
			}
			
			results = test.run(sandbox);
		}
	},
	

	/** Retrieve the test that matches <code>name</code>.
	 *	@param {String} name	The name of a registered test to find
	 */
	get : function(name) {
		var id = this._getIdFromName(name);
		return this.list.hasOwnProperty(id) && this.list[id] || false;
	},
	

	/** Get a list of test names available in the suite. */
	getList : function() {
		var names = [],
			i;
		for (i in this.list) {
			if (this.list.hasOwnProperty(i) && this.list[i].name) {
				names.push(this.list[i].name);
			}
		}
		return names;
	},
	

	/** @private */
	_getIdFromName : function(name) {
		return (name+'').toLowerCase().replace(/[^a-z0-9_]+/gm,'');
	},
	

	/** @private */
	_createSandboxController : function(testObj) {
		/**	@exports sandbox as puredom.TestSuite.test */

			/**	@private */
		var self = this,
			/**	@private */
			controller = {},
			/**	@name puredom.TestSuite.test */
			sandbox = {};
		
		/**	@private */
		controller.getSandbox = function() {
			return sandbox;
		};
		/**	@private */
		controller.destroy = function() {
			sandbox = controller = self = testObj = null;
		};
		
		sandbox.status = sandbox.setStatus = function(message) {
			var r;
			if (controller.messageHandler) {
				r = controller.messageHandler.call(self, 'status', message);
			}
			if (r!==false) {
				puredom.log('tests["'+testObj.name+'"] >> ' + message);
			}
		};
		sandbox.log = sandbox.postMessage = function(message) {
			var r;
			if (controller.messageHandler) {
				r = controller.messageHandler.call(self, 'log', message);
			}
			if (r!==false) {
				puredom.log('tests["'+testObj.name+'"] >> ' + message);
			}
		};
		sandbox.done = sandbox.finish = sandbox.complete = function(results) {
			if (controller.onfinish) {
				setTimeout(function() {
					if (controller.messageHandler) {
						controller.messageHandler.call(self, 'status', results);
					}
					if (controller.onfinish) {
						controller.onfinish.call(self,results);
					}
					results = null;
				}, 1);
			}
		};
		sandbox.pass = function(results) {
			if (controller.messageHandler) {
				controller.messageHandler.call(self, 'result', true);
			}
			if (controller.onpass) {
				controller.onpass.call(self, true);
			}
			sandbox.done(results);
		};
		sandbox.fail = function(results) {
			if (controller.messageHandler) {
				controller.messageHandler.call(self, 'result', false);
			}
			if (controller.onfail) {
				controller.onfail.call(self, fail);
			}
			sandbox.done(results);
		};
		
		return controller;
	},
	

	/** @private */
	list : {}

});