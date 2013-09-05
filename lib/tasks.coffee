async = require 'async'
tsort = require 'tsort'

# ---

engine = require './engine'

# ---

exports.roost = (opt, manifest, target) ->
	return if not manifest.tasks?
	
	graph = tsort()
	
	for task_name, task_def of manifest.tasks
		if task_def.require?
			for dependency_name, index in task_def.require
				graph.add dependency_name, task_name
				
				if index < task_def.require.length - 1
					graph.add dependency_name, task_def.require[index + 1]
					
	try
		order = graph.sort()
	catch
		throw new Error 'cyclic condition detected in tasks'
		
	for task_name in order.reverse()
		task_def = manifest.tasks[task_name]
		task_def.meta = location: manifest.meta.location
		
		target.next do (task_name, task_def) ->
			(callback) ->
				engine.launch opt, task_def, [], target, callback
				
	for task_name, task_def of manifest.tasks
		if task_name not in order
			task_def.meta = location: manifest.meta.location
			
			target.next do (task_name, task_def) ->
				(callback) ->
					engine.launch opt, task_def, [], target, callback
					
