# lingo-search-mongodb

```js
const mongoose = require('mongoose');

mongoose.connect('mongodb end-point', { useNewUrlParser: true });

const LSM = require('./instance')({
    db: mongoose,
});

async function search(keyword, searchOptions){

    // delete doc by unique_key
    await LSM.remove('unique-value').catch(e=>e);

    //insert doc
    await LSM.insert([
        { text:'돌팔이', score: 100 },
    ], {
        unique_key: 'unique-value',
        payload: {
            g:1
        }
    });

    // update doc
    await LSM.update('unique-value', [
        { text:'선녀와 나무꾼', score: 100 },
        { text:'선녀와 나무꾼이 애지중지키운 까치가 죽었대요.. 훌쩍..', score: 10 },
    ], {
        payload: {
            video: mongoose.Types.ObjectId('5c88d9e65f2bc5001b7a5519'),
        }
    });

    // search by keyword and options
    let searchResult = await LSM.search(keyword, searchOptions);


    return searchResult;
}
```

## 기본검색
```js
let searchResult = search('선녀');
searchResult.then(rs=>{
    console.log(rs);
});
````

## 조인(join) 사용(lookup)
```js
let searchResult = search('선녀', {
    aggregateAfterProject: (aggregate) => {
        aggregate.push({
            $lookup: {
                from: 'videos',
                localField: 'payload.video',
                foreignField: '_id',
                as: 'video',
            }
        });
        aggregate.push({
            $unwind: '$video',
        });
        aggregate.push({
            $project: {
                'unique_key': 1,
                'payload': 1,
                'score': 1,
                'video._id':1,
                'video.title':1,
            }
        });
    },
});

searchResult.then(rs=>{
    console.log(rs);
});
```

---
#### search Options
* limit
* match
* skip
* sort
* aggregateAfterMatch
* aggregateAfterUnwind
* aggregateAfterFilter
* aggregateAfterGroup
* aggregateAfterSort
* aggregateAfterSkip
* aggregateAfterProject
* aggregateAfterLimit
* aggregateBeforeMatch
* aggregateBeforeUnwind
* aggregateBeforeFilter
* aggregateBeforeGroup
* aggregateBeforeSort
* aggregateBeforeSkip
* aggregateBeforeProject
* aggregateBeforeLimit