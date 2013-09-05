exports.roost = (opt, manifest, target) ->
	return if not manifest.bootstrap?
	
	for command in manifest.bootstrap
		target.exec command
		
