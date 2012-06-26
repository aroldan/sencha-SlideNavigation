
Ext.define("Ext.ux.slidenavigation.NavigationBar", {
  extend: 'Ext.navigation.Bar',
  /*
      Resets the navigation bar back button stack. Useful when clearing and "re-rooting"
      the navigation view.
  */

  reset: function() {
    this.backButtonStack = [];
  }
});
