path = require 'path'
fs_extra = require 'fs-extra'
logsmith = require 'logsmith'
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
		
	copy: (source, dest) ->
		real_source = path.resolve path.dirname(@manifest.meta.location), source
		task =
			desc: "copy #{source} to #{dest}"
			run: (callback) ->
				fs_extra.copy real_source, dest, (err) ->
					logsmith.exception err if err
					
					return callback new Error "copy failed" if err
					return callback null
					
		@step task
		
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
		
