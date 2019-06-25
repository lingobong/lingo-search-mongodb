const mongoose = require('mongoose');

let _modelName = '_LingoSearch';
module.exports = function (_db, modelName) {
    modelName = modelName || _modelName;

    let db = mongoose; // for vscode auto complete
    if (true) db = _db;
    return {
        _LingoSearch_Root: db.model(modelName+'_root', require('./_LingoSearch_Root')),
        _LingoSearch_Score: db.model(modelName+'_score', require('./_LingoSearch_Score')),
    };
};