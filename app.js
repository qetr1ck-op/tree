'use strict';

/*
filter by parentId
...
 */
let treeContainer = document.querySelector('#tree-container');
const rawTree = fetch('./source.json');
rawTree.then(function(res) {
    res.json().then(function(json) {
        let tree = {};

        json.forEach(function(el) { //create hash with id? {_id...:{}, ...}
            tree[el._id] = {
                name: el.name,
                _id: el._id,
                parentId: el.parentId,
                //add extra props
                state: {
                    opened: false //TODO
                },
                childens: []
            }
        });


        Object.keys(tree).forEach(function(key, i) {
            const parentId = tree[key].parentId,
                elem = tree[key];
            if (parentId) {
                tree[parentId].childens.push(elem);
                elem.state.ordered = true;
            }
        })

        let filteredTreeArr = [];
        Object.keys(tree).forEach(function(key, i) {
            if (tree[key].state.ordered) {
                delete tree[key];
            } else {
                filteredTreeArr.push(tree[key])
            }
        })

        function buildTree(treeArr, parent) {
            let ul = document.createElement('UL');

            if (parent) {
                parent.appendChild(ul)
            }

            treeArr.forEach(function(el) {
                let li = document.createElement('LI');
                li.textContent = el.name;
                li.dataset.id = el._id;

                ul.appendChild(li);

                if (el.childens.length) {
                    buildTree(el.childens, li)
                }
            });
            if (!parent) {
                treeContainer.appendChild(ul)
            }
        }

        buildTree(filteredTreeArr);
    });
});