	
	 ______    _______  _______  _______  _______ 
	|    _ |  |       ||       ||       ||       |
	|   | ||  |   _   ||   _   ||  _____||_     _|
	|   |_||_ |  | |  ||  | |  || |_____   |   |  
	|    __  ||  |_|  ||  |_|  ||_____  |  |   |  
	|   |  | ||       ||       | _____| |  |   |  
	|___|  |_||_______||_______||_______|  |___|  
	
	by Websecurify
	

# Introduction

Roost is a provisioning system similar to [puppet](https://puppetlabs.com/) and [chef](http://www.opscode.com/chef/) but heavily inspired by the clean and unobtrusive design of the nodejs module eco-system. It is also a bit like [grunt](http://gruntjs.com/) but without the added complexity.

Originally Roost was written in JavaScript but for better readability and reduced complexity, it is now written in CoffeeScript.

# The Basics

Roost is configured through a simple manifest file, typically called roost.json, however other names can be used too. The file is used to describes how a system is provisioned, i.e what commands, packages, services and other characteristics a system needs to adhere to.

When running roost without any command-line parameters it will try to look for the manifest file inside the current working directory. With the `-f|--file` option you can specify any arbitrary file or directory to be used by roost. For example:

	roost -f /path/to/folder 	# /path/to/folder/roost.json will be loaded
	roost -f /path/to/file 		# /path/to/file will be loaded

Roost has the concept of targets. The default target is `local:`. You can use `ssh:` too. The target specifies what system will be provisioned. Here is an example:

	roost 															# provisions the local system
	roost 'ssh://username@host;privateKey=/path/to/private/key' 	# will provision a remote host over ssh

In case you are not sure what you are doing, you can also try dry-running by using the `-d|--dry option`. For example:

	roost -d 	# will output information on what will happen if run the command for real

Verbose messaging can be achieved via the `-v|--verbose` flags. Use the `-c|--colorize` flag to make the colorful. For example:

	roost -vvv 		# achieves debug level logging
	roost -vvv -c 	# achieves debug level logging but with colorization

# Basic roost.json File Structure

The following snippet describes the basic structure of the roost manifest file.

	{
		"plugins": [
			"plugin-name"
		],
		
		"bootstrap": [
			"command"
		],
		
		"files": [
			"remote": {
				"source": "local",
				"content": "content"
			}
		],
		
		"packages": {
			"package": "version|installed|purged"
		},
		
		"services": {
			"service": "running|stopped"
		},
		
		"commands": [
			"command"
		],
		
		"tasks": [
			"task": {
				"commands": [
					"command"
				]
			},
			
			"default": {
				"require": ["task"]
			}
		]
	}

Apt can be configured with the following directive:

	{
		"apt": {
			"update": true 	// true or false for auto updating the system before installing extra packages
		}
	}

# Order Of Execution

Roost does not expose means by which you can configure the order of execution of things. The order is already chosen for you in advance, which is:

* plugins
* bootstrap
* files
* packages
* services
* commands
* tasks

This order is not finalised but this is what it is at the moment. The order of execution is pre-selected to avoid confusion and to provide some level of consistency. You can choose your own arbitary order by using tasks.

Tasks are esentially mini roost config files and they can nest inside the same roost directives as the ones described previously. Tasks can also provide dependencies. For example:

	{
		"tasks": {
			"Another Task": {
				"commands": [
					"another command"
				]
			},
		
			"Some Task": {
				"require": ["Another Task"]
			
				"commands": [
					"some command"
				]
			}
		}
	}

This level of nesting can go as much as you like. For example:

	{
		"tasks": {
			"Another Task": {
				"commands": [
					"another command"
				],
				
				{
					"tasks": {
						"Another Task": {
							"commands": [
								"another command"
							]
						},
						
						"Some Task": {
							"require": ["Another Task"]
		
							"commands": [
								"some command"
							]
						}
					}
				}
			},
			
			"Some Task": {
				"require": ["Another Task"]
				
				"commands": [
					"some command"
				]
			}
		}
	}

There are virtually no limits.

# The Plugin System

The plugin system of roost is essentially the nodejs module system. You can load plugins by declaring them inside the roost manifest file as illustrated previously. The plugin must be either installed globally via npm or locally inside the node_modules folder structure.

Each plugin must export a function called `getRoost` or `roost`. Function `getRoost` is used to get an object that must export the function `roost`. The function expects two parameters: the manifest file and the target. Once the function is invoked the plugin will be able to traverse the manifest file for declarations it recognizes and execute actions via the target. A plugin may even augment the manifest structure if desired, i.e. a plugin my install more packages by simply extending the "packages" directive.

Two functions exist in the target that are useful to plugin developers: `exec` and `spawn`. Use `exec` to launch any shell command. Use `spawn` to launch an executable with a fine-grain control over the process.

_For examples and inspiration check out the project source code._

# Embedding Into Other Projects

Roost can be easily embedded into other projects. Check out `bin/roost` and `lib/roost.coffee` for inspiration. Just copy and paste the parts that you need. The whole project has been designed to be easily embedable so that it can live as part of larger and more complex systems.

You can also have a look at [Vortex](https://github.com/websecurify/node-vortex/), which embeds roost as the default provisioner.

# Project Status and Future Plans

The project is new and immature in some ways. We hope to change this in the upcoming months. At the moment only ubuntu/debian is supported for the `packages` and the `services` directives. Please fork it as much as you want and send us patches. We are keen to make something out of this.

Roost, although open source, is commercially backed by Websecurify. We are just starting to use it internally to manage our infrastructure. It is also the default provisioner for [Vortex](https://github.com/websecurify/node-vortex/), which is pretty decent virtual machine management toolki. We are committed to support it in the foreseeable future so you can be assured that it is actually used to satisfy real needs.

# How To Contribute

Fork the project. Improve it. Send us the patches. Write some plugins and spread the news. We are happy to help with any technical queries you may have.

We want to support the community to create all kinds of ready-made systems. Share your roost files for the world to see. Get in touch if you want them to be included as part of the default distribution.

# Roost Plugins You Can Use

* [node-roost-nginx](https://github.com/websecurify/node-roost-nginx/) - install and configure nginx
* [node-roost-nodejs](https://github.com/websecurify/node-roost-nodejs/) - install and configure nodejs
* [node-roost-mongodb](https://github.com/websecurify/node-roost-mongodb/) - install and configure mongodb

The easiest way to install these plugins is to create a `package.json` file and declare the modules just as you usually do. Execute `npm install` inside the same folder than use roost to load the plugins that you need. It is as simple as that.
