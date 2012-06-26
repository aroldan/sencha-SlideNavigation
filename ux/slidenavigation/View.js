/*
{@link Ext.ux.slidenavigation.View} is a subclass of {@link Ext.Container}
that provides a sliding main view with an underlying navigation list.

This fork also provides the functionality of an {@link Ext.navigation.View}, meaning that
you can push and pop views.

The concept was inspired by Facebook's mobile app.

@author Weston Nielson <wnielson@github>, Anthony Roldan <aroldan@github>
*/

Ext.define("Ext.ux.slidenavigation.View", {
  extend: "Ext.Container",
  requires: ["Ext.Button", "Ext.Container", "Ext.Function", "Ext.ModelManager", "Ext.Toolbar", "Ext.data.Model", "Ext.data.Store", "Ext.dataview.List", "Ext.ux.slidenavigation.InternalContainer", "Ext.ux.slidenavigation.NavigationBar"],
  xtype: "slidenavigationview",
  config: {
    /*
            @cfg {Object} list Configuration for the navigation list
    */

    list: {
      width: 250,
      maxDrag: null,
      itemTpl: "{title}",
      grouped: true,
      items: [
        {
          xtype: "toolbar",
          docked: "top",
          ui: "light"
        }
      ]
    },
    layout: {
      type: "card",
      animation: {
        duration: 300,
        easing: "ease-out",
        type: "slide",
        direction: "left"
      }
    },
    /*
            @cfg {Boolean} useTitleForBackButtonText
            Set to false if you always want to display the {@link #defaultBackButtonText} as the text
            on the back button. True if you want to use the previous views title.
            @private
            @accessor
    */

    useTitleForBackButtonText: null,
    /*
            @cfg {String} defaultBackButtonText
            The text to be displayed on the back button if:
            a) The previous view does not have a title
            b) The {@link #useTitleForBackButtonText} configuration is true.
            @private
            @accessor
    */

    defaultBackButtonText: "Back",
    /*
            @cfg {Object} container Configuration for the container
    */

    container: {},
    /*
            @cfg {Array} items An array of items to initially put into the navigation list.
            The items can either be Ext components or special objects with a "handler"
            key, which should be a function to execute when selected.  Additionally, you
            can define the order of the items by defining an 'order' parameter.
    */

    startItems: [],
    /*
            @cfg {Object} groups Mapping of group name to order.  For example,
            say you have defined two groups; "Group 1" and "Group 2".  By default
            these will be presented in the list in that order, since
            'Group 1' > 'Group 2'.  This option allows you to change the ordering,
            like so:
            
            groups: {
            'Group 1': 2
            'Group 2': 1
            }
            
            You should use integers, starting with 1, as the ordering value.
            By default groups are ordered by their name.
    */

    groups: {},
    /*
            @cfg {Object} defaults An object of default values to apply to any Ext
            components created from those listed in ``items``.
    */

    defaults: {
      layout: "card"
    },
    /*
            @cfg {String} slideSelector Class selector of object (or parent)
            of which dragging should be allowed.  Defaults to the entire container.
            For example, this could be set to something like 'x-toolbar' to restrict
            dragging only to a toolbar.
    */

    slideSelector: "",
    /*
            @cfg {Integer} slideDuration Number of miliseconds to animate the sliding
            of the container when "flicked".  By default the animation is disable on
            Android.
    */

    slideDuration: (Ext.os.is.Android ? 0 : 100),
    /*
            @cfg {Integer} selectSlideDuration Number of miliseconds to animate the sliding
            of the container when list item is selected (if closeOnSelect = true). The default
            value here of 300 gives a much nicer feel.  By default the animation is disable on
            Android.
    */

    selectSlideDuration: (Ext.os.is.Android ? 0 : 300),
    /*
            @cfg {Boolean} closeOnSelect Whether or not to automatically close the container
            when an item in the list is selected.  Default is true.
    */

    closeOnSelect: true,
    slideButton: {}
  },
  initConfig: function() {
    var existingStore;
    existingStore = void 0;
    this._indexCount = 0;
    /*
            Create the store.
    */

    existingStore = Ext.getStore("sliderNavigationStore");
    if (existingStore) {
      this.store = existingStore;
      this.store.removeAll();
    } else {
      this.store = Ext.create("Ext.data.Store", {
        model: this.getModel(),
        sorters: "order",
        grouper: {
          property: "group",
          sortProperty: "groupOrder"
        },
        storeId: "sliderNavigationStore"
      });
    }
    /*
            Add the items into the list.
    */

    this.addItems(this.config.startItems || []);
    this.callParent(arguments);
    /*
            This stores the instances of the components created.
            TODO: Support 'autoDestroy'.
            @private
    */

    this._cache = {};
    /*
            Default config values used for creating a slideButton.
    */

    return this.slideButtonDefaults = {
      xtype: "button",
      iconMask: true,
      iconCls: "more",
      name: "slidebutton",
      listeners: {
        release: this.toggleContainer,
        scope: this
      }
    };
  },
  initialize: function() {
    this.callParent();
    this.addCls("x-slidenavigation");
    this.list = this.createNavigationList();
    this.container = this.createContainer();
    this.add([this.list, this.container]);
    this.relayEvents(this.container, {
      add: "push",
      remove: "pop"
    });
    return this.list.select(0);
  },
  /*
      Adds an array of items (or a single item) into the list.
  */

  addItems: function(items) {
    var groups, me;
    me = this;
    items = (Ext.isArray(items) ? items : [items]);
    groups = me.config.groups;
    return Ext.each(items, function(item, index) {
      if (!Ext.isDefined(item.index)) {
        item.index = me._indexCount;
        me._indexCount++;
      }
      return me.store.add(item);
    });
  },
  /*
      If an item with the given title exists in the list, remove it.
  */

  removeItemByTitle: function(itemTitle) {
    var me;
    me = this;
    return Ext.each(this.store.data.items, function(item, index) {
      if (item.data.title === itemTitle) {
        me.store.remove(item);
        return false;
      }
    });
  },
  /*
      Finds an item in the list by title and returns that item.
  */

  getItemByTitle: function(itemTitle) {
    var foundItem, me;
    me = this;
    foundItem = null;
    Ext.each(this.store.data.items, function(item, index) {
      if (item.data.title === itemTitle) {
        foundItem = item;
        return false;
      }
    });
    return foundItem;
  },
  /*
      Creates a button that can toggle the navigation menu.  For an example
      config, see ``slideButtonDefaults``.
  */

  createSlideButton: function(config) {
    if (!(this.container.getSliderButton() != null)) {
      this.container.setSliderButton(Ext.create("Ext.Button", Ext.merge(this.slideButtonDefaults, config)));
    }
  },
  /*
      Called when an item in the list is tapped.
  */

  onSelect: function(list, item, eOpts) {
    var container, index, store;
    store = list.getStore();
    index = item.raw.index;
    container = this.container;
    if (Ext.isFunction(item.raw.handler)) {
      item.raw.handler(this);
    } else {
      this.reRoot(Ext.merge(this.config.defaults, item.raw));
      this.createSlideButton(this.config.slideButton);
    }
    if (this.config.closeOnSelect) {
      this.closeContainer(this.config.selectSlideDuration);
    }
    return Ext.defer(function() {
      return list.deselectAll();
    }, 50);
  },
  onContainerDrag: function(draggable, e, offset, eOpts) {
    if (offset.x < 1) {
      return this.setClosed(true);
    } else {
      return this.setClosed(false);
    }
  },
  onContainerDragstart: function(draggable, e, offset, eOpts) {
    var node;
    if (this.config.slideSelector === false) {
      if (this.isClosed()) {
        return false;
      }
      return true;
    }
    if (this.config.slideSelector) {
      node = e.target;
      if ((function() {
        var _results;
        _results = [];
        while (node = node.parentNode) {
          _results.push(node.className && node.className.indexOf(this.config.slideSelector) > -1);
        }
        return _results;
      }).call(this)) {
        return true;
      }
      return false;
    }
    return false;
  },
  onContainerDragend: function(draggable, e, eOpts) {
    var direction, offset, threshold, velocity;
    velocity = Math.abs(e.deltaX / e.deltaTime);
    direction = (e.deltaX > 0 ? "right" : "left");
    offset = Ext.clone(draggable.offset);
    threshold = parseInt(this.config.list.width * .70);
    switch (direction) {
      case "right":
        offset.x = (velocity > 0.75 || offset.x > threshold ? this.config.list.width : 0);
        break;
      case "left":
        offset.x = (velocity > 0.75 || offset.x < threshold ? 0 : this.config.list.width);
    }
    return this.moveContainer(offset.x);
  },
  /*
      Registers the model with Ext.ModelManager, if it hasn't been
      already, and returns the name of the model for use in the store.
  */

  getModel: function() {
    var groups, model;
    model = "SlideNavigationPanelItem";
    groups = this.config.groups;
    if (!Ext.ModelManager.get(model)) {
      Ext.define(model, {
        extend: "Ext.data.Model",
        config: {
          idProperty: "index",
          fields: [
            "index", "title", "group", "handler", {
              name: "order",
              defaultValue: 1
            }, {
              name: "groupOrder",
              convert: function(value, record) {
                var group;
                group = record.get("group");
                return groups[group] || group;
              }
            }
          ]
        }
      });
    }
    return model;
  },
  /*
      Closes the container.  See ``moveContainer`` for more details.
  */

  closeContainer: function(duration) {
    duration = duration || this.config.slideDuration;
    this.moveContainer(0, duration);
    return this.fireEvent("listClose");
  },
  /*
      Opens the container.  See ``moveContainer`` for more details.
  */

  openContainer: function(duration) {
    duration = duration || this.config.slideDuration;
    this.container.addCls("open");
    this.moveContainer(this.config.list.width, duration);
    return this.fireEvent("listOpen");
  },
  toggleContainer: function(duration) {
    duration = (Ext.isNumber(duration) ? duration : this.config.slideDuration);
    if (this.isClosed()) {
      return this.openContainer(duration);
    } else {
      return this.closeContainer(duration);
    }
  },
  /*
      Moves the container to a specified ``offsetX`` pixels.  Positive
      integer values move the container that many pixels from the left edge
      of the window.  If ``duration`` is provided, it should be an integer
      number of milliseconds to animate the slide effect.  If no duration is
      provided, the default in ``config.slideDuration`` is used.
  */

  moveContainer: function(offsetX, duration) {
    var draggable;
    duration = duration || this.config.slideDuration;
    draggable = this.container.draggableBehavior.draggable;
    return draggable.setOffset(offsetX, 0, {
      duration: duration
    });
  },
  /*
      Returns true if the container is closed, false otherwise.  This is a
      computed value based off the current offset position of the container.
  */

  isClosed: function() {
    return this.container.draggableBehavior.draggable.offset.x === 0;
  },
  /*
      Sets the container as being closed.  This shouldn't ever be called
      directly as it is automatically called by the ``translatable``
      "animationend" event after the container has stopped moving.  All this
      really does is set the CSS class for the container.
  */

  setClosed: function(closed) {
    /*
            TODO: Consider some way to mask/disable certain elements when
            the container is opened.  The code commented-out below
            'works' but I think there is a better way to approach this.
    */
    if (closed) {
      return this.container.removeCls("open");
    } else {
      return this.container.addCls("open");
    }
  },
  /*
      Generates a new Ext.dataview.List object to be used for displaying
      the navigation items.
  */

  createNavigationList: function(store) {
    return Ext.create("Ext.dataview.List", Ext.merge({}, this.config.list, {
      store: this.store,
      docked: "left",
      cls: "x-slidenavigation-list",
      style: "position: absolute; top: 0; left: 0; height: 100%;" + "width: 100% !important;",
      zIndex: 1,
      listeners: {
        select: this.onSelect,
        scope: this
      }
    }));
  },
  /*
      Generates and returns the Ext.Container to be used for displaying
      content.  This is the "slideable" container that is positioned above
      the navigation list.
  */

  createContainer: function() {
    var cont, parent;
    parent = this;
    cont = Ext.create("Ext.ux.slidenavigation.InternalContainer", Ext.merge({}, this.config.container, {
      layout: {
        type: "card",
        animation: {
          duration: 300,
          easing: "ease-out",
          type: "slide",
          direction: "left"
        }
      },
      draggable: {
        direction: "horizontal",
        constraint: {
          min: {
            x: 0,
            y: 0
          },
          max: {
            x: this.config.list.maxDrag || Math.max(screen.width, screen.height),
            y: 0
          }
        },
        listeners: {
          dragstart: {
            fn: this.onContainerDragstart,
            order: "before",
            scope: this
          },
          drag: Ext.Function.createThrottled(this.onContainerDrag, 100, this),
          dragend: this.onContainerDragend,
          scope: this
        },
        translatable: {
          listeners: {
            animationend: function(translatable, b, c) {
              return this.setClosed(this.isClosed());
            },
            scope: this
          }
        }
      }
    }));
    return cont;
  },
  /*
      @private
      Called when the user taps on the back button
  */

  onBackButtonTap: function() {
    this.pop();
    return this.fireEvent("back", this);
  },
  /*
      Pushes a new view into this navigation view using the default animation that this view has.
      @param {Object} view The view to push
      @return {Ext.Component} The new item you just pushed
  */

  push: function(view) {
    return this.container.doPush(view);
  },
  /*
      Removes the current active view from the stack and sets the previous view using the default animation
      of this view.
      @param {Number} count The number of views you want to pop
      @return {Ext.Component} The new active item
  */

  pop: function(count) {
    if (this.container.beforePop(count)) {
      return this.container.doPop();
    }
  },
  /*
      Returns the view at the top of this stack.
      @return {Ext.Component} The topmost item
  */

  getTopItem: function() {
    if (this.container) {
      return this.container.getTopItem();
    }
    return null;
  },
  /*
      Resets the view by removing all items between the first and last item.
      @return {Ext.Component} The view that is now active
  */

  reset: function() {
    return this.container.reset();
  },
  /*
      Reset the "root" of the internal container NavigationView
      @return {Ext.Component} the view that is now active
  */

  reRoot: function(view) {
    return this.container.hardResetWithView(view);
  },
  /*
      Called upon destroying the view. Destroys all child objects of the view
      if they can be destroyed. Prevents item ID collisions upon re-instantiating
      the navigation view.
  */

  destroy: function() {
    this.container.destroy();
    return Ext.Object.each(this._cache, function(key, value) {
      if (Ext.isObject(value) && Ext.isFunction(value.destroy)) {
        return value.destroy();
      }
    });
  }
});
