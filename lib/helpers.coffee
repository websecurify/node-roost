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
		@ignited = false
		
	next: (task, callback) ->
		@steps.unshift [task, callback]
		
	step: (task, callback) ->
		@steps.push [task, callback]
		
	recover: (task, callback) ->
		@recoveries.push [task, callback]
		
	ignite: (dry, callback) ->
		@ignited = true
		exec_err = null
		exec_pointer = 'steps'
		
		test = () =>
			return true if @[exec_pointer].length > 0
			return false if exec_pointer == 'recoveries'
			
			exec_pointer = 'recoveries'
			
			return do arguments.callee
			
		fn = (callback) =>
			entry = @[exec_pointer].shift()
			task = entry[0]
			task_callback = entry[1]
			
			if dry
				logsmight.info task.desc if task.desc?
				
				return callback null if callback
			else
				super_callback = (err) =>
					task_callback err if task_callback
					
					if err
						if exec_pointer == 'recoveries'
							logsmith.error err
						else
							@steps = []
							exec_err = err
							exec_pointer = 'recoveries'
							
					return callback null if callback
					
				logsmight.info task.desc if task.desc?
				
				return task.run super_callback if task.run?
				return task super_callback if task
				
		async.whilst test, fn, (err) ->
			return callback err if err
			return callback exec_err if exec_err
			return callback null if callback
			
	exec: () -> throw new Error "not implemented"
	spawn: () -> throw new Error "not implemented"
	
