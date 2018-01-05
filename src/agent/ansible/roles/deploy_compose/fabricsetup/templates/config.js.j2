var util = require('util');
var path = require('path');
var hfc = require('fabric-client');

var file = 'network-config%s.yml';

var env = process.env.TARGET_NETWORK;
if (env)
	file = util.format(file, '-' + env);
else
	file = util.format(file, '');

// indicate to the application where the setup file is located so it able
// to have the hfc load it to initalize the fabric client instance
hfc.setConfigSetting('network-connection-profile-path', path.join('/app', 'configs', file));
{% for org in peerorgs %}
hfc.setConfigSetting('{{ org }}-connection-profile-path', path.join('/app', 'configs', '{{ org }}-config.yml'));
{% endfor %}

// some other settings the application might need to know
hfc.addConfigFile(path.join('/app', 'configs', 'config.json'));
