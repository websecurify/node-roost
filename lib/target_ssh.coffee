fs = require 'fs'
url = require 'url'
path = require 'path'
ssh2 = require 'ssh2'
logmisth = require 'logsmith'

# ---

helpers = require './helpers'

# ---

parse_spec = (spec) ->
	spec = url.parse spec
	auth_tokens = (spec.auth or '').split(':')
	spec.username = if auth_tokens[0] then decodeURIComponent(auth_tokens[0]) else undefined
	spec.password = if auth_tokens[1] then decodeURIComponent(auth_tokens[1]) else undefined
	
	if spec.pathname
		for entry in (spec.pathname.split(/;/g).slice(1).map (entry) -> entry.split('='))
			name = entry[0].trim()
			value = entry[1]
			
			switch
				when name == 'privateKey' then spec.privateKey = decodeURIComponent value
				when name == 'passphrase' then spec.passphrase = decodeURIComponent value
				
	return spec
	
# ---

exports.Target = class Target extends helpers.Target
	constructor: (@spec, @manifest) ->
		super()
		
		spec = parse_spec @spec
		options =
			tryKeyboard: true
			
		for param in ['host', 'port', 'username', 'password', 'privateKey', 'passphrase']
			options[param] = spec[param] if spec[param]?
			
		@step (callback) =>
			if options.privateKey?
				privateKey = path.resolve (path.dirname @manifest.meta.location), options.privateKey
				
				fs.readFile privateKey, (err, data) ->
					return callback new Error "cannot read private key #{options.privateKey}" if err
					
					options.privateKey = data
					
					return callback null if callback
			else
				return callback null if callback
				
		@step (callback) =>
			@ssh2 = new ssh2
			
			@ssh2.on 'connect', () =>
				@recover (callback) => @ssh2.end()
				
			@ssh2.on 'ready', () ->
				return callback null if callback
				
			@ssh2.on 'error', (error) ->
				switch
					when error.code == 'ECONNREFUSED' then callback new Error 'connection refused' if callback
					when error.code == 'ETIMEDOUT' then callback new Error 'connection timed out' if callback
					when error.level == 'authentication' then callback new Error error.message.toLowerCase().replace('.', ' -') if callback
					else callback err if callback
					
			@ssh2.connect options
			
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
		@ssh2.exec command, (err, stream) ->
			return callback err if err
			
			shell_stream = new helpers.Stream
			
			stream.on 'data', (data, extended) ->
				switch
					when extended == 'stdout' then shell_stream.emit_data_for_stdout data
					when extended == 'stderr' then shell_stream.emit_data_for_stderr data
					else shell_stream.emit_data_for_stdout data
					
			stream.on 'error', (error) -> shell_stream.emit_error error
			stream.on 'exit', (code) -> shell_stream.emit_exit code
			
			return callback null, shell_stream if callback
			
	do_spawn: (command, args, callback) ->
		args = (args or []).map (arg) -> helpers.quote arg
		command += ' ' + args.join ' '
		
		@ssh2.exec command, (err, stream) ->
			return callback err if err
			
			shell_stream = new helpers.Stream
			
			stream.on 'data', (data, extended) ->
				switch
					when extended == 'stdout' then shell_stream.emit_data_for_stdout data
					when extended == 'stderr' then shell_stream.emit_data_for_stderr data
					else shell_stream.emit_data_for_stdout data
					
			stream.on 'error', (error) -> shell_stream.emit_error error
			stream.on 'exit', (code) -> shell_stream.emit_exit code
			
			return callback null, shell_stream if callback
			
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
		
