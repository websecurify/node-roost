ssh2 = require 'ssh2'

# ---

helpers = require './helpers'

# ---

exports.Target = class Target extends helpers.Target
	create_exec_handler: (callback, failproof_or_handler) ->
		(err, stream) ->
			return callback err if err
			
			stream.on 'data', (data, extended) ->
				switch
					when extended == 'stdout' then out = process.stdout
					when extended == 'stderr' then out = process.stderr
					else out = process.stdout
					
				out.write data
				
			switch
				when failproof_or_handler== undefined
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
					
	do_exec: (command, callback) ->
		shell_stream = new helpers.Stream
		child = child_process.spawn 'sh', ['-c', command]
		
		child.stdout.on 'data', (data) -> shell_stream.emit_data_for_stdout data
		child.on 'error', (error) -> shell_stream.emit_error error
		child.on 'exit', (code) -> shell_stream.emit_exit code
		
		callback null, shell_stream if callback
		
	do_spawn: (command, args, callback) ->
		shell_stream = new helpers.Stream
		child = child_process.spawn command, args
		
		child.stdout.on 'data', (data) -> shell_stream.emit_data_for_stdout data
		child.on 'error', (error) -> shell_stream.emit_error error
		child.on 'exit', (code) -> shell_stream.emit_exit code
		
		callback null, shell_stream if callback
		
	exec: (command, failproof_or_handler) ->
		task =
			desc: command
			run: (callback) => @do_exec command, @create_exec_handler(callback, failproof_or_handler)
			
		@step task
		
	spawn: (command, args, failproof_or_handler) ->
		task =
			desc: command + (if args.length ? ' ' + args.join(' ') else '')
			run: (callback) => @do_spawn command, args, @create_exec_handler(callback, failproof_or_handler)
			
		@step task
		
