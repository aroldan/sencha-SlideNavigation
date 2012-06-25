Ext.define "Ext.ux.slidenavigation.NavigationBar",
    extend: 'Ext.navigation.Bar'

    onViewAdd: (view, item) ->
        console.log view
        @callParent(arguments)

    updateView: (newView) ->
        console.log newView
        @callParent(arguments)