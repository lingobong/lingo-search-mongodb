const models = require('../models');
/**
 * 
 * options
 * LS.options
 * + modelName
 */
const _LS = require('lingo-search');

const aggregator = (aggregate, callback) => {
    let _aggregate = [];
    if (!!callback) {
        callback( _aggregate );
    }
    for (let item of _aggregate) {
        if ( !!item.$project ) {
            item.$project.score = 1;
        }
        aggregate.push(item);
    }
};
const defaultOption = {
    ..._LS.options,
    db: null,
    modelName: '_LingoSearch',
    detailScoreSearch: true,
};
function LingoSearchMongodb(options = defaultOption) {
    if (!options.db || options.db.constructor.name != 'Mongoose') {
        throw new Error('db type must be Mongoose');
    }

    if (options.modelName == null) options.modelName = defaultOption.modelName;
    if (options.detailScoreSearch == null) options.detailScoreSearch = defaultOption.detailScoreSearch;

    const LS = _LS(options);
    const LSMModels = models(LS.options.db, options.modelName);
    
    const LSM = function () { };

    LSM.prototype.models = LSMModels;

    LSM.prototype.insert = async function ( insertDatas = [], payload = {} ) {
        let result = null;

        if (payload.unique_key == null) {
            throw new Error('unique key can not empty');
        }
        payload.unique_key = payload.unique_key + '';

        result = await new Promise((resolve, reject) => {
            LS.insert(insertDatas, payload, async(insertDatas, payload) => {
                this.models._LingoSearch_Root
                    .insertMany({
                        unique_key: payload.unique_key,
                        payload: payload.payload,
                    })
                    .then((result)=>{
                        this.models._LingoSearch_Score
                            .insertMany(insertDatas.map(i => {
                                let key_split = i[0].split('/');
                                let type = key_split.length == 2 ? key_split[ 0 ] : null;
                                key = key_split.length == 2 ? key_split[1] : key_split[0];
                                
                                return {
                                    key,
                                    type,
                                    score: i[1],
                                    unique_key: payload.unique_key,
                                }
                            }));
                        resolve(result);
                    })
                    .catch(reject);
            });
        });
        return result;
    };
    LSM.prototype.remove = async function (unique_key, deleteOptions = {} ) {
        let result = null;
        unique_key = unique_key + '';
        result = await new Promise(resolve => {
            LS.remove(unique_key, deleteOptions, async(unique_keys, deleteOptions) => {
                let deleteQuery = {
                    unique_key: {
                        $in: unique_keys
                    }
                };
                
                let result = await this.models._LingoSearch_Root.deleteMany(deleteQuery);
                await this.models._LingoSearch_Score.deleteMany(deleteQuery);
                resolve(result);
            });
        });

        return result;
    };
    LSM.prototype.update = async function (unique_key, updateDatas, payload = null ) {
        let result = null;
        unique_key = unique_key + '';

        result = await new Promise((resolve, reject) => {
            LS.update(unique_key, updateDatas, payload, async(unique_key, updateDatas, payload) => {
                
                let Data = await this.models._LingoSearch_Root.findOne({ unique_key, });
                if ( !Data ) return reject( new Error('this unique_key is not exists') );
                if ( payload != null ) {
                    Data.payload = payload;
                }

                await Data.save();

                let result = await this.models._LingoSearch_Score
                        .deleteMany({ unique_key, });

                await this.models._LingoSearch_Score
                        .insertMany(updateDatas.map(i => {
                            let key_split = i[0].split('/');
                            let type = key_split.length == 2 ? key_split[ 0 ] : null;
                            key = key_split.length == 2 ? key_split[1] : key_split[0];
                            
                            return {
                                key,
                                type,
                                score: i[1],
                                unique_key,
                            }
                        }))

                resolve(result);
            });
        });

        return result;
    };

    LSM.prototype.search = async function ( query = '', searchOptions = {
        limit: 50,
        match: null,
        skip: 0,
        sort: null,
    } ) {
        let searchResult = await new Promise((resolve, reject) => {
            LS.search(query,searchOptions, async(query, searchOptions) => {
                let aggregate = [ ];
                let searchResult = null;

                // Aggregate - Match -> { _id, key, score, unique_key }
                aggregate.push({
                    $match: { 
                        $and: query.map(q => {
                            let match = {};
                            let key_split = q[0].split('/');
                            let type = key_split.length == 2 ? key_split[ 0 ] : null;
                            let key = key_split.length == 2 ? key_split[1] : key_split[0];
                            
                            match.key = key;
                            match.type = type;
                            return match;
                        })
                    }
                });

                // Aggregate - Group & score -> { _id, score } // `_id` is `unique_key`
                let branches = [];
                for (let queryItem of query) 
                    branches.push({ case: { $eq:['$key', queryItem[0]] }, then: { $multiply:[ '$score', queryItem[1] ] }, });
                aggregate.push({
                    $group: {
                        _id: '$unique_key',
                        score: options.detailScoreSearch ? { $sum: { $switch: { branches, default: 0, } } } : { $sum: '$score' }
                    }
                });
                
                // Aggregate -> { score, unique_key }
                aggregate.push({ $project: { _id:0, score:1, unique_key: '$_id', } });

                // Aggregate - Sort
                for (let field in searchOptions.sort) {
                    let orderTypes = { desc: -1, asc: 1, };
                    searchOptions.sort[field] = orderTypes[ searchOptions.sort[field] ] || searchOptions.sort[field];
                }
                aggregate.push({ $sort: searchOptions.sort, });

                // Aggregate - Skip
                if (!!searchOptions.skip)
                    aggregate.push({ $skip: searchOptions.skip, });

                // Aggregate - Limit
                aggregate.push({ $limit: searchOptions.limit, });

                //lookup
                aggregate.push({
                    $lookup:{
                        from: this.models._LingoSearch_Root.collection.collectionName,
                        localField:'unique_key',
                        foreignField:'unique_key',
                        as:'_root',
                    },
                });
                aggregate.push({ $unwind:'$_root', });
                aggregate.push({ $project:{ unique_key:1, score:1, payload:'$_root.payload', } });

                searchResult = 
                    await this.models._LingoSearch_Score
                    .aggregate(aggregate);

                return resolve(searchResult);
            });
        });
        return searchResult;
    };
    return new LSM();
}
module.exports = LingoSearchMongodb;