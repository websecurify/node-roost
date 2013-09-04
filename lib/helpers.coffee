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
		@steps = []
		@recoveries = []
		
	step: (task, callback) ->
		@steps.push [task, callback]
		
	recover: (task, callback) ->
		@recoveries.push [task, callback]
		
	ignite: (dry, callback) ->
		if dry
			for entry in @steps
				task = entry[0]
				task_callback = entry[1]
				
				logsmight.info task.desc if task.desc?
				
			for entry in @recoveries
				task = entry[0]
				task_callback = entry[1]
				
				logsmith.info task.desc if task.desc?
				
			do callback
		else
			steps_queue = async.queue (task, callback) ->
				logsmight.info task.desc if task.desc?
				
				return task.run callback if task.run?
				return task callback if task
				
			steps_queue.drain = () =>
				recoveries_queue = async.queue (task, callback) ->
					logsmight.info task.desc if task.desc?
				
					return task.run callback if task.run?
					return task callback if task
					
				recoveries_queue.drain = callback
				
				for entry in @recoveries
					task = entry[0]
					task_callback = entry[1]
					
					recoveries_queue.push task, task_callback
					
			for entry in @steps
				task = entry[0]
				task_callback = entry[1]
				
				steps_queue.push task, task_callback
				
	exec: () -> throw new Error "not implemented"
	spawn: () -> throw new Error "not implemented"
	
