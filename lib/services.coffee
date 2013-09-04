exports.roost = (opt, manifest, target) ->
	return if not manifest.roost?
	
	if Array.isArray manifest.services
		services = {}
		
		for name in manifest.services
			services[name] = true
			
		manifest.services = services
		
	true_values = [1, true, 'true', 'run', 'running', 'start', 'started']
	false_values = [0, false, 'false', 'stop', 'stopped']
	
	for name, value in manifest.services
		switch
			when value in true_values then action = 'restart'
			when value in false_values then action = 'stop'
			
		target.spawn 'sudo', ['service', action, name]
		
