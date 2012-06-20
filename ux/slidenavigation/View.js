/**
 *  {@link Ext.ux.slidenavigation.View} is a subclass of {@link Ext.Container}
 *  that provides a sliding main view with an underlying navigation list.  The
 *  concept was inspired by Facebook's mobile app.
 *
 *  @author Weston Nielson <wnielson@github>
 */
Ext.define('Ext.ux.slidenavigation.View', {
    extend: 'Ext.Container',
    
    requires: [
        'Ext.Button',
        'Ext.Container',
        'Ext.Function',
        'Ext.ModelManager',
        'Ext.Toolbar',
        'Ext.data.Model',
        'Ext.data.Store',
        'Ext.dataview.List',
        'Ext.ux.slidenavigation.InternalContainer'
    ],
    
    xtype: 'slidenavigationview',
    
    config: {
        /**
         * @cfg {Object} list Configuration for the navigation list
         */
        list: {
            width: 250,
            maxDrag: null,
            itemTpl: '{title}',
            grouped: true,
            items: [{
                xtype: 'toolbar',
                docked: 'top',
                ui: 'light'
            }]
        },

        layout: {
            type: 'card',
            animation: {
                duration: 300,
                easing: 'ease-out',
                type: 'slide',
                direction: 'left'
            }
        },

        /**
         * @cfg {Boolean} useTitleForBackButtonText
         * Set to false if you always want to display the {@link #defaultBackButtonText} as the text
         * on the back button. True if you want to use the previous views title.
         * @private
         * @accessor
         */
        useTitleForBackButtonText: null,    

        /**
         * @cfg {String} defaultBackButtonText
         * The text to be displayed on the back button if:
         * a) The previous view does not have a title
         * b) The {@link #useTitleForBackButtonText} configuration is true.
         * @private
         * @accessor
         */
        defaultBackButtonText: 'Back',

        /**
         * @cfg {Object} container Configuration for the container
         */
        container: {},

        /**
         * @cfg {Array} items An array of items to initially put into the navigation list.
         * The items can either be Ext components or special objects with a "handler"
         * key, which should be a function to execute when selected.  Additionally, you
         * can define the order of the items by defining an 'order' parameter.
         */        
        startItems: [],
        
        /**
         * @cfg {Object} groups Mapping of group name to order.  For example,
         * say you have defined two groups; "Group 1" and "Group 2".  By default
         * these will be presented in the list in that order, since
         * 'Group 1' > 'Group 2'.  This option allows you to change the ordering,
         * like so:
         *
         *  groups: {
         *    'Group 1': 2
         *    'Group 2': 1
         *  }
         *
         *  You should use integers, starting with 1, as the ordering value.
         *  By default groups are ordered by their name.
         */
        groups: {},
        
        /**
         * @cfg {Object} defaults An object of default values to apply to any Ext
         * components created from those listed in ``items``.
         */
        defaults: {
            layout: 'card'
        },
        
        /**
         * @cfg {String} slideSelector Class selector of object (or parent)
         * of which dragging should be allowed.  Defaults to the entire container.
         * For example, this could be set to something like 'x-toolbar' to restrict
         * dragging only to a toolbar.
         */
        slideSelector: '',
        
        /**
         * @cfg {Integer} slideDuration Number of miliseconds to animate the sliding
         * of the container when "flicked".  By default the animation is disable on
         * Android.
         */
        slideDuration: Ext.os.is.Android ? 0 : 100,
        
        /**
         * @cfg {Integer} selectSlideDuration Number of miliseconds to animate the sliding
         * of the container when list item is selected (if closeOnSelect = true). The default
         * value here of 300 gives a much nicer feel.  By default the animation is disable on
         * Android.
         */
        selectSlideDuration: Ext.os.is.Android ? 0 : 300,
        
        /**
         * @cfg {Boolean} closeOnSelect Whether or not to automatically close the container
         * when an item in the list is selected.  Default is true.
         */
        closeOnSelect: true
    },
        
    initConfig: function() {
        var me = this,
            existingStore;
        
        me._indexCount = 0;
        
        /**
         *  Create the store.
         */
        existingStore = Ext.getStore('sliderNavigationStore');
        if(existingStore) {
            me.store = existingStore;
            me.store.removeAll(); // dump store contents
        } else {
            me.store = Ext.create('Ext.data.Store', {
                model: me.getModel(),
                sorters: 'order',
                grouper: {
                    property: 'group',
                    sortProperty: 'groupOrder'
                },
                storeId: "sliderNavigationStore"
            });
        }
        
        /**
         *  Add the items into the list.
         */
        me.addItems(me.config.startItems || []);
        
        me.callParent(arguments);
        
        /**
         *  This stores the instances of the components created.
         *  TODO: Support 'autoDestroy'.
         *  @private
         */
        me._cache = {};
        
        /**
         *  Default config values used for creating a slideButton.
         */
        me.slideButtonDefaults = {
            xtype: 'button',
            iconMask: true,
            iconCls: 'more',
            name: 'slidebutton',
            listeners: {
                release: me.toggleContainer,
                scope: me
            },
            /**
             *  To add the button into a toolbar, you can add the following
             *  to any item in your navigation list.
             */
            //selector: ['toolbar']
        };
        
        //me.config = Ext.merge({}, me.config, config || {});
        //return me.callParent(arguments);
    },
            
    initialize: function() {
        this.callParent();
        
        this.addCls('x-slidenavigation');
        
        this.list = this.createNavigationList();
        this.container = this.createContainer();
        
        this.add([
            this.list,
            this.container
        ]);

        this.relayEvents(this.container, {
            add: 'push',
            remove: 'pop'
        });
        
        // TODO: Make this optional, perhaps by defining
        // "selected: true" in the items list
        this.list.select(0);
    },
    
    /**
     *  Adds an array of items (or a single item) into the list.
     */
    addItems: function(items) {
        var me = this,
            items = Ext.isArray(items) ? items : [items],
            groups = me.config.groups;
        
        Ext.each(items, function(item, index) {
            if (!Ext.isDefined(item.index)) {
                item.index = me._indexCount;
                me._indexCount++;
            }
            me.store.add(item);
        });

    },

    /**
     *  If an item with the given title exists in the list, remove it.
     */
    removeItemByTitle: function(itemTitle) {
        var me = this;

        Ext.each(this.store.data.items, function(item, index) {
            if(item.data.title == itemTitle) {
                me.store.remove(item);
                return false; // only remove first match
            }
        });
    },

    /**
     * Finds an item in the list by title and returns that item.
     * 
     */
    getItemByTitle: function(itemTitle) {
        var me = this;
        var foundItem = null;
        Ext.each(this.store.data.items, function(item, index) {
            if(item.data.title == itemTitle) {
                foundItem = item;
                return false; // only remove first match
            }
        });
        return foundItem;
    },
    
    /**
     *  Creates a button that can toggle the navigation menu.  For an example
     *  config, see ``slideButtonDefaults``.
     */
    createSlideButton: function(el, config) {
        var me = this;
        return this.container.setSliderButton(Ext.create("Ext.Button", 
            Ext.merge(me.slideButtonDefaults, config)));
        
        return false;
    },
    
    /**
     * Called when an item in the list is tapped.
     */
    onSelect: function(list, item, eOpts) {
        var me = this,
            store = list.getStore(),
            index = item.raw.index,
            container = me.container;
        
        if (me._cache[index] == undefined) {
            //container = this.down('container[cls="x-slidenavigation-container"]');
            
            // If the object has a handler defined, then we don't need to
            // create an Ext object
            if (Ext.isFunction(item.raw.handler)) {
                me._cache[index] = item.raw.handler;
            } else {
                me._cache[index] = container.add(Ext.merge(me.config.defaults, item.raw));

                // Add a button for controlling the slide, if desired
                if ((item.raw.slideButton || false)) {
                    me.createSlideButton(me._cache[index], item.raw.slideButton);
                }
            }
        }
        
        if (Ext.isFunction(this._cache[index])) {
            this._cache[index](this);
        } else {
            container.setActiveItem(this._cache[index]);
        }
        
        if (this.config.closeOnSelect) {
            this.closeContainer(this.config.selectSlideDuration);
        }

        Ext.defer(function() { // prevent immediate de-selection to stop multi-taps
            list.deselectAll();
        }, 50);
        
    },
    
    onContainerDrag: function(draggable, e, offset, eOpts) {
        if (offset.x < 1) {
            this.setClosed(true);
        } else {
            this.setClosed(false);
        }
    },
    
    onContainerDragstart: function(draggable, e, offset, eOpts) {
        if (this.config.slideSelector == false) {
            if(this.isClosed()) {
                return false;
            };
            return true;
        }
        
        if (this.config.slideSelector) {
            node = e.target;
            while (node = node.parentNode) {
                if (node.className && node.className.indexOf(this.config.slideSelector) > -1) {
                    return true;
                }
            }
            return false;
        }
        return false;
    },
    
    onContainerDragend: function(draggable, e, eOpts) {
        var velocity  = Math.abs(e.deltaX / e.deltaTime),
            direction = (e.deltaX > 0) ? "right" : "left",
            offset    = Ext.clone(draggable.offset),
            threshold = parseInt(this.config.list.width * .70);
        
        switch (direction) {
            case "right":
                offset.x = (velocity > 0.75 || offset.x > threshold) ? this.config.list.width : 0;
                break;
            case "left":
                offset.x = (velocity > 0.75 || offset.x < threshold) ? 0 : this.config.list.width;
                break;
        }
        
        this.moveContainer(offset.x);
    },
    
    /**
     * Registers the model with Ext.ModelManager, if it hasn't been
     * already, and returns the name of the model for use in the store.
     */
    getModel: function() {
        var model = 'SlideNavigationPanelItem',
            groups = this.config.groups;
        
        if (!Ext.ModelManager.get(model)) {
            Ext.define(model, {
                extend: 'Ext.data.Model',
                config: {
                    idProperty: 'index',
                    fields: [
                        'index', 'title', 'group', 'handler',
                        {
                            name: 'order',
                            defaultValue: 1
                        },{
                            name: 'groupOrder',
                            convert: function(value, record) {
                                // By default we group and order by group name.
                                group = record.get('group');
                                return groups[group] || group;
                            }
                        }
                    ]
                }
            });
        }
        
        return model;
    },
    
    /**
     *  Closes the container.  See ``moveContainer`` for more details.
     */
    closeContainer: function(duration) {
        var duration = duration || this.config.slideDuration;
        this.moveContainer(0, duration);
        this.fireEvent("listClose");
    },
    
    /**
     *  Opens the container.  See ``moveContainer`` for more details.
     */
    openContainer: function(duration) {
        var duration = duration || this.config.slideDuration;
        this.container.addCls('open');
        this.moveContainer(this.config.list.width, duration);

        this.fireEvent("listOpen");
    },
    
    toggleContainer: function(duration) {
        var duration = Ext.isNumber(duration) ? duration : this.config.slideDuration;
        if (this.isClosed()) {
            this.openContainer(duration);
        } else {
            this.closeContainer(duration);
        }
    },
    
    /**
     *  Moves the container to a specified ``offsetX`` pixels.  Positive
     *  integer values move the container that many pixels from the left edge
     *  of the window.  If ``duration`` is provided, it should be an integer
     *  number of milliseconds to animate the slide effect.  If no duration is
     *  provided, the default in ``config.slideDuration`` is used.
     */
    moveContainer: function(offsetX, duration) {
        var duration = duration || this.config.slideDuration,
            draggable = this.container.draggableBehavior.draggable;
        
        draggable.setOffset(offsetX, 0, {
            duration: duration
        });
    },
    
    /**
     *  Returns true if the container is closed, false otherwise.  This is a
     *  computed value based off the current offset position of the container.
     */
    isClosed: function() {
        return (this.container.draggableBehavior.draggable.offset.x == 0);
    },
    
    /**
     *  Sets the container as being closed.  This shouldn't ever be called
     *  directly as it is automatically called by the ``translatable``
     *  "animationend" event after the container has stopped moving.  All this
     *  really does is set the CSS class for the container.
     */
    setClosed: function(closed) {
        /**
         *  TODO: Consider some way to mask/disable certain elements when
         *        the container is opened.  The code commented-out below
         *        'works' but I think there is a better way to approach this.
         */
         
        if (closed) {
            this.container.removeCls('open');
            
            /*
            Ext.each(this.container.getActiveItem().getItems().items, function(item) {
                if (item.maskOnSlide) {
                    item.setMasked(false);
                }
            });
            */
        } else {
            this.container.addCls('open');
            /*
            Ext.each(this.container.getActiveItem().getItems().items, function(item) {
                if (item.maskOnSlide) {
                    item.setMasked(true);
                }
            });
            */
        }
    },
    
    /**
     * Generates a new Ext.dataview.List object to be used for displaying
     * the navigation items.
     */
    createNavigationList: function(store) {
        return Ext.create('Ext.dataview.List', Ext.merge({}, this.config.list, {
            store: this.store,
            docked: 'left',
            cls: 'x-slidenavigation-list',
            style: 'position: absolute; top: 0; left: 0; height: 100%;' +
                   'width: 100% !important;',
            zIndex: 1,
            listeners: {
                select: this.onSelect,
                scope: this
            }
        }));
    },
    
    /**
     *  Generates and returns the Ext.Container to be used for displaying
     *  content.  This is the "slideable" container that is positioned above
     *  the navigation list.
     */
    createContainer: function() {
        var parent = this;
        var cont = Ext.create('Ext.ux.slidenavigation.InternalContainer', Ext.merge({}, this.config.container, {
            layout : {
                type: 'card',
                animation: {
                    duration: 300,
                    easing: 'ease-out',
                    type: 'slide',
                    direction: 'left'
                }
            },
            draggable: {
                direction: 'horizontal',
                constraint: {
                    min: { x: 0, y: 0 },
                    max: { x: this.config.list.maxDrag ||Math.max(screen.width, screen.height), y: 0 }
                },
                listeners: {
                    dragstart: {
                        fn: this.onContainerDragstart,
                        order: 'before',
                        scope: this
                    },
                    drag: Ext.Function.createThrottled(this.onContainerDrag, 100, this),
                    dragend: this.onContainerDragend,
                    scope: this
                },
                translatable: {
                    listeners: {
                        animationend: function(translatable, b, c) {
                            // Remove the class when the animation is finished, but only
                            // if we're "closed"
                            this.setClosed(this.isClosed());
                        },
                        scope: this // The "x-slidenavigation" container
                    }
                }
            }
        }));

        return cont;
    },

    /**
     * @private
     * Called when the user taps on the back button
     */
    onBackButtonTap: function() {
        this.pop();
        this.fireEvent('back', this);
    },

    /**
     * Pushes a new view into this navigation view using the default animation that this view has.
     * @param {Object} view The view to push
     * @return {Ext.Component} The new item you just pushed
     */
    push: function(view) {
        return this.container.doPush(view);
    },

    /**
     * Removes the current active view from the stack and sets the previous view using the default animation
     * of this view.
     * @param {Number} count The number of views you want to pop
     * @return {Ext.Component} The new active item
     */
    pop: function(count) {
        if (this.container.beforePop(count)) {
            return this.container.doPop();
        }
    },

    /**
     * Returns the view at the top of this stack.
     * @return {Ext.Component} The topmost item
     */
    getTopItem: function() {
        if(this.container) {
            return this.container.getTopItem();
        }
        return null;
    },

    /**
     * Resets the view by removing all items between the first and last item.
     * @return {Ext.Component} The view that is now active
     */
    reset: function() {
        return this.container.reset();
    },

    /**
     * Called upon destroying the view. Destroys all child objects of the view
     * if they can be destroyed. Prevents item ID collisions upon re-instantiating
     * the navigation view.
     */
    destroy: function() {
        this.container.destroy();
        Ext.Object.each(this._cache, function(key, value) {
            if (Ext.isObject(value) && Ext.isFunction(value.destroy)) {
                value.destroy();
            }
        });

    }

});