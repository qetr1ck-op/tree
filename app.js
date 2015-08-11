'use strict';

/*
filter by parentId
...
 */
let treeContainer = document.querySelector('#tree-container');

const rawTree = fetch('http://eleks-treeview.rhcloud.com');
const activeNode = fetch('http://eleks-treeview.rhcloud.com/activeNodeId');

Promise.all([rawTree, activeNode]).then(function(res) {
    Promise.all([res[0].json(), res[1].json()]).then(function(res) {
        const jsonTree = res[0];
        const activeNodeId = res[1].activeNodeId;

        let tree = {};

        jsonTree.forEach(function(el) { //create hash with id
            tree[el._id] = {
                name: el.name,
                _id: el._id,
                parentId: el.parentId,
                //add extra props
                state: {
                    opened: activeNodeId === el._id,
                    folder: false
                },
                childens: []
            };
        });

        Object.keys(tree).forEach(function(key, i) {
            const parentId = tree[key].parentId,
                elem = tree[key],
                isOpened = elem.state.opened;
            if (parentId) {
                tree[parentId].childens.push(elem);
                elem.state.ordered = true;
            } else {
                elem.state.opened = true; //for root elems
            }
            /*if (isOpened && parentId) {
               tree[parentId].state.opened = true;
            }*/
        });

        let filteredTreeArr = [];
        Object.keys(tree).forEach(function(key, i) {
            if (tree[key].childens.length) {
                tree[key].state.folder = true;
            }
            if (tree[key].state.ordered) {
                delete tree[key]; //dublicates
            } else {
                filteredTreeArr.push(tree[key]);
            }
        });

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

                if (!el.state.opened) {
                    li.hidden = true;
                }

                if (el.childens.length) {
                    buildTree(el.childens, li);
                }
            });
            if (!parent) {
                treeContainer.appendChild(ul);
            }
        }

        initState(filteredTreeArr);
        buildTree(filteredTreeArr);

        function initState(treeArr, parent) {
            treeArr.forEach(function(el) {
                if (el._id === activeNodeId) {
                    el.state.opened = true;
                    el.childens && el.childens.forEach(function(el) {
                        el.state.opened = true;
                    });
                    if (parent) {
                        parent.state.opened = true;
                        /*parent.childens.forEach(function(el) {
                            el.state.opened = true;
                        });*/
                    }
                } else {
                    el.childens && initState(el.childens, el);
                }
            });
        }

    });

});