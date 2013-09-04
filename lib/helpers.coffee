async = require 'async'
events = require 'events'
logsmight = require 'logsmith'

# ---

exports.escape = (input) ->
	input
		.replace(/\t/g, '\\t')
		.replace(/\n/g, '\\n')
		.replace(/(["`$\\])/g, '\\$1')
		
# ---

exports.quote = (input) ->
	'"' + exports.escape(input) + '"'
	
# ---

exports.Stream = class Stream extends events.EventEmitter
	emit_data_for_stdout: (data) -> @emit 'data', data, 'stdout'
	emit_data_for_stderr: (data) -> @emit 'data', data, 'stderr'
	emit_error: (error) -> @emit 'error', error
	emit_exit: (exit) -> @emit 'exit', exit
	
# ---

exports.Target = class Target
	constructor: () ->
		@tasks = []
		
	step: (task, callback) ->
		@tasks.push task, callback
		
	ignite: (dry, callback) ->
		if dry
			for task in @tasks
				logsmight.info task.desc if task.desc?
				
			do callback
		else
			queue = async.queue (task, callback) ->
				logsmight.info task.desc if task.desc?
				
				return task.run callback if task.run?
				return task callback if task
				
			queue.drain = callback
			
			for task in @tasks
				queue.push task if task
				
	copy: () -> throw new Error "not implemented"
	exec: () -> throw new Error "not implemented"
	spawn: () -> throw new Error "not implemented"
	
