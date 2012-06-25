
Ext.define("Ext.ux.slidenavigation.NavigationBar", {
  extend: 'Ext.navigation.Bar',
  onViewAdd: function(view, item) {
    console.log(view);
    return this.callParent(arguments);
  },
  updateView: function(newView) {
    console.log(newView);
    return this.callParent(arguments);
  }
});
