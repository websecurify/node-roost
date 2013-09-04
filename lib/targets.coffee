exports.Ssh = require('./target_ssh').Target
exports.Local = require('./target_local').Target

# --

split_spec = (spec) ->
	tokens = spec.split(':')
	scheme = tokens[0]
	definition = tokens[1]
	
	return {
		original: spec
		scheme: scheme
		definition: definition
	}
	
# ---

exports.create = (spec, manifest) ->
	spec = split_spec spec if typeof(spec) == 'string' || spec instanceof String
	scheme = spec.scheme.toLowerCase();
	name = scheme[0].toUpperCase() + scheme.substring(1, scheme.length);
	
	return new exports[name] spec.original, manifest if exports[name]?
	
	throw new Error "unrecognized target spec #{scheme}"
	
