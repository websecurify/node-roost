async = require 'async'
events = require 'events'
logsmight = require 'logsmith'

# ---

exports.escape = (input) ->
	return input.replace(/\t/g, '\\t').replace(/\n/g, '\\n').replace(/(["`$\\])/g, '\\$1')
	
# ---

exports.quote = (input) ->
	return '"' + exports.escape(input) + '"'
	
# ---

exports.Stream = class Stream extends events.EventEmitter
	emit_data_for_stdout: (data) -> @emit 'data', data, 'stdout'
	emit_data_for_stderr: (data) -> @emit 'data', data, 'stderr'
	emit_error: (error) -> @emit 'error', error
	emit_exit: (exit) -> @emit 'exit', exit
	
# ---

exports.create_exec_handler = (callback, failproof_or_handler) ->
	(err, stream) ->
		return callback err if err
		
		stream.on 'data', (data, extended) ->
			switch
				when extended == 'stdout' then out = process.stdout
				when extended == 'stderr' then out = process.stderr
				else out = process.stdout
				
			out.write data
			
		switch
			when failproof_or_handler == undefined
				failproof = false
				handler = null
			when typeof(failproof_or_handler) == 'boolean' || failproof_or_handler instanceof Boolean
				failproof = failproof_or_handler
				handler = null
			else
				failproof = false
				handler = failproof_or_handler
				
		if handler
			try
				handler.call this, stream, callback
			catch e
				return callback e if callback
		else
			stream.on 'exit', (code) ->
				return callback new Error "command exited with code #{code}" if code and !failproof
				return callback null if callback
				
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
	
