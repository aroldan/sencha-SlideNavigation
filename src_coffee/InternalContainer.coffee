###
{@link Ext.ux.slidenavigation.InternalContainer} is the container included inside an
{@link Ext.ux.slidenavigation.View}.
###
Ext.define "Ext.ux.slidenavigation.InternalContainer",
    extend: "Ext.Container"
    config:
        docked: "left"
        cls: "x-slidenavigation-container"
        style: "width: 100%; height: 100%; position: absolute; opacity: 1;"
        layout: "card"
        xtype: "slidenavigationviewinternalcontainer"
        requires: [ "Ext.navigation.Bar" ]
        navigationBar:
            docked: "top"

        
        ###
        @cfg {Boolean} useTitleForBackButtonText
        Set to false if you always want to display the {@link #defaultBackButtonText} as the text
        on the back button. True if you want to use the previous views title.
        @private
        @accessor
        ###
        useTitleForBackButtonText: null
        
        ###
        @cfg {String} defaultBackButtonText
        The text to be displayed on the back button if:
        a) The previous view does not have a title
        b) The {@link #useTitleForBackButtonText} configuration is true.
        @private
        @accessor
        ###
        defaultBackButtonText: "Back"

    getSliderButton: ->
        @sliderButton

    setSliderButton: (view) ->
        @sliderButton = view
        @getNavigationBar().add @sliderButton

    showSliderButton: ->
        @sliderButton.show()  if @sliderButton

    hideSliderButton: ->
        @sliderButton.hide()  if @sliderButton

    initialize: ->
        me = this
        @sliderButton = null
        @getNavigationBar().on
            back: @onBackButtonTap
            scope: this

    
    # @private
    applyNavigationBar: (config) ->
        unless config
            config =
                hidden: true
                docked: "top"
        if config.title
            delete config.title

            
            #<debug>
            Ext.Logger.warn "Ext.ux.slidenavigation.View: The 'navigationBar' configuration does not accept a 'title' property. You " + "set the title of the navigationBar by giving this navigation view's children a 'title' property."
        
        #</debug>
        config.view = this
        config.useTitleForBackButtonText = @getUseTitleForBackButtonText()
        Ext.factory config, 'Ext.ux.slidenavigation.NavigationBar', @getNavigationBar()

    
    ###
    @private
    Calculates whether it needs to remove any items from the stack when you are popping more than 1
    item. If it does, it removes those views from the stack and returns `true`.
    @return {Boolean} True if it has removed views
    ###
    beforePop: (count = 1) ->
        me = this
        innerItems = @getInnerItems()
        ln = innerItems.length
        toRemove = undefined
        i = undefined
        
        #check if we are trying to remove more items than we have
        count = Math.min(count, ln - 1)
        if count
        
            #we need to reset the backButtonStack in the navigation bar
            me.getNavigationBar().beforePop count
            
            #get the items we need to remove from the view and remove theme
            toRemove = innerItems.splice(-count, count - 1)
            i = 0
            while i < toRemove.length
                @remove toRemove[i]
                i++
            return true
        false

    getTopItem: ->
        innerItems = @getInnerItems()
        innerItems[innerItems.length - 1]

    
    # @private
    updateNavigationBar: (newNavigationBar, oldNavigationBar) ->
        @remove oldNavigationBar, true  if oldNavigationBar
        if newNavigationBar
            layout = @getLayout()
            animation = (if (layout and layout.isLayout) then layout.getAnimation() else false)
            newNavigationBar.setAnimation animation.config  if animation and animation.isAnimation
            @add newNavigationBar

    doPush: (view) ->
        @hideSliderButton()
        @add view

    doPop: ->
        me = this
        innerItems = me.getInnerItems()
        
        #set the new active item to be the new last item of the stack
        @remove innerItems[innerItems.length - 1]
        if innerItems.length <= 2
            @showSliderButton()
        @getActiveItem()

    onItemAdd: (item, index) ->
        @doItemLayoutAdd item, index
        if not @isItemsInitializing and item.isInnerItem()
            @setActiveItem item
            @getNavigationBar().onViewAdd this, item, index

        if @initialized
            @fireEvent "add", this, item, index

    
    ###
    @private
    ###
    applyActiveItem: (activeItem, currentActiveItem) ->
        me = this
        innerItems = me.getInnerItems()
        
        # Make sure the items are already initialized
        me.getItems()
        
        # If we are not initialzed yet, we should set the active item to the last item in the stack
        activeItem = innerItems.length - 1 unless me.initialized
        @callParent [ activeItem, currentActiveItem ]

    
    ###
    Returns the previous item, if one exists.
    @return {Mixed} The previous view
    ###
    getPreviousItem: ->
        innerItems = @getInnerItems()
        innerItems[innerItems.length - 2]
    
    ###
    @private
    Called when the user taps on the back button
    ###
    onBackButtonTap: ->
        @getParent().pop()
        @fireEvent "back", this

    doResetActiveItem: (innerIndex) ->
        me = this
        innerItems = me.getInnerItems()
        animation = me.getLayout().getAnimation()
        if innerIndex > 0
            animation.setReverse true  if animation and animation.isAnimation
            me.setActiveItem innerIndex - 1
            me.getNavigationBar().onViewRemove me, innerItems[innerIndex], innerIndex

    
    ###
    @private
    ###
    doRemove: ->
        animation = @getLayout().getAnimation()
        animation.setReverse false  if animation and animation.isAnimation
        @callParent arguments

    
    ###
    Removes the current active view from the stack and sets the previous view using the default animation
    of this view.
    @param {Number} count The number of views you want to pop
    @return {Ext.Component} The new active item
    ###
    pop: (count) ->
        if @beforePop(count)
            @doPop()  

    ###
    Resets the view by removing all items between the first and last item.
    @return {Ext.Component} The view that is now active
    ###
    reset: ->
        @pop @getInnerItems().length

    ###
    Does a "hard reset" of the navigation view and adds a new "base item."
    @return {Ext.Component} The view that is now active
    ###
    hardResetWithView : (newView) ->
        navBar = @getNavigationBar()
        innerItems = @getInnerItems()
        for item in innerItems
            @remove(item)

        navBar.reset() # reset nav bar too
        @add(newView)
        @showSliderButton()
        
        newView
