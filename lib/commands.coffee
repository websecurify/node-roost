exports.roost = (opt, manifest, target) ->
	return if not manifest.commands?
	
	for command in manifest.commands
		target.exec command
		
