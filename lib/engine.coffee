files = require './files'
tasks = require './tasks'
packages = require './packages'
services = require './services'
commands = require './commands'
bootstrap = require './bootstrap'

# ---

exports.launch = (opt, manifest, plugins, target, callback) ->
	[plugin.roost opt, manifest, target for plugin in plugins] if plugins
	
	bootstrap.roost opt, manifest, target
	files.roost opt, manifest, target
	packages.roost opt, manifest, target
	services.roost opt, manifest, target
	commands.roost opt, manifest, target
	tasks.roost opt, manifest, target
	
	target.ignite opt.options.dry, (err) ->
		return callback err if err
		return callback null
		
