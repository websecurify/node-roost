exports.roost_apt = (opt, manifest, target) ->
	return if not manifest.apt?
	
	if manifest.apt.repositories?
		target.exec 'sudo apt-get update'
		target.exec 'sudo apt-get -y install python-software-properties'
		
		for repository in manifest.apt.repositories
			target.spawn 'sudo', ['add-apt-repository', repository]
			
	target.exec 'sudo apt-get update' if manifest.apt.update?
	
# ---

exports.roost_packages = (opt, manifest, target) ->
	return if not manifest.packages?
	
	if Array.isArray manifest.packages
		packages = {}
		
		for name in manifest.packages
			packages[name] = true
			
		manifest.packages = packages
		
	true_values = [1, true, 'true', 'install', 'installed']
	false_values = [0, false, 'false', 'remove', 'removed', 'purge', 'purged']
	
	for name, value of manifest.packages
		switch
			when value in true_values then action = 'install'
			when value in false_values then action = 'remove'
			
			when value.indexOf? and value.indexOf '.' > 0
				action = 'install'
				name = "#{name}=#{value}"
				
		target.spawn 'sudo', ['apt-get', '-y', action, name]
		
# ---

exports.roost = (opt, manifest, target) ->
	exports.roost_apt opt, manifest, target
	exports.roost_packages opt, manifest, target
	
