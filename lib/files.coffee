logsmith = require 'logsmith'
fs_extra = require 'fs-extra'
path_extra = require 'path-extra'

# ---

exports.roost = (opt, manifest, target) ->
	return if not manifest.files?
	
	for file_name, file_def of manifest.files
		switch
			when file_def.source?
				target.copy file_def.source, file_name
			when file_def.content?
				temp_source = path_extra.join path_extra.tempdir(), new Date().getTime().toString()
				
				target.next (callback) ->
					fs_extra.outputFile temp_source, file_def.content, (err) ->
						logsmith.exception err if err
						
						return callback new Error "cannot create temp file #{temp_source}" if err
						return callback null if callback
						
				target.recover (callback) ->
					fs_extra.remove temp_source, (err) ->
						logsmith.exception err if err
						
						return callback new Error "cannot delete temp file #{temp_source}" if err
						return callback null if callback
						
				target.copy temp_source, file_name
				
