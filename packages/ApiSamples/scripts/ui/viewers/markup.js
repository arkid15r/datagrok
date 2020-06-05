// https://datagrok.ai/help/viewers/markup-viewer

let view = grok.shell.addTableView(grok.data.testData('demog', 5000));

// Supports three modes, 'text', 'markup' and 'html'.
// Set 'mode' property to control it (which is auto-detected by default)

view.markup({ content: `
# Markup mode 

* Easy to write
* Uniform style`});


view.markup({ content: `
<div>
    <div>Embed arbitrary HTML</div> 
    <br> 
    <option> 
        <option value="Apple"> Apple </option>
        <option value="Banana"> Banana </option> 
    </select>
</div>`});
