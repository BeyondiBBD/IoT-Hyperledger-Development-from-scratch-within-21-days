var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
var UnauthorizedError = require('../errors/unauthorized-error');
var InternalError = require('../errors/internal-error');

var helper = require('../../lib/helper');
const uuidV1 = require('uuid/v1');
var admins = require("./config.json");


module.exports = function (app, hfc) {

    app.post("/api/users/signin", async function (req, res) {

        console.log(req.body);

        try {
            var org = req.body.organisation;
            var username = req.body.username;
            var orgAdmin = hfc.getConfigSetting('admins')[org];

            if (!orgAdmin) {
                throw new InternalError('Organisation admin is not defined!', 'IE1001');
            }

            var client = await helper.getClientForOrg(org).catch(err => {
                throw new InternalError('Organisation is not defined in network configuration! Can\'t get a client for organisation!', 'IE1002', err.message);
            });

            //for identity service we need to use admin user object who has hf.Registrar attribtue
            let adminRegistrar = await client.getUserContext(orgAdmin.username, true)
                .then(user => {
                    if (!user) {
                        throw new InternalError('The selected organization has no registered/enrolled administrator!', 'IE1003');
                    }

                    return user;
                });
            //get certificate authority based on client configuration for organisation
            var caClient = client.getCertificateAuthority();
            //create new identity service for organisation
            var identityService = caClient.newIdentityService();

            //now we need to find user and send request to CA with registrar
            identityService.getOne(username, adminRegistrar)
                .then(res => {
                    //if everything is good now we need to check bcrypt hash
                    return res.result
                })
                .catch(err => {
                    return Promise.reject(new UnauthorizedError('Username does not exist in this organisation', 'UA1001'));
                })
                .then(user => {

                    var password = user.attrs.find(element => {
                        return element.name === "password";
                    });

                    var email = user.attrs.find(element => {
                        return element.name === "email";
                    });

                    var hash = bcrypt.compareSync(req.body.password, password.value);

                    if (!hash) {
                        return Promise.reject(new UnauthorizedError('Incorrect username/password combination', 'UA1002'));
                    }

                    var token = jwt.sign({
                        exp: Math.floor(Date.now() / 1000) + parseInt(hfc.getConfigSetting('jwt_expiretime')),
                        usr: username,
                        org: org,
                        aff: user.affiliation,
                        typ: user.type,
                        eml: email.value
                    }, app.get('secret'));

                    res.send({ token: token });
                })
                .catch(err => {

                    console.log(err);
                    // res.status(err.status);
                    res.send(err);
                });

        } catch (err) {
            console.log(err);
            // res.status(err.status);
            res.send(err);
        }
    });

     // create users
     app.post('/api/users', async function (req, res) {

        var args = [uuidV1(), Buffer.from(JSON.stringify(req.body))];

        try {

            await invoke.invokeChaincode("peer0.provider.iot-blockchain.com", "cipchannel", "users", "create", args, null, req.orgname, req.username);
                
            
             var id = [args[0]]; 


            var data = await query.queryChaincode("peer0.provider.iot-blockchain.com", "cipchannel", "users", "one", id, req.orgname, req.username);
            
            var message = JSON.parse(data);
            
            
            message = message;
            message.id = id[0]; 


            res.status(200).send(message);

        } catch (err) {
            console.log(err);
            if (err.status === "BAD_REQUEST") {
                res.status(400).send(err);
            }
        }

    });

    //  list users
    app.get('/api/users', async function (req, res) {


        try {

            var message = await query.queryChaincode("peer0.provider.iot-blockchain.com", "cipchannel", "users", "list", [''], req.orgname, req.username);

            var data = JSON.parse(message);

            res.send(data);
        } catch (err) {
            if (err.status = "BAD_REQUEST") {
                res.status(400).send(err);
            }
        }
    });

    // get user
    app.get('/api/users/:id', async function (req, res) {
        
        var args = [req.params.id];

        try {

            var message = await query.queryChaincode("peer0.provider.iot-blockchain.com", "cipchannel", "users", "one", args, req.orgname, req.username);

            var data = JSON.parse(message);

            res.send(data);
        } catch (err) {
            if (err.status = "BAD_REQUEST") {
                res.status(400).send(err);
            }
        }
    });

   /*  app.post('/api/users/signup', async function (req, res) {

        // create user(data) object for private collection
        // store on the peer over the transiet field
        data = {
            "username": req.body.data.username,
            "firstName": req.body.data.lastName,
            "lastName": req.body.data.lastName,
            "password": bcrypt.hashSync(req.body.data.password, 10),
            "email": req.body.data.email
        }


        let buff = new Buffer(JSON.stringify(data));

        delete req.body.data;

        var args = [uuidV1(), Buffer.from(JSON.stringify(req.body))];
        let transient = buff.toString('base64');

        try {
            // orgname, and username we extract from jwt
            // peers will be defined in the config.json

            // CREATE USER
            await invoke.invokeChaincode("peer0.regulator.iot-blockchain.com", "cipchannel", "users", "createUser", args, transient, req.orgname, req.username);

            var id = [args[0]];

            // GET USERS ID 
            var response = await query.queryChaincode("peer0.regulator.iot-blockchain.com", "cipchannel", "users", "one", id, req.orgname, req.username);

            response.id = id[0];

            // RETRIVE USER OBJECT BY ID
            var secret_data = await query.queryChaincode("peer0.regulator.iot-blockchain.com", "cipchannel", "users", "getUserDetail", id, req.orgname, req.username);

            response.data = secret_data;

            // get admin username fromconfig
            let list = Object.keys(admins.admins);

            // get data for registar users from ledger(response)
            let toRegisterUser = {
                "password": response.data.password,
                "username": response.data.username,
            }

            // check admins
            // admin can only register users 
            //  this is for testing because,  admins will add the users
            for (var i = 0; i < list.length; i++) {
                var admin = list[i];
                console.log(admin);
                if (req.username == admin) {
                    await register.registerUser(toRegisterUser, req.orgname, admin);
                }

            }

            res.send(response);

        } catch (err) {
            if (err.status === "BAD_REQUEST") {
                res.status(400).send(err);
            }
        }

    }); 
    // get one 
    app.get('/api/users/:id', async function (req, res) {

        var args = [req.params.id];

        try {
            // orgname, and username we extract from jwt
            // peers will be defined in the config.json

            var id = [args[0]];
            // GET USERS ID 
            var response = await query.queryChaincode("peer0.regulator.iot-blockchain.com", "cipchannel", "users", "one", id, req.orgname, req.username);

            response.id = id[0];

            // RETRIVE USER OBJECT BY ID
            var secret_data = await query.queryChaincode("peer0.regulator.iot-blockchain.com", "cipchannel", "users", "getUserDetail", id, req.orgname, req.username);

            response.data = secret_data;


            res.send(response);

        } catch (err) {
            if (err.status === "BAD_REQUEST") {
                res.status(400).send(err);
            }
        }

    });

    

    // update user

    app.put('/api/users/:id', async function (req, res) {

        var args = [req.params.id];

        // create user(data) object for private collection
        // store on the peer over the transiet field
        data = {
            "username": req.body.data.username,
            "firstName": req.body.data.lastName,
            "lastName": req.body.data.lastName,
            "password": bcrypt.hashSync(req.body.data.password, 10),
            "email": req.body.data.email
        }


        let buff = new Buffer(JSON.stringify(data));

        delete req.body.data;

        var args = [uuidV1(), Buffer.from(JSON.stringify(req.body))];
        let transient = buff.toString('base64');

        try {
            // orgname, and username we extract from jwt
            // peers will be defined in the config.json


            await invoke.invokeChaincode("peer0.provider.iot-blockchain.com", "cipchannel", "users", "createUser", args, transient, req.orgname, req.username);

            var id = [args[0]];
            // GET USERS ID 
            var response = await query.queryChaincode("peer0.provider.iot-blockchain.com", "cipchannel", "users", "one", id, req.orgname, req.username);

            response.id = id[0];

            // RETRIVE USER OBJECT BY ID
            var secret_data = await query.queryChaincode("peer0.provider.iot-blockchain.com", "cipchannel", "users", "getUserDetail", id, req.orgname, req.username);

            response.data = secret_data;


            res.send(response);

        } catch (err) {
            if (err.status === "BAD_REQUEST") {
                res.status(400).send(err);
            }
        }

    });
    // delete user

    app.delete('/api/users/:id', async function (req, res) {

        var args = [req.params.id];

        try {
            var id = [args[0]];

            var message = await invoke.invokeChaincode("peer0.regulator.iot-blockchain.com", "cipchannel", "users", "remove", id, null, req.orgname, req.username);


            res.status(200).send({ tx: message });

        } catch (err) {
            if (err.status === "BAD_REQUEST") {
                res.status(400).send(err);
            }
        }

    });
*/
    app.get('/api/users', async function (req, res) {

        const object = {
            username: req.username,
            organisation: req.orgname
        }

        let users = await getUsers.getUsersForRegistrar(object);

        res.send(users);
    });
}
