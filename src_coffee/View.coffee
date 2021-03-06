###
{@link Ext.ux.slidenavigation.View} is a subclass of {@link Ext.Container}
that provides a sliding main view with an underlying navigation list.

This fork also provides the functionality of an {@link Ext.navigation.View}, meaning that
you can push and pop views.

The concept was inspired by Facebook's mobile app.

@author Weston Nielson <wnielson@github>, Anthony Roldan <aroldan@github>
###
Ext.define "Ext.ux.slidenavigation.View",
    extend: "Ext.Container"
    requires: [
        "Ext.Button"
        "Ext.Container"
        "Ext.Function"
        "Ext.ModelManager"
        "Ext.Toolbar"
        "Ext.data.Model"
        "Ext.data.Store"
        "Ext.dataview.List"
        "Ext.ux.slidenavigation.InternalContainer"
        "Ext.ux.slidenavigation.NavigationBar"
    ]
    xtype: "slidenavigationview"
    config:
        
        ###
        @cfg {Object} list Configuration for the navigation list
        ###
        list:
            width: 250
            maxDrag: null
            itemTpl: "{title}"
            grouped: true
            items: [
                xtype: "toolbar"
                docked: "top"
                ui: "light"
            ]
        
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
        
        ###
        @cfg {Object} container Configuration for the container
        ###
        container: {}
        
        ###
        @cfg {Array} items An array of items to initially put into the navigation list.
        The items can either be Ext components or special objects with a "handler"
        key, which should be a function to execute when selected.  Additionally, you
        can define the order of the items by defining an 'order' parameter.
        ###
        startItems: []
        
        ###
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
        ###
        groups: {}
        
        ###
        @cfg {Object} defaults An object of default values to apply to any Ext
        components created from those listed in ``items``.
        ###
        defaults:
            layout: "card"

        
        ###
        @cfg {String} slideSelector Class selector of object (or parent)
        of which dragging should be allowed.  Defaults to the entire container.
        For example, this could be set to something like 'x-toolbar' to restrict
        dragging only to a toolbar.
        ###
        slideSelector: ""
        
        ###
        @cfg {Integer} slideDuration Number of miliseconds to animate the sliding
        of the container when "flicked".  By default the animation is disable on
        Android.
        ###
        slideDuration: (if Ext.os.is.Android then 0 else 100)
        
        ###
        @cfg {Integer} selectSlideDuration Number of miliseconds to animate the sliding
        of the container when list item is selected (if closeOnSelect = true). The default
        value here of 300 gives a much nicer feel.  By default the animation is disable on
        Android.
        ###
        selectSlideDuration: (if Ext.os.is.Android then 0 else 300)
        
        ###
        @cfg {Boolean} closeOnSelect Whether or not to automatically close the container
        when an item in the list is selected.  Default is true.
        ###
        closeOnSelect: true

        shadowStyle: '0 0 4px 1px #999'

        slideButton: {}

    initConfig: ->
        existingStore = undefined
        @_indexCount = 0
        
        ###
        Create the store.
        ###
        existingStore = Ext.getStore("sliderNavigationStore")
        if existingStore
            @store = existingStore
            @store.removeAll() # dump store contents
        else
            @store = Ext.create("Ext.data.Store",
                model: @getModel()
                sorters: "order"
                grouper:
                    property: "group"
                    sortProperty: "groupOrder"

                storeId: "sliderNavigationStore"
            )
        
        ###
        Add the items into the list.
        ###
        @addItems @config.startItems or []
        @callParent arguments
        
        @currentIndex = null;
        
        ###
        Default config values used for creating a slideButton.
        ###
        @slideButtonDefaults =
            xtype: "button"
            iconMask: true
            iconCls: "more"
            name: "slidebutton"
            listeners:
                release: @toggleContainer
                scope: @

    initialize: ->
        @__init = false

        @callParent()
        @addCls "x-slidenavigation"
        @list = @createNavigationList()
        @container = @createContainer()

        @add [ @list, @container ]

        @createContainerCSS()

        @relayEvents @container,
            add: "push"
            remove: "pop"

        # TODO: Make this optional, perhaps by defining
        # "selected: true" in the items list
        @list.select 0

        @__init = true

    
    ###
    Adds an array of items (or a single item) into the list.
    ###
    addItems: (items) ->
        me = this
        items = (if Ext.isArray(items) then items else [ items ])
        groups = me.config.groups
        Ext.each items, (item, index) ->
            unless Ext.isDefined(item.index)
                item.index = me._indexCount
                me._indexCount++
            me.store.add item


    createContainerCSS: ->
        shadowStyle = @getShadowStyle()
        id = @getId()

        if shadowStyle
            if !document.getElementById id
                style = document.createElement 'style'
                style.type = 'text/css'
                style.id = id
                style.innerHTML = """
                .x-slidenavigation-container.x-dragging,
                .x-slidenavigation-container.open {
                    box-shadow: #{shadowStyle};
                    -webkit-box-shadow:#{shadowStyle};
                }
                """
                document.getElementsByTagName('head')[0].appendChild style

    
    ###
    If an item with the given title exists in the list, remove it.
    ###
    removeItemByTitle: (itemTitle) ->
        me = this
        Ext.each @store.data.items, (item, index) ->
            if item.data.title is itemTitle
                me.store.remove item
                false # only remove first match


    
    ###
    Finds an item in the list by title and returns that item.
    ###
    getItemByTitle: (itemTitle) ->
        me = this
        foundItem = null
        Ext.each @store.data.items, (item, index) ->
            if item.data.title is itemTitle
                foundItem = item
                false # only remove first match

        foundItem

    
    ###
    Creates a button that can toggle the navigation menu.  For an example
    config, see ``slideButtonDefaults``.
    ###
    createSlideButton: (config) ->
        if !@container.getSliderButton()?
            @container.setSliderButton(Ext.create("Ext.Button", Ext.merge(@slideButtonDefaults, config)))
        return

    
    ###
    Called when an item in the list is tapped.
    ###
    onSelect: (list, item, eOpts) ->
        store = list.getStore()
        index = item.raw.index
        container = @container

        if Ext.isFunction item.raw.handler
            item.raw.handler(this)
        else
            if @currentIndex != index
                @reRoot Ext.merge(@config.defaults, item.raw)
                @currentIndex = index

                @createSlideButton @config.slideButton

        if @config.closeOnSelect
            @closeContainer @config.selectSlideDuration

        Ext.defer -> # prevent immediate de-selection to stop multi-taps
            list.deselectAll()
            return
        , 50
        return

    onContainerDrag: (draggable, e, offset, eOpts) ->
        if offset.x < 1
            @setClosed true
        else
            @setClosed false

    onContainerDragstart: (draggable, e, offset, eOpts) ->
        if @config.slideSelector is false
            return false  if @isClosed()
            return true
        if @config.slideSelector
            node = e.target
            @fireEvent 'dragstart', @
            return true  if node.className and node.className.indexOf(@config.slideSelector) > -1  while node = node.parentNode
            return false
        false

    onContainerDragend: (draggable, e, eOpts) ->
        velocity = Math.abs(e.deltaX / e.deltaTime)
        direction = (if (e.deltaX > 0) then "right" else "left")
        offset = Ext.clone(draggable.offset)
        threshold = parseInt(@config.list.width * .70)
        switch direction
            when "right"
                offset.x = (if (velocity > 0.75 or offset.x > threshold) then @config.list.width else 0)
            when "left"
                offset.x = (if (velocity > 0.75 or offset.x < threshold) then 0 else @config.list.width)
        @moveContainer offset.x

    
    ###
    Registers the model with Ext.ModelManager, if it hasn't been
    already, and returns the name of the model for use in the store.
    ###
    getModel: ->
        model = "SlideNavigationPanelItem"
        groups = @config.groups
        unless Ext.ModelManager.get(model)
            Ext.define model,
                extend: "Ext.data.Model"
                config:
                    idProperty: "index"
                    fields: [ "index", "title", "group", "handler",
                        name: "order"
                        defaultValue: 1
                    ,
                        name: "groupOrder"
                        convert: (value, record) ->
                            
                            # By default we group and order by group name.
                            group = record.get("group")
                            groups[group] or group
                    ]
        return model

    
    ###
    Closes the container.  See ``moveContainer`` for more details.
    ###
    closeContainer: (duration) ->
        duration = duration or @config.slideDuration
        @moveContainer 0, duration
        @fireEvent "listClose"
        if @__init
            @fireAction 'close', [@, 0, duration], 'moveContainer', @

    
    ###
    Opens the container.  See ``moveContainer`` for more details.
    ###
    openContainer: (duration) ->
        duration = duration or @config.slideDuration
        @container.addCls "open"
        @moveContainer @config.list.width, duration
        @fireEvent "listOpen"

    toggleContainer: (duration) ->
        duration = (if Ext.isNumber(duration) then duration else @config.slideDuration)
        if @isClosed()
            @openContainer duration
        else
            @closeContainer duration

    
    ###
    Moves the container to a specified ``offsetX`` pixels.  Positive
    integer values move the container that many pixels from the left edge
    of the window.  If ``duration`` is provided, it should be an integer
    number of milliseconds to animate the slide effect.  If no duration is
    provided, the default in ``config.slideDuration`` is used.
    ###
    moveContainer: (offsetX, duration) ->
        duration = duration or @config.slideDuration
        draggable = @container.draggableBehavior.draggable
        draggable.setOffset offsetX, 0,
            duration: duration


    
    ###
    Returns true if the container is closed, false otherwise.  This is a
    computed value based off the current offset position of the container.
    ###
    isClosed: ->
        @container.draggableBehavior.draggable.offset.x is 0

    
    ###
    Sets the container as being closed.  This shouldn't ever be called
    directly as it is automatically called by the ``translatable``
    "animationend" event after the container has stopped moving.  All this
    really does is set the CSS class for the container.
    ###
    setClosed: (closed) ->
        ###
        TODO: Consider some way to mask/disable certain elements when
        the container is opened.  The code commented-out below
        'works' but I think there is a better way to approach this.
        ###
        if closed
            @container.removeCls "open"
        else
            @container.addCls "open"

    ###
    Generates a new Ext.dataview.List object to be used for displaying
    the navigation items.
    ###
    createNavigationList: (store) ->
        listConfig = @getList()

        if listConfig.width
            if !listConfig.minWidth?
                listConfig.minWidth = listConfig.width
            delete listConfig.width

        Ext.create "Ext.dataview.List", Ext.merge({}, listConfig,
            store: @store
            docked: "left"
            cls: "x-slidenavigation-list"
            style: "position: absolute; top: 0; left: 0; height: 100%; z-index: 2;"
            width: '100%'
            listeners:
                select: @onSelect
                scope: this
        )

    
    ###
    Generates and returns the Ext.Container to be used for displaying
    content.  This is the "slideable" container that is positioned above
    the navigation list.
    ###
    createContainer: ->
        parent = this
        cont = Ext.create("Ext.ux.slidenavigation.InternalContainer", Ext.merge({}, @config.container,
            layout: "card"
            draggable:
                direction: "horizontal"
                constraint:
                    min:
                        x: 0
                        y: 0

                    max:
                        x: @config.list.maxDrag or Math.max(screen.width, screen.height)
                        y: 0

                listeners:
                    dragstart:
                        fn: @onContainerDragstart
                        order: "before"
                        scope: this

                    drag: Ext.Function.createThrottled(@onContainerDrag, 100, this)
                    dragend: @onContainerDragend
                    scope: this

                translatable:
                    listeners:
                        animationend: (translatable, b, c) ->
                            
                            # Remove the class when the animation is finished, but only
                            # if we're "closed"
                            @setClosed @isClosed()

                        scope: this # The "x-slidenavigation" container
        ))
        cont

    
    ###
    @private
    Called when the user taps on the back button
    ###
    onBackButtonTap: ->
        @pop()
        @fireEvent "back", this

    
    ###
    Pushes a new view into this navigation view using the default animation that this view has.
    @param {Object} view The view to push
    @return {Ext.Component} The new item you just pushed
    ###
    push: (view) ->
        @container.doPush view

    
    ###
    Removes the current active view from the stack and sets the previous view using the default animation
    of this view.
    @param {Number} count The number of views you want to pop
    @return {Ext.Component} The new active item
    ###
    pop: (count) ->
        @container.doPop()  if @container.beforePop(count)

    
    ###
    Returns the view at the top of this stack.
    @return {Ext.Component} The topmost item
    ###
    getTopItem: ->
        return @container.getTopItem()  if @container
        null

    
    ###
    Resets the view by removing all items between the first and last item.
    @return {Ext.Component} The view that is now active
    ###
    reset: ->
        @container.reset()

    ###
    Reset the "root" of the internal container NavigationView
    @return {Ext.Component} the view that is now active
    ###
    reRoot: (view) ->
        @container.hardResetWithView(view)
    
    ###
    Called upon destroying the view. Destroys all child objects of the view
    if they can be destroyed. Prevents item ID collisions upon re-instantiating
    the navigation view.
    ###
    destroy: ->
        @container.destroy()
        Ext.Object.each @_cache, (key, value) ->
            value.destroy()  if Ext.isObject(value) and Ext.isFunction(value.destroy)

    ###
    Update this container's title with the provided string.
    Useful when updating the title of drilldown views.
    ###
    updateTitle: (s) ->
        @container.getNavigationBar().setTitle(s)

