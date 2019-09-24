//required packages
var util = require('util'),
	path = require('path'),
	hfc = require('fabric-client'),
	//network organiyations definition
	organizations = ["Regulator", "Buyer", "Seller", "Logistic"],
	//environment and network connection profile definition
	file = 'network-config%s.yaml',
	env = process.env.TARGET_NETWORK;

// if we want to use another network we can use this templat
// to act over environment variable and dynamicly select network name
if (env)
	file = util.format(file, '-' + env);
else
	file = util.format(file, '');

//network configuration connection profile setup
hfc.setConfigSetting('network-connection-profile', path.join(__dirname, 'config/connection-profile', file));

organizations.forEach((organization) => {
	// indicate to the application where the setup file is located so it able
	// to have the hfc load it to initalize the fabric client instance
	hfc.setConfigSetting(organization, path.join(__dirname, 'config/connection-profile/wallet', organization.toLowerCase() + '.yaml'));
});

// some other settings the application might need to know
hfc.addConfigFile(path.join(__dirname, 'config.json'));

