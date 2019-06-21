const mongoose = require('mongoose');
const _modelNames = {
    _LingoSearch: '_LingoSearch',
};
module.exports = function (_db, modelNames) {
    modelNames = !modelNames || modelNames.constructor.name != 'Object' ? 
    _modelNames
    :
    {
        ..._modelNames,
        ...modelNames,
    };

    let db = mongoose; // for vscode auto complete
    if (true) db = _db;

    return {
        _LingoSearch: db.model(modelNames._LingoSearch, require('./_LingoSearch'))
    };
};