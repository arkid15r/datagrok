import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from "datagrok-api/dg";

export let _package = new DG.Package();

import '@jupyterlab/application/style/index.css';
import '@jupyterlab/codemirror/style/index.css';
import '@jupyterlab/completer/style/index.css';
import '@jupyterlab/documentsearch/style/index.css';
import '@jupyterlab/notebook/style/index.css';
import '../css/application-base.css'
import '../css/notebooks.css';
import '../css/theme-light-extension-index.css';
import '../css/ui-components-base.css';

import { PageConfig } from '@jupyterlab/coreutils';
import { CommandRegistry } from '@lumino/commands';
import { Widget} from '@lumino/widgets';
import { ServiceManager, ServerConnection } from '@jupyterlab/services';
import { MathJaxTypesetter } from '@jupyterlab/mathjax2';
import { NotebookPanel, NotebookWidgetFactory, NotebookModelFactory } from '@jupyterlab/notebook';
import { CompleterModel, Completer, CompletionHandler, KernelConnector } from '@jupyterlab/completer';
import { editorServices } from '@jupyterlab/codemirror';
import { DocumentManager } from '@jupyterlab/docmanager';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { RenderMimeRegistry, standardRendererFactories as initialFactories } from '@jupyterlab/rendermime';
import { SetupCommands } from './commands';


//description: Opens Notebook
//input: string notebookPath
export function open(notebookPath) {
    const settings = {
        baseUrl: grok.settings.jupyterNotebook,
        wsUrl: 'ws://localhost:8889', // TODO: ?
        token: grok.settings.jupyterNotebookToken,
        appUrl: '/',
        mathjaxUrl: 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js',
        mathjaxConfig: 'TeX-AMS_CHTML-full,Safe'
    };

    for (let key in settings)
          PageConfig.setOption(key, settings[key]);

    let _settings = ServerConnection.defaultSettings;

    _settings.baseUrl = PageConfig.getBaseUrl();
    _settings.appUrl = PageConfig.getOption('appUrl');
    _settings.wsUrl = PageConfig.getWsUrl();
    _settings.token = PageConfig.getToken();

    const manager = new ServiceManager({ serverSettings: _settings });

    void manager.ready.then(() => {
        // Initialize the command registry with the bindings.
        const commands = new CommandRegistry();
        const useCapture = true;

        // Setup the keydown listener for the document.
        document.addEventListener(
            'keydown',
            event => {
                commands.processKeydownEvent(event);
            },
            useCapture
        );

        const renderMime = new RenderMimeRegistry({
            initialFactories: initialFactories,
            latexTypesetter: new MathJaxTypesetter({
                url: PageConfig.getOption('mathjaxUrl'),
                config: PageConfig.getOption('mathjaxConfig')
            })
        });

        const opener = { open: (widget) => {} };
        const docRegistry = new DocumentRegistry();
        const docManager = new DocumentManager({ registry: docRegistry, manager, opener });
        const mFactory = new NotebookModelFactory({});
        const editorFactory = editorServices.factoryService.newInlineEditor;
        const contentFactory = new NotebookPanel.ContentFactory({ editorFactory });

        const wFactory = new NotebookWidgetFactory({
            name: 'Notebook',
            modelName: 'notebook',
            fileTypes: ['notebook'],
            defaultFor: ['notebook'],
            preferKernel: true,
            canStartKernel: true,
            renderMime,
            contentFactory,
            mimeTypeService: editorServices.mimeTypeService
        });
        docRegistry.addModelFactory(mFactory);
        docRegistry.addWidgetFactory(wFactory);

        const nbWidget = docManager.open(notebookPath);

        const editor = nbWidget.content.activeCell && nbWidget.content.activeCell.editor;
        const model = new CompleterModel();
        const completer = new Completer({ editor, model });
        const sessionContext = nbWidget.context.sessionContext;
        const connector = new KernelConnector({ session: sessionContext.session });
        const handler = new CompletionHandler({ completer, connector });

        void sessionContext.ready.then(() => {
            handler.connector = new KernelConnector({ session: sessionContext.session });
        });

        handler.editor = editor;

        nbWidget.content.activeCellChanged.connect((sender, cell) => {
            handler.editor = cell !== null ? cell.editor : null;
        });

        completer.hide();

        let view = DG.View.create();
        view.name = 'Notebook';
        grok.shell.addView(view);

        Widget.attach(nbWidget, view.root);
        Widget.attach(completer, view.root);

        // TODO: Check this
        ui.tools.handleResize(view.root, (w, h) => nbWidget.update());

        view.root.classList.add('grok-notebook-view');

        SetupCommands(commands, nbWidget, handler);
    });
}
