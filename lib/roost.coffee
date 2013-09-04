exports.main = (argv=process.argv.slice(2)) ->
	logsmith = require 'logsmith'
	node_getopt = require 'node-getopt'
	
	engine = require './engine'
	plugins = require './plugins'
	targets = require './targets'
	manifest = require './manifest'
	
	opt = node_getopt.create [
		['f', 'file=ARG', 'Specify the root of a roost project or a roost manifest.']
		['d', 'dry', 'Dry run the roost manifest.']
		['v', 'verbose+', 'Make it verbose.']
		['c', 'colorize', 'Make it pretty.']
		['h', 'help', 'Display this help.']
	]
	
	opt = opt.bindHelp()
	opt = opt.parse(argv)
	
	logsmith.setGlobalLevel(3 - (if opt.options.verbose.length < 3 then opt.options.verbose.length else 3)) if opt.options.verbose?
	logsmith.setGlobalColorization(opt.options.colorize) if opt.options.colorize?
	
	exit_code = 0
	
	failure = (err) ->
		logsmith.exception err
		logsmith.error err.message
		
		process.exit ++exit_code
		
	try roost_location = manifest.locate opt.options.file
	catch e then failure e
	
	try roost_manifest = manifest.load roost_location
	catch e then failure e
	
	try roost_plugins = plugins.obtain roost_manifest
	catch e then failure e
	
	try roost_targets = (if opt.argv.length then opt.argv else ['local:']).map (spec) -> targets.instance spec, roost_manifest
	catch e then failure e
	
	for roost_target in roost_targets
		engine.launch opt, roost_manifest, roost_plugins, roost_target, (err) ->
			return failure err if err
			
if require.main == module
	do exports.main
	
