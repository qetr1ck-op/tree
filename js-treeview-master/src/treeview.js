(function(define) {
    'use strict';
    /** List of events supported by the tree view */
    var events = ['expand', 'collapse', 'select'];

    /**
     * @constructor
     * @property {object} handlers The attached event handlers
     * @property {object} data The JSON object that represents the tree structure
     * @property {DOMElement} node The DOM element to render the tree in
     */
    function TreeView(urls, node, inputEl) {
        this.handlers = {};
        this.node = node;


        let promises = [];
        urls.forEach(function(url) {
            promises.push(httpGet(url));
        });
        let self = this;
        Promise.all(promises).then(function(jsons) {
            self.rawData = JSON.parse(jsons[0]);
            self.activeNode = JSON.parse(jsons[1]);
            self.data = createGenericTree(self.rawData, self.activeNode);
            render(self);
            initSearch(inputEl);
        });
    }

    /**
     * A forEach that will work with a NodeList and generic Arrays
     * @param {array|NodeList} arr The array to iterate over
     * @param {function} callback Function that executes for each element. First parameter is element, second is index
     */
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
                [].slice.call(document.querySelectorAll('#tree a')).forEach(function(node) {
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
        let tree = {};
        rawData.forEach(function(el) { //create hash with id
            tree[el._id] = {
                name: el.name,
                _id: el._id,
                parentId: el.parentId,
                //add extra props
                state: {
                    opened: activeNode.activeNodeId === el._id,
                    folder: false
                },
                children: []
            };
        });

        Object.keys(tree).forEach(function(key, i) {
            const elem = tree[key],
                parentId = elem.parentId;
            if (parentId) {
                tree[parentId].children.push(elem);
                elem.state.ordered = true;
            }
        });

        let genericTree = [];
        Object.keys(tree).forEach(function(key, i) {
            if (tree[key].children.length) {
                tree[key].state.folder = true;
            }
            if (tree[key].state.ordered) {
                delete tree[key]; //dublicates
            } else {
                genericTree.push(tree[key]);
            }
        });

        return genericTree;
    }

    /**
     * Renders the tree view in the DOM
     */
    function render(self) {
        var container = document.getElementById(self.node);
        var leaves = [],
            click;
        var renderLeaf = function(item) {
            var leaf = document.createElement('li');
            var content = document.createElement('a');
            //var text = document.createElement('div');
            var expando = document.createElement('div');

            leaf.setAttribute('class', 'tree-leaf');
            if (isOpened(item)) {
                leaf.classList.add('expanded');
                if (item._id === self.activeNode.activeNodeId) {
                    leaf.classList.add('active');
                };
            }
            content.setAttribute('class', 'tree-leaf-content');
            content.setAttribute('data-item', JSON.stringify(item));
            content.textContent = item.name;
            expando.setAttribute('class', 'tree-expando expanded');
            expando.textContent = '-';
            content.appendChild(expando);
            leaf.appendChild(content);

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
            return leaf.outerHTML;
        }).join('');

        container.appendChild(rootUl);

        click = function(e) {
            var parent = (e.target || e.currentTarget).parentNode;
            var data = JSON.parse(parent.getAttribute('data-item'));
            var leaves = parent.parentNode.querySelector('.tree-child-leaves');
            if (leaves) {
                if (leaves.classList.contains('hidden')) {
                    self.expand(parent, leaves);
                } else {
                    self.collapse(parent, leaves);
                }
            } else {
                emit(self, 'select', {
                    target: e,
                    data: data
                });
            }
        };

        forEach(container.querySelectorAll('.tree-leaf-text'), function(node) {
            node.onclick = click;
        });
        forEach(container.querySelectorAll('.tree-expando'), function(node) {
            node.onclick = click;
        });


    }

    /**
     * Emit an event from the tree view
     * @param {string} name The name of the event to emit
     */
    function emit(instance, name) {
        var args = [].slice.call(arguments, 2);
        if (events.indexOf(name) > -1) {
            if (instance.handlers[name] && instance.handlers[name] instanceof Array) {
                forEach(instance.handlers[name], function(handle) {
                    window.setTimeout(function() {
                        handle.callback.apply(handle.context, args);
                    }, 0);
                });
            }
        } else {
            throw new Error(name + ' event cannot be found on TreeView.');
        }
    }

    /**
     * Expands a leaflet by the expando or the leaf text
     * @param {DOMElement} node The parent node that contains the leaves
     * @param {DOMElement} leaves The leaves wrapper element
     */
    TreeView.prototype.expand = function(node, leaves) {
        var expando = node.querySelector('.tree-expando');
        expando.textContent = '-';
        leaves.classList.remove('hidden');
        emit(this, 'expand', {
            target: node,
            leaves: leaves
        });
    };

    /**
     * Collapses a leaflet by the expando or the leaf text
     * @param {DOMElement} node The parent node that contains the leaves
     * @param {DOMElement} leaves The leaves wrapper element
     */
    TreeView.prototype.collapse = function(node, leaves) {
        var expando = node.querySelector('.tree-expando');
        expando.textContent = '+';
        leaves.classList.add('hidden');
        emit(this, 'collapse', {
            target: node,
            leaves: leaves
        });
    };

    /**
     * Attach an event handler to the tree view
     * @param {string} name Name of the event to attach
     * @param {function} callback The callback to execute on the event
     * @param {object} scope The context to call the callback with
     */
    TreeView.prototype.on = function(name, callback, scope) {
        if (events.indexOf(name) > -1) {
            if (!this.handlers[name]) {
                this.handlers[name] = [];
            }
            this.handlers[name].push({
                callback: callback,
                context: scope
            });
        } else {
            throw new Error(name + ' is not supported by TreeView.');
        }
    };

    /**
     * Deattach an event handler from the tree view
     * @param {string} name Name of the event to deattach
     * @param {function} callback The function to deattach
     */
    TreeView.prototype.off = function(name, callback) {
        var index, found = false;
        if (this.handlers[name] instanceof Array) {
            this.handlers[name].forEach(function(handle, i) {
                index = i;
                if (handle.callback === callback && !found) {
                    found = true;
                }
            });
            if (found) {
                this.handlers[name].splice(index, 1);
            }
        }
    };

    define.TreeView = TreeView;

}(window));