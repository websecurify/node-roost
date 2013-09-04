child_process = require 'child_process'

# ---

helpers = require './helpers'

# ---

exports.Target = class Target extends helpers.Target
	constructor: (@spec, @manifest) ->
		super()
		
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
			run: (callback) => @do_exec command, helpers.create_exec_handler(callback, failproof_or_handler)
			
		@step task
		
	spawn: (command, args, failproof_or_handler) ->
		task =
			desc: command + (if args.length ? ' ' + args.join(' ') else '')
			run: (callback) => @do_spawn command, args, helpers.create_exec_handler(callback, failproof_or_handler)
			
		@step task
		
