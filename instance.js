const LSM = require('./');

let getInstance = () => LSM();
if (true) {
    let instance = null;
    getInstance = function (options={}) {
        if (!instance) {
            instance = LSM(options);
        }
        return instance;
    };
}
module.exports = function (options={}) {
    return getInstance({
        ...options,
    });
};