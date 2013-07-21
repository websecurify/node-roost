function escape(input) {
	return input
		.replace(/\t/g, '\\t')
		.replace(/\n/g, '\\n')
		.replace(/(["`$\\])/g, '\\$1');
}

function quote(input) {
	return '"' + escape(input) + '"';
}

// ---

exports.escape = escape;
exports.quote = quote;
