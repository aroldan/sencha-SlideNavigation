/*
{@link Ext.ux.slidenavigation.InternalContainer} is the container included inside an
{@link Ext.ux.slidenavigation.View}.
*/

Ext.define("Ext.ux.slidenavigation.InternalContainer", {
  extend: "Ext.Container",
  config: {
    docked: "left",
    cls: "x-slidenavigation-container",
    style: "width: 100%; height: 100%; position: absolute; opacity: 1;",
    layout: "card",
    xtype: "slidenavigationviewinternalcontainer",
    requires: ["Ext.navigation.Bar"],
    navigationBar: {
      docked: "top"
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

    defaultBackButtonText: "Back"
  },
  getSliderButton: function() {
    return this.sliderButton;
  },
  setSliderButton: function(view) {
    this.sliderButton = view;
    return this.getNavigationBar().add(this.sliderButton);
  },
  showSliderButton: function() {
    if (this.sliderButton) {
      return this.sliderButton.show();
    }
  },
  hideSliderButton: function() {
    if (this.sliderButton) {
      return this.sliderButton.hide();
    }
  },
  initialize: function() {
    var me;
    me = this;
    this.sliderButton = null;
    return this.getNavigationBar().on({
      back: this.onBackButtonTap,
      scope: this
    });
  },
  applyNavigationBar: function(config) {
    if (!config) {
      config = {
        hidden: true,
        docked: "top"
      };
    }
    if (config.title) {
      delete config.title;
      Ext.Logger.warn("Ext.ux.slidenavigation.View: The 'navigationBar' configuration does not accept a 'title' property. You " + "set the title of the navigationBar by giving this navigation view's children a 'title' property.");
    }
    config.view = this;
    config.useTitleForBackButtonText = this.getUseTitleForBackButtonText();
    return Ext.factory(config, 'Ext.ux.slidenavigation.NavigationBar', this.getNavigationBar());
  },
  /*
      @private
      Calculates whether it needs to remove any items from the stack when you are popping more than 1
      item. If it does, it removes those views from the stack and returns `true`.
      @return {Boolean} True if it has removed views
  */

  beforePop: function(count) {
    var i, innerItems, ln, me, toRemove;
    if (count == null) {
      count = 1;
    }
    me = this;
    innerItems = this.getInnerItems();
    ln = innerItems.length;
    toRemove = void 0;
    i = void 0;
    count = Math.min(count, ln - 1);
    if (count) {
      me.getNavigationBar().beforePop(count);
      toRemove = innerItems.splice(-count, count - 1);
      i = 0;
      while (i < toRemove.length) {
        this.remove(toRemove[i]);
        i++;
      }
      return true;
    }
    return false;
  },
  getTopItem: function() {
    var innerItems;
    innerItems = this.getInnerItems();
    return innerItems[innerItems.length - 1];
  },
  updateNavigationBar: function(newNavigationBar, oldNavigationBar) {
    var animation, layout;
    if (oldNavigationBar) {
      this.remove(oldNavigationBar, true);
    }
    if (newNavigationBar) {
      layout = this.getLayout();
      animation = (layout && layout.isLayout ? layout.getAnimation() : false);
      if (animation && animation.isAnimation) {
        newNavigationBar.setAnimation(animation.config);
      }
      return this.add(newNavigationBar);
    }
  },
  doPush: function(view) {
    this.hideSliderButton();
    return this.add(view);
  },
  doPop: function() {
    var innerItems, me;
    me = this;
    innerItems = me.getInnerItems();
    this.remove(innerItems[innerItems.length - 1]);
    if (innerItems.length === 2) {
      this.showSliderButton();
    }
    return this.getActiveItem();
  },
  onItemAdd: function(item, index) {
    this.doItemLayoutAdd(item, index);
    if (!this.isItemsInitializing && item.isInnerItem()) {
      this.setActiveItem(item);
      this.getNavigationBar().onViewAdd(this, item, index);
    }
    if (this.initialized) {
      return this.fireEvent("add", this, item, index);
    }
  },
  /*
      @private
  */

  applyActiveItem: function(activeItem, currentActiveItem) {
    var innerItems, me;
    me = this;
    innerItems = me.getInnerItems();
    me.getItems();
    if (!me.initialized) {
      activeItem = innerItems.length - 1;
    }
    return this.callParent([activeItem, currentActiveItem]);
  },
  /*
      Returns the previous item, if one exists.
      @return {Mixed} The previous view
  */

  getPreviousItem: function() {
    var innerItems;
    innerItems = this.container.getInnerItems();
    return innerItems[innerItems.length - 2];
  },
  /*
      @private
      Called when the user taps on the back button
  */

  onBackButtonTap: function() {
    this.getParent().pop();
    return this.fireEvent("back", this);
  },
  doResetActiveItem: function(innerIndex) {
    var animation, innerItems, me;
    me = this;
    innerItems = me.getInnerItems();
    animation = me.getLayout().getAnimation();
    if (innerIndex > 0) {
      if (animation && animation.isAnimation) {
        animation.setReverse(true);
      }
      me.setActiveItem(innerIndex - 1);
      return me.getNavigationBar().onViewRemove(me, innerItems[innerIndex], innerIndex);
    }
  },
  /*
      @private
  */

  doRemove: function() {
    var animation;
    animation = this.getLayout().getAnimation();
    if (animation && animation.isAnimation) {
      animation.setReverse(false);
    }
    return this.callParent(arguments);
  },
  /*
      Removes the current active view from the stack and sets the previous view using the default animation
      of this view.
      @param {Number} count The number of views you want to pop
      @return {Ext.Component} The new active item
  */

  pop: function(count) {
    if (this.beforePop(count)) {
      return this.doPop();
    }
  },
  /*
      Resets the view by removing all items between the first and last item.
      @return {Ext.Component} The view that is now active
  */

  reset: function() {
    return this.pop(this.getInnerItems().length);
  },
  /*
      Does a "hard reset" of the navigation view and adds a new "base item."
      @return {Ext.Component} The view that is now active
  */

  hardResetWithView: function(newView) {
    var innerItems, item, _i, _len;
    innerItems = this.getInnerItems();
    for (_i = 0, _len = innerItems.length; _i < _len; _i++) {
      item = innerItems[_i];
      this.remove(item);
    }
    this.add(newView);
    this.getNavigationBar().reset();
    return newView;
  }
});
