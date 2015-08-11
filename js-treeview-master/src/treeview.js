(function(define) {
    'use strict';

    function TreeView(urls, node, inputEl) {
        var promises = [];
        var self = this;

        this.node = node;

        urls.forEach(function(url) {
            promises.push(httpGet(url));
        });

        Promise.all(promises).then(function(jsons) {
            self.rawData = JSON.parse(jsons[0]);
            self.activeNode = JSON.parse(jsons[1]);
            self.data = createGenericTree(self.rawData, self.activeNode);

            render(self);
            inputEl && initSearch(inputEl);
        });
    }

    function forEach(arr, callback) {
        var i, len = arr.length;
        for (i = 0; i < len; i += 1) {
            callback(arr[i], i);
        }
    }

    function initSearch(inputEl) {
        document.querySelector(inputEl).onkeyup = function() {
            var value = this.value;
            if (value.length > 2) {
                forEach(document.querySelectorAll('#tree a'), function(node) {
                    if (node.textContent.toLowerCase().slice(0, -1) === value) {
                        node.classList.add('highlighted');
                    } else {
                        node.classList.remove('highlighted');
                    }
                });
            }
        };
    }

    function isOpened(item) {
        var state;
        if (item.state && item.state.opened) {
            return true;
        } else {
            forEach(item.children, function(child) {
                if (isOpened(child)) {
                    state = true;
                }
            });
        }
        return state;
    }

    function httpGet(url) {
        return new Promise(function(resolve, reject) {

            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);

            xhr.onload = function() {
                if (this.status == 200) {
                    resolve(this.response);
                } else {
                    var error = new Error(this.statusText);
                    error.code = this.status;
                    reject(error);
                }
            };

            xhr.onerror = function() {
                reject(new Error("Network Error"));
            };

            xhr.send();
        });
    }

    function createGenericTree(rawData, activeNode) {
        var tree = {};
        rawData.forEach(function(el) { //create hash with ids
            tree[el._id] = {
                name: el.name,
                _id: el._id,
                parentId: el.parentId,
                //add extra props
                state: {
                    opened: activeNode.activeNodeId === el._id,
                },
                children: []
            };
        });

        Object.keys(tree).forEach(function(key, i) { //dirty tree
            const elem = tree[key],
                parentId = elem.parentId;
            if (parentId) {
                tree[parentId].children.push(elem);
                elem.state.ordered = true;
            }
        });

        var genericTree = [];
        Object.keys(tree).forEach(function(key, i) {
            if (tree[key].state.ordered) {
                delete tree[key]; //remove dublicates
            } else {
                genericTree.push(tree[key]);
            }
        });
        return genericTree;
    }

    function render(self) {
        var container = document.getElementById(self.node);
        var leaves = [];

        function renderLeaf(item) {
            var leaf = document.createElement('li'),
                content = document.createElement('a'),
                expando = document.createElement('div');

            leaf.classList.add('tree-leaf');

            if (isOpened(item)) {
                leaf.classList.add('expanded');
                if (item._id === self.activeNode.activeNodeId) {
                    leaf.classList.add('active');
                };
            }

            content.classList.add('tree-leaf-content');
            //content.dataset.item = JSON.stringify(item); //TODO: store?
            content.textContent = item.name;

            expando.classList.add('tree-expando', 'expanded');
            expando.textContent = '-';

            content.appendChild(expando);
            leaf.appendChild(content);
            //leaf.appendChild(expando); //TODO: move expando from leaf

            if (item.children.length > 0) {
                var children = document.createElement('UL');
                children.setAttribute('class', 'tree-child-leaves');
                if (!isOpened(item)) {
                    expando.textContent = '+';
                    children.classList.add('hidden');
                }
                forEach(item.children, function(child) {
                    var childLeaf = renderLeaf(child);
                    children.appendChild(childLeaf);
                });
                leaf.appendChild(children);
            } else {
                expando.classList.add('hidden');
            }
            return leaf;
        };

        forEach(self.data, function(item) {
            leaves.push(renderLeaf(item));
        });

        var rootUl = document.createElement('UL');
        rootUl.classList.add('tree');
        rootUl.innerHTML = leaves.map(function(leaf) {
            return leaf.outerHTML; //copy the whole leaf TODO: safe html?
        }).join('');

        container.appendChild(rootUl);

        forEach(container.querySelectorAll('.tree-expando'), function(node) {
            node.onclick = function(e) {
                toggleStateHandler(e, self);
            };
        });
    }

    function toggleStateHandler(e, self) {
        const parent = e.target.parentNode;
        const data = JSON.parse(parent.getAttribute('data-item'));
        const leaves = parent.parentNode.querySelector('.tree-child-leaves');
        if (leaves) {
            if (leaves.classList.contains('hidden')) {
                self.expand(parent, leaves);
            } else {
                self.collapse(parent, leaves);
            }
        }
    }

    TreeView.prototype.expand = function(node, leaves) {
        var expando = node.querySelector('.tree-expando');
        expando.textContent = '-';
        leaves.classList.remove('hidden');
    };

    TreeView.prototype.collapse = function(node, leaves) {
        var expando = node.querySelector('.tree-expando');
        expando.textContent = '+';
        leaves.classList.add('hidden');
    };

    define.TreeView = TreeView;

}(window));