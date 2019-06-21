const models = require('./models');
/**
 * 
 * options
 * LS.options
 * + modelNames
 */
function LingoSearchMongodb(options = {}) {
    const LS = require('../lingo-search')(options);
    const LSMModels = models(LS.options.db, options.modelNames);
    
    const LSM = function () { };
    LSM.prototype.models = LSMModels;
    LSM.prototype.insert = function ( insertDatas = [], payload = {} ) {
        payload.unique_key = payload.unique_key + '';
        return new Promise((resolve, reject) => {
            LS.insert(insertDatas, payload, async(insertDatas, payload) => {
                this.models._LingoSearch
                    .insertMany({
                        unique_key: payload.unique_key,
                        payload: payload.payload,
                        scores: insertDatas.map( i => ({key: i[0], score: i[1]}) )
                    })
                    .then(resolve)
                    .catch(reject);
            });
        });
    };
    LSM.prototype.search = async function ( query = '', searchOptions = {
        limit: 50,
        preMatch: null,
        postMatch: null,
        skip: 0,
        sort: null,
    } ) {
        /**
         * searchOptions
            * limit
            * preMatch
            * postMatch
            * skip
            * sort
         */
        let searchResult = await new Promise((resolve, reject) => {
            LS.search(query,searchOptions, async(query, searchOptions) => {
                let aggregate = [ ];
                let searchResult = null;

                // search start
                let firstMatch = {
                    'scores.key': {
                        $in: query.map(q => q[0])
                    }
                };
                if ( !!searchOptions.preMatch && searchOptions.preMatch.constructor.name == 'Object' ) {
                    firstMatch = {
                        ...firstMatch,
                        ...searchOptions.preMatch,
                    };
                }
                aggregate.push({
                    $match: firstMatch
                });
                // unwind
                aggregate.push({
                    $unwind: '$scores'
                });
                // filter 
                aggregate.push(aggregate[0]);
                // sum score
                let branches = [];
                for (let queryItem of query) {
                    branches.push({
                        case: {
                            $eq:['$scores.key', queryItem[0]]
                        },
                        then: {
                            $multiply:[ '$scores.score', queryItem[1] ]
                        },
                    });
                }
                aggregate.push({
                    $group: {
                        _id: {
                            unique_key: '$unique_key',
                            payload: '$payload',
                        },
                        score: {
                            $sum: {
                                $switch: {
                                    branches,
                                    default: 0,
                                }
                            }
                        }
                    }
                });
                if (!!searchOptions.postMatch) {
                    aggregate.push({
                        $match: searchOptions.postMatch
                    });
                }
                if (!!searchOptions.sort) {// sort check
                    for (let field in searchOptions.sort) {
                        let orderTypes = { desc: -1, asc: 1, };
                        searchOptions.sort[field] = orderTypes[ searchOptions.sort[field] ] || searchOptions.sort[field];
                    }
                    aggregate.push({
                        $sort: searchOptions.sort,
                    });
                }
                if (!!searchOptions.skip) {
                    aggregate.push({
                        $skip: searchOptions.skip,
                    });
                }
                aggregate.push({
                    $project: {
                        _id: 0,
                        unique_key: '$_id.unique_key',
                        payload: '$_id.payload',
                        score: '$score',
                    }
                });
                aggregate.push({
                    $limit: searchOptions.limit,
                });

                searchResult = 
                    await this.models._LingoSearch
                    .aggregate(aggregate);

                return resolve(searchResult);
            });
        });
        return searchResult;
    };
    LSM.prototype.remove = async function (unique_key, deleteOptions = {} ) {
        unique_key = unique_key + '';
        return await new Promise(resolve => {
            LS.remove(unique_key, deleteOptions, async(unique_keys, deleteOptions) => {
                let deleteQuery = {
                    unique_key: {
                        $in: unique_keys
                    }
                };
                
                let deleteResult = await this.models._LingoSearch.deleteMany(deleteQuery);
                resolve( deleteResult );
            });
        });
    };
    LSM.prototype.update = async function (unique_key, updateDatas, payload = {} ) {
        unique_key = unique_key + '';
        payload.unique_key = unique_key;

        return await new Promise((resolve, reject) => {
            LS.insert(updateDatas, payload, async(updateDatas, payload) => {
                let Data = await this.models._LingoSearch.findOne({ unique_key, });
                if ( !Data ) return reject( new Error('this unique_key is not exists') );
                if ( !!payload && !!payload.payload ) {
                    Data.payload = payload.payload;
                }
                Data.scores = updateDatas.map( i => ({key: i[0], score: i[1]}) );
                console.log(Data);
                resolve( await Data.save() );
            });
        });
    };
    return new LSM();
}
module.exports = LingoSearchMongodb;