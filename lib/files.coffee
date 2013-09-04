exports.roost = (opt, manifest, target) ->
	return if not manifest.files?
	
	for file_name, file_def of manifest.files
		switch
			when file_def.source? then target.copy file_def.source, file_name
			when file_def.content then throw new Error 'not implemented'
			