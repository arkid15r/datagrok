<!-- TITLE: JavaScript API -->
<!-- SUBTITLE: -->

# JavaScript API

[Grok JS API](js-api.md) allows to control all aspects of the Datagrok platform. The API
can be used either from ad-hoc [scripts](scripting.md) (`Functions | Scripts | New JavaScript Script`) 
or from [packages](develop.md#packages). 

This document covers the following areas:

  * [API Structure](#api-structure)
  * [Data Manipulation](#data-manipulation)
  * [Views](#views)
  * [Custom Views](#custom-views)
  * [Pre-defined Viewers](#pre-defined-viewers)
  * [Custom Viewers](#custom-viewers)
  * [Registering Functions](#registering-functions)
  * [File Handlers](#file-handlers)
  * [Events](#events)
  * [User-defined Types](#user-defined-types)
  * [Docking](#docking)
  * [REST API](#rest-api)
  * [Machine Learning](#machine-learning)
  * [Cheminformatics](#cheminformatics)
  * [Credentials](#credentials)

## API Structure

There are three entry points to the API: 
**grok** for easy discoverability of the functionality, 
**ui** for building user interfaces, and 
**DG** for instantiating classes directly.

### grok

`grok` is the entry point for most of the commonly used functionality in the platform. 
It is structured in a way to make the discovery of the capabilities very easy, especially 
with IntelliSense. You would just type `grok.`, then select the most appropriate choice 
the IntelliSense gives you, and so on. For instance, let’s imagine that you want to 
construct a dataframe from a CSV file. You would see the following choices after you 
typed `grok.`: [shell, chem, data, data, ml]. What we want to do it related to data, so we 
would type `grok.data` and see the following choices: [demo, query, compareTables, parseCsv, upload]. 
Obviously, we should choose parseCsv; when we select it, IntelliSense will help us with 
the parameters as well. This is the preferred way for using the API for both ad-hoc scripting
and more complex development, since the resulting code is streamlined and easily readable. 
However, in cases where the fluent API does not cover your particular use case, or sometimes
for performance reasons, you will need to work with classes from the DG namespace.

### ui

Building a UI is a special form of programming, and many languages were invented for that
purpose only (HTML, XAML, JSX). We have prioritized the following aspects when choosing 
our approach: simplicity, discoverability, readability.
 
```javascript
ui.dialog('Windows')
  .add(ui.span(['People of Earth, your attention, please… ']))
  .onOK(() => { grok.shell.info('OK!'); })
  .show();
``` 

### DG

Check out [JS API Class Reference](https://datagrok.ai/js-api/) 


## Data Manipulation

### DataFrame

Use [DataFrame](/js-api/DataFrame.html), [Column](/js-api/Column.html), [ColumnList](/js-api/ColumnList.html), 
and [Row](/js-api/Row.html) classes for table manipulation.

```javascript
demog = grok.testData('demog', 5000);
demog.cols.remove('sex');
foo = demog.cols.addNew('foo', 'int');
demog.rows.removeAt(1, 3);
demog.rows.insertAt(2, 2);
demog.rows.addNew(['Spiderman', 'studyX', 'NYC', 32, 'Spider', 'Net', new Date(2020), 180, 80, 666]);
demog.rows.addNew().subj = 'Iron Man';

// alternative ways of setting values
foo.set(1, 777);
demog.set('age', 1, 44);

``` 

### BitSet

Each [DataFrame](/js-api/DataFrame.html) is associated with two [bitsets](/js-api/BitSet.html): selection and filter.

```javascript
// bit set (same applies to filter)
demog.selection.invert();
demog.selection.set(5, false);
demog.selection.findNext(0, false);
```

DataFrame code snippets:
* [DataFrame manipulation](https://public.datagrok.ai/js/samples/data-frame/manipulate)
* [DataFrame events](https://public.datagrok.ai/js/samples/data-frame/events)

## Views

Control [views](../overview/navigation.md) via the following methods:

```javascript
grok.shell.addTableView(table);
```

Dock an arbitrary visual element in a platform:

```javascript
let e = document.createElement('DIV');
e.innerText = 'This element has been created in JavaScript';
grok.shell.dockElement(e, 'JS', 'left', 0.5);
```

## Custom Views

Extend [ViewBase](/js-api/ViewBase.html) class to develop views that become first-class citizens in 
the Datagrok platform. Once a view is registered, you can do the following:

* Open and pass parameters to the view from URL 
* Save the view as part of the project
* Add the view to the navigation bar
* Link the view with entities (custom or the default ones)

The following part of code defines a new view for Jupyter Notebooks. 
The function `notebookView` defined in the package allocates an instance of `NotebookView`.   
    
```javascript
class NotebookView extends DG.ViewBase {
    constructor(params, path) {
        super(params, path);
        this.TYPE = 'Notebook';
        this.PATH = '/notebook';
    }
    
    // Override basic metods
    get type() { return this.TYPE };
    get helpUrl() { return '/help/develop/jupyter-notebook.md'; }
    get name() { return 'Notebook' };
    get path() { return `${this.PATH}/${this.notebookId}` };
    
    // Icon
    getIcon() {
        let img = document.createElement('img');
        img.src = '/images/entities/jupyter.png';
        img.height = 18;
        img.width = 18;
        return img;
    };

    // View state serialization/deserialization
    saveStateMap() { return {'notebookId': this.notebookId }; }
    loadStateMap(stateMap) { open(stateMap['notebookId']); }
    
    // URL path handler
    handlePath(path) {
        let id = path.replace(`${this.PATH}/`, '');
        open(id);
    }
    
    // URL path checker
    acceptsPath(path) { return path.startsWith(this.PATH); }
}


//name: Notebook
//description: Creates a Notebook View
//input: map params
//input: string path
//tags: view
//output: view result
export function notebookView(params = null, path = '') {
    return new NotebookView(params, path);
}
```

Follow the function convention to register a view:

* the header parameters should contain the `view` tag
* add two inputs `params` and `path` to pass URL parameters and path
* specify an output of the `view` type.
   
See full code [there](https://github.com/datagrok-ai/public/blob/master/packages/Notebooks/src/package.js)  

## Pre-defined Viewers

[Viewers](../visualize/viewers.md) are very important components of the Datagrok platform. Grok API 
exposes functionality for manipulating pre-defined viewers 
(such as [scatter plot](../visualize/viewers/scatter-plot.md) or [histogram](../visualize/viewers/histogram.md)), as
well as for developing custom viewers.

Add a new viewer and set up its properties:

```javascript
view = grok.addTableView(grok.testData('demog', 5000));
hist = view.addViewer('histogram');
hist.options({'valueColumnName': 'weight'});
```

## Custom Viewers

Extend [JsViewer](/js-api/JsViewer.html) class to develop viewers that become first-class citizens in 
the Grok platform. Once a viewer is registered, you can do the following:

* Add viewer using `Add | JsDemoViewer`, or from the toolbar 'viewers' popup
* Persist viewer as part of the project
* Common viewer operations under the "Viewer" popup menu, such as cloning, embedding, etc

The following code defines a new viewer by subclassing JsViewer. The viewer listens to changes
of filter and selection in the attached table, and updates numbers of filtered/selected rows accordingly.

```javascript
class JsDemoViewer extends DG.JsViewer {
    onFrameAttached() {
        subs.push(this.dataFrame.selection.onChanged.subscribe((_) => this.render()));
        subs.push(this.dataFrame.filter.onChanged.subscribe((_) => this.render()));

        this.render();
    }

    render() {
        this.root.innerHTML =
            `${this.dataFrame.toString()}<br>
            Selected: ${this.dataFrame.selection.trueCount}<br>
            Filtered: ${this.dataFrame.filter.trueCount}`;
    }
}

grok.shell.registerViewer('JsDemoViewer', 'JavaScript-based viewer', () => new JsDemoViewer());
```

## Registering Functions

Pretty much anything in Grok is a [function](../overview/functions/function.md), it is a concept that
connects together [scripts](scripting.md) written in different languages, predictive models, statistical
functions, query transformations, data flows, and many other features.

The following code registers a "jsConcat" function that becomes a first-class
citizen in the platform (i.e., it can be used from console, gets registered
in help, there could be an optional audit trail associated with the invocations, etc)

To test the newly registered function, enter "jsConcat(42, 33)" in the [Console](../overview/navigation.md#console).

```javascript
grok.functions.register({
    signature: 'String jsConcat(int foo, int bar)',
    run: (foo, bar) => `${foo}_${bar}`});
```

The code below registers two functions, "jsWidget" and "jsSuggestCountryName".  
To test jsWidget, create a new Dashboard, and click on "Widget" under "Widgets".

```javascript
grok.functions.register({
    signature: 'Widget jsWidget()',
    tags: 'Widgets',
    run: function() {
        let e = document.createElement('DIV');
        function update() {
            let date = new Date();
            e.innerText = date.toTimeString();
        }
        window.setTimeout(update, 1000);

        return new ui.Widget(e);
    }});

grok.functions.register({
  signature: 'List<String> jsSuggestCountryName(String text)',
  isAsync: true,
  run: async function(text) {
    let response = await fetch('https://restcountries.eu/rest/v2/name/' + text);
    return response.status === 200 ? (await response.json()).map(country => country['name']) : [];
  }
});
```

Internally, JavaScript-based application are also functions that are annotated accordingly.

Code snippets:
* [Dynamic registering](https://public.datagrok.ai/js/samples/functions/register-function)
* [Functions: Parameter validators](https://public.datagrok.ai/js/samples/functions/func-params-enhancement)
* [Functions: Info panels](https://public.datagrok.ai/js/samples/functions/info-panels/info-panels)
* [Functions: Custom viewers](https://public.datagrok.ai/js/samples/functions/custom-viewers/viewers)


## File Handlers

To handle custom file formats, simply register a function with 
the "file-handler-<extension>" tag (you can specify more than one).
Function's input is either a string or a list of bytes, the output is list of 
[tables](../overview/table.md).  

For example, the following function will get executed whenever a user
opens a file with the "fasta" extension:

```js
//input: string content
//output: list tables
//tags: file-handler-fasta
function fastaFileHandler(content) {
    // ... processing files ...
    return tables;
}
```

## Events

We are exposing events coming out of the platform as a stream via the 
[Rx.JS](rxjs.dev) library that makes it easy to compose asynchronous or callback-based code.
The API makes easy to subscribe to either global, or instance-related events:

```javascript
   // global event when user changes the current project
   grok.events.onCurrentProjectChanged.subscribe(_ => 
       grok.shell.info(`Current project changed: ${grok.shell.project.name}`));

   // subscribing to DataFrame events
   demog = grok.data.testData('demog', 5000);
   demog.onValuesChanged.subscribe((_) => grok.shell.info('values changed'));
``` 

Event-related code snippets:
* [Global events](https://public.datagrok.ai/js/samples/events/global-events)
* [DataFrame events](https://public.datagrok.ai/js/samples/data-frame/events)

To figure out what events are coming out of the platform, use the Inspector tool.
Open it (Alt+I), go to the "Client Log" tab, and perform the action that you want
to intercept. In the panel, you will see one or more of the events, click on them
to inspect event parameters. To simplify the development process, we also generate
JavaScript code for handling this particular event, copy-paste it from the
property panel into your code if needed. 

![](inspector-events.png)

## User-defined Types

Define your own classes, and integrate them easily by providing a meta-class
that extends DG.EntityMeta. This will provide native support for 
context actions, rendering, drag-and drop, tooltips, and favorites.

Code snippets:
* [Custom "Fruit" class](https://public.datagrok.ai/js/samples/ui/meta/meta)

## Docking

The platform provides full support for docking windows.

```javascript
grok.shell.dockManager.dock(ui.divText('first'), DG.DOCK_TYPE.RIGHT, null, 'First');
```

Docking code snippets:
* [Top level](https://public.datagrok.ai/js/samples/ui/docking/docking)
* [Table view](https://public.datagrok.ai/js/samples/ui/docking/docking-table-view)
* [Floating windows](https://public.datagrok.ai/js/samples/ui/docking/docking-floating)


## REST API

Use `grok.dapi` entry point for managing server-based objects, such as datasets,
connection, users, credentials, jobs, packages, etc.

See also [HttpDataSource](https://datagrok.ai/js-api/HttpDataSource) subclasses.  

Code snippets:
* [List of projects](https://public.datagrok.ai/js/samples/dapi/projects-list)
* [Who am I](https://public.datagrok.ai/js/samples/dapi/who-am-i)

## Machine Learning

Use `grok.ml` entry point for machine learning-related routines.

Code snippets:
* [Clustering](https://public.datagrok.ai/js/samples/domains/data-science/cluster)
* [Missing values imputation](https://public.datagrok.ai/js/samples/domains/data-science/missing-values-imputation)
* [PCA](https://public.datagrok.ai/js/samples/domains/data-science/pca)
* [Applying a predictive model](https://public.datagrok.ai/js/samples/domains/data-science/predictive-model)
* [Random data from the specified distribution](https://public.datagrok.ai/js/samples/domains/data-science/random-data)

## Cheminformatics

Use `grok.chem` entry point for cheminformatics-related routines.

## Credentials

You can store text information that bound to a package in secure manner. Use "Credentials..." command from package context menu.
You can add as many strings as you want. Once added they can be read only by members of owner group. 
Datagrok stores credentials encrypted with Datagrok encryption key. 

See more:

  * [Credentials](../govern/security.md#credentials)
  * [Code snippet](https://public.datagrok.ai/js/samples/misc/package-credentials)  

Code snippets:

  * [Calculating descriptors](https://public.datagrok.ai/js/samples/domains/data-science/random-data)
  * [Chemical diversity](https://public.datagrok.ai/js/samples/domains/chem/diversity-search)
  * [Chemical similarity](https://public.datagrok.ai/js/samples/domains/chem/similarity-search)
  * [Substructure search](https://public.datagrok.ai/js/samples/domains/chem/substructure-search)
  * [R-group analysis](https://public.datagrok.ai/js/samples/domains/chem/r-group)
  * [Most common substructure](https://public.datagrok.ai/js/samples/domains/chem/mcs)
  * [Iterating over atoms and bonds](https://public.datagrok.ai/js/samples/domains/chem/mol-atoms-bonds)
  * [Custom info panel for molecules](https://public.datagrok.ai/js/samples/domains/chem/mol-panel)
  * [Rendering molecules to SVG](https://public.datagrok.ai/js/samples/domains/chem/mol-rendering)


See also:

  * [JavaScript development](develop.md) 
