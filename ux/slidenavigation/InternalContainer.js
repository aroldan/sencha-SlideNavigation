Ext.define('Ext.ux.slidenavigation.InternalContainer', {
    extend: 'Ext.Container',

    config: {
	    docked: 'left',
        cls: 'x-slidenavigation-container',
        style: 'width: 100%; height: 100%; position: absolute; opacity: 1; z-index: 5',
        docked: 'left',
        layout: 'card',
        xtype: 'slidenavigationviewinternalcontainer',
        requires: ['Ext.navigation.Bar'],

        navigationBar: {
            docked: 'top'
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
    },

    getSliderButton: function() {
    	return this.sliderButton;
    },

    setSliderButton: function(view) {
    	this.sliderButton = view;
    	this.getNavigationBar().add(this.sliderButton);
    },

    showSliderButton: function() {
    	if(this.sliderButton) {
    		this.sliderButton.show();
    	}
    },
    hideSliderButton: function() {
    	if(this.sliderButton) {
    		this.sliderButton.hide();
    	}
    },

    initialize: function() {
    	var me = this;
    	this.sliderButton = null;

    	this.getNavigationBar().on({
            back: this.onBackButtonTap,
            scope: this
        });
    },

    // @private
    applyNavigationBar: function(config) {
        if (!config) {
            config = {
                hidden: true,
                docked: 'top'
            };
        }

        if (config.title) {
            delete config.title;
            //<debug>
            Ext.Logger.warn("Ext.ux.slidenavigation.View: The 'navigationBar' configuration does not accept a 'title' property. You " +
                            "set the title of the navigationBar by giving this navigation view's children a 'title' property.");
            //</debug>
        }

        config.view = this;
        config.useTitleForBackButtonText = this.getUseTitleForBackButtonText();

        return Ext.factory(config, Ext.navigation.Bar, this.getNavigationBar());
    },
    

    /**
     * @private
     * Calculates whether it needs to remove any items from the stack when you are popping more than 1
     * item. If it does, it removes those views from the stack and returns `true`.
     * @return {Boolean} True if it has removed views
     */
    beforePop: function(count) {
        var me = this,
            innerItems = this.getInnerItems(),
            ln = innerItems.length,
            toRemove, i;

        //default to 1 pop
        if (!Ext.isNumber(count) || count < 1) {
            count = 1;
        }

        //check if we are trying to remove more items than we have
        count = Math.min(count, ln - 1);

        if (count) {
            //we need to reset the backButtonStack in the navigation bar
            me.getNavigationBar().beforePop(count);

            //get the items we need to remove from the view and remove theme
            toRemove = innerItems.splice(-count, count - 1);
            for (i = 0; i < toRemove.length; i++) {
                this.remove(toRemove[i]);
            }

            return true;
        }

        return false;
    },

        // @private
    updateNavigationBar: function(newNavigationBar, oldNavigationBar) {
        if (oldNavigationBar) {
            this.remove(oldNavigationBar, true);
        }

        if (newNavigationBar) {
            var layout = this.getLayout(),
                animation = (layout && layout.isLayout) ? layout.getAnimation() : false;

            if (animation && animation.isAnimation) {
                newNavigationBar.setAnimation(animation.config);
            }
            this.add(newNavigationBar);
        }
    },

    doPush: function(view) {
    	this.hideSliderButton();
    	this.add(view);
    },
    doPop: function() {
        var me = this,
            innerItems = me.getInnerItems();

        //set the new active item to be the new last item of the stack
        this.remove(innerItems[innerItems.length - 1]);

        if(innerItems.length == 2) {
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
            this.fireEvent('add', this, item, index);
        }
    },
    /**
     * @private
     */
    applyActiveItem: function(activeItem, currentActiveItem) {
        var me = this,
            innerItems = me.getInnerItems();

        // Make sure the items are already initialized
        me.getItems();

        // If we are not initialzed yet, we should set the active item to the last item in the stack
        if (!me.initialized) {
            activeItem = innerItems.length - 1;
        }

        return this.callParent([activeItem, currentActiveItem]);
    },
    /**
     * Returns the previous item, if one exists.
     * @return {Mixed} The previous view
     */
    getPreviousItem: function() {
        var innerItems = this.container.getInnerItems();
        return innerItems[innerItems.length - 2];
    },

    /**
     * @private
     * Called when the user taps on the back button
     */
    onBackButtonTap: function() {
        this.getParent().pop();
        this.fireEvent('back', this);
    },

    doResetActiveItem: function(innerIndex) {
        var me = this,
            innerItems = me.getInnerItems(),
            animation = me.getLayout().getAnimation();

        if (innerIndex > 0) {
            if (animation && animation.isAnimation) {
                animation.setReverse(true);
            }
            me.setActiveItem(innerIndex - 1);
            me.getNavigationBar().onViewRemove(me, innerItems[innerIndex], innerIndex);
        }
    },

        /**
     * @private
     */
    doRemove: function() {
        var animation = this.getLayout().getAnimation();

        if (animation && animation.isAnimation) {
            animation.setReverse(false);
        }

        this.callParent(arguments);
    },


    /**
     * Resets the view by removing all items between the first and last item.
     * @return {Ext.Component} The view that is now active
     */
    reset: function() {
        return this.pop(this.getInnerItems().length);
    }
});