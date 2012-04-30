Slide Navigation with NavigationView Functionality!
===================================================

This is my modified version of wneilson's sencha-SlideNavigation, adding the functionality
of a `Ext.navigation.View`_ -- the ability to push and pop other views on top of it, complete
with animation.

.. _ `Ext.navigation.View`: http://docs.sencha.com/touch/2-0/#!/api/Ext.navigation.View

It is even more of a work in progress than the original, so use with caution!

Original Intro
--------------

This is an attempt to make a Facebook-like navigation panel for Sencha Touch 2.
To see a current working demo, visit `this page`_ on a mobile device.  To see the
navigation menu in the example, "flick" the toolbar (at the top) to the right; the
opposite action can be used to close the menu.

.. _`this page`: http://wnielson.github.com/sencha-SlideNavigation/

This is a work in progress and still needs quite a bit of work, but it is usable.

Getting Started
---------------

Using the SlideNavigation view in your project is now easier than before.  All you need
to do is place the 'ux' folder somewhere within your application, then add the following
to your app (at the top of 'app.js' is a good place)::

    Ext.Loader.setConfig({enabled:true});
    Ext.Loader.setPath('Ext.ux', './ux');

Adjust './ux' to wherever you actually placed the 'ux' folder.

Note: If you are using this with other components that also use the 'Ext.ux' namespace,
simply place the 'ux/slidenavigation' folder into the same location that you've placed
the other 'Ext.ux' components.

Then in whatever component you wish to use the view, add::

    requires = [
        'Ext.ux.slidenavigation.View',
    ]

or simply extend the 'Ext.ux.slidenavigation.View' class.

For a more complete example, see `app/view/Main.js`.

Building the Example Application
--------------------------------

To build the example you need to put Sencha Touch into a folder named sdk.  Then run::

    ./sdk/commands/sencha app build -e testing

This will produce the example app in the `build/testing` directory.


Notes
-----

So far this has been tested on:

  * iOS 5 (iPhone and iPad)
  * Android 4.0.3
  * Android 3.2 (tablet)
  * Android 2.3.3

Documentation
-------------

You can read the docs online here_.

.. _here: http://wnielson.github.com/sencha-SlideNavigation/docs/#!/api/Ext.ux.slidenavigation.View

	