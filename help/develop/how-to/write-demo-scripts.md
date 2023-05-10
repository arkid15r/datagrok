---
title: "Write demo scripts"
---

## Definition

A *demo script* is a script that demonstrates step-by-step functionality, such as 
[molecule activity cliffs](https://public.datagrok.ai/apps/Tutorials/Demo/Cheminformatics/Molecule%20Activity%20Cliffs/)
or [similarity search](https://public.datagrok.ai/apps/Tutorials/Demo/Cheminformatics/Similarity%20Search).

## Writing a demo script

A demo script is a class that contains certain attributes (name and description)
as well as a set of steps (each with a name, function, optional delay, and
description). To start writing a demo script in a package, we need to install
`@datagrok-libraries/tutorials`.

The first step is to initialize a `DemoScript`:

```typescript
export function demo() {
  const demoScript = new DemoScript('Demo', 'Demo description', true);
  // ...
}
```

Each demo script should have a `name`, `description`, and an `isAutomatic`
flag that sets the type of script.

After initialization, you need to add steps using the `step()` function:

```typescript
demoScript
  .step('Step 1', async () => {
    grok.shell.addTableView(grok.data.demo.demog());
  }, {description: 'Step 1 description.', delay: 2000})
  .step('Step 2', async () => {
    grok.shell.addTableView(grok.data.testData('biosensor'));
  }, {description: 'Step 2 description.', delay: 2000})
  .step('Final step', async () => console.log('Finished'));
```

Each demo script step contains a mandatory `name` and an async void
`func`, as well as optional `description` and `delay` for each step.

After adding steps, you need to start the demo script asynchronously:

```typescript
await demoScript.start();
```

## Registering a demo script

Every demo script should be registered as a package demo function. To do
that, add a function to your `package.ts` file. It should have the
`meta.demoPath` parameter, where you specify the path of the demo. There
is also an optional parameter, `description`, which contents are displayed
in the UI tooltip in the demo application.

```typescript
import {demo} from './demo-app/demo-script';


//name: Demo script
//description: Illustrates the work of the demo script 
//meta.demoPath: Viewers | Demo Script
export function demoScript() {
  return new demo();
}
```

Without a specified `demoPath`, the demo script won't be included in the
demo application and will only exist as a [package](../develop.md#packages)
function.

See also:

* [Packages](../develop.md#packages)
* [JavaScript API](../js-api.md)