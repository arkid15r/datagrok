import {Func, Property} from "../entities";
import {toJs} from "../wrappers";
import {Context, FuncCall, FuncCallParam} from "../functions";
import * as ui from "../../ui";
import {Viewer} from "../viewer";
import {TabControl} from "../widgets";
import {div, splitH} from "../../ui";
import {DataFrame} from "../dataframe";
import {View, ViewBase} from "./view";
import {TYPE} from "../const";
import wu from "wu";


let api = <any>window;

export class FunctionView extends ViewBase {
  constructor(func: Func) {
    super();
    this.func = func;
    this.context = Context.create();
    this.controlsRoot.style.maxWidth = '370px';
    this.box = true;
    this._setFunction(undefined).then(r => {});
  }
  public func: Func;
  private readonly context: Context;


  async _setFunction(call: FuncCall | undefined) {

    /*
      var meta = EntityMeta.forEntity(f);
      func = await meta.refresh(f);
    */
    if (call != undefined) {
      /*  if (call.validateParameterValues().isEmpty)
          runFunc(call).then((_) => call.reset());
        _callPath = '/${call.toUri()}';
        Routing.setPath(this.path, f.name, true);*/
    }

    call ??= this.func.prepare();
    call.aux['view'] = this;
    call.context = this.context;

    this.singleDfParam = wu(this.func.outputs).filter((p) => p.propertyType == TYPE.DATA_FRAME).toArray().length == 1;
    //singleDfParam = call.params.where((p) => p.param.propertyType == Types.DATA_FRAME).length == 1;
    let runSection = this.renderRunSection(call);
    //var fullRunSection = div();

    let funcDiv = div([runSection], 'ui-div');
    //var fullDiv = div('ui-panel', [getFullSection(func, call, fullRunSection)]);
    //htmlSetDisplay(fullDiv, false);

    /* for (var inParam in call.inputParams.where((p) => p.param.propertyType == Types.DATA_FRAME && p.param.options['viewer'] != null)) {
       showInputs = true;
       subs.add(inParam.onChanged.listen((param) async {
         print('param Changed: ${param.param.name}, ${param.value}');
         clearResults(showOutput: false, call: call);
         processOutputParam(param);

         appendResultDataFrame(
           param.value,
           height: (singleDfParam && !presentationMode) ? 600 : 400,
           category: 'Input',
           param: param);
       }));
     }*/

    this.controlsRoot.innerHTML = '';
    this.controlsRoot.appendChild(funcDiv);
    //this.controlsRoot.appendChild(fullDiv);

    /*advancedModeSwitch.onChanged.listen((_) {
      if (advancedModeSwitch.value)
        fullRunSection.append(runSection);
      else
        funcDiv.append(runSection);
      htmlSetDisplay(fullDiv, advancedModeSwitch.value);
      htmlSetDisplay(funcDiv, !advancedModeSwitch.value);
    });*/
    //setRibbon();

    this.root.appendChild(splitH([this.controlsRoot, this.resultsRoot], ));
   /* this.root.appendChild(div('ui-split-h,ui-box', [div('ui-box', [controlsRoot])
      ..style.maxWidth = '370px', div('ui-box', [resultsRoot])]));
    Routing.setPath(this.path, f.name, true);
    */
    this.resultsRoot.innerHTML = '';
    this.resultsRoot.appendChild(this.resultsDiv);
    this.name = this.func.friendlyName;
  }


  renderRunSection(call: FuncCall): HTMLElement {


    return ui.wait(async () => {
      let runButton = ui.bigButton('Run', async () => {
        call.aux['view'] = this.dart;
        await call.call(true, undefined, {processed: true});
        console.log(call);
        for (let [name, p] of call.outputParams) {
          console.log(p);
          p.processOutput();

          if (p.property.propertyType == TYPE.DATA_FRAME) {
            console.log('add df');
          this.appendResultDataFrame(
            p.value, p, { caption: p.property.name, category: p.property.category});
          }
        }

       // console.log(call.func.outputs[0].get(call));
      })
      let editor: HTMLDivElement = await call.getEditor(true);
      editor.appendChild(ui.buttonsInput([runButton]));
      return editor;
    });
  }

  singleDfParam: boolean = false;
  paramViewers: Map<string, Viewer[]> = new Map();
  resultsTabControl: TabControl | undefined;
  resultTabs: Map<String, HTMLElement> = new Map();
  resultsDiv: HTMLElement = div([],'ui-panel,grok-func-results');
  controlsRoot: HTMLDivElement = div([], 'ui-box');
  resultsRoot: HTMLDivElement = div([], 'ui-box');

  appendResultDataFrame(df: DataFrame, param: FuncCallParam, options?: { caption: string, category: string }) {

    let caption = options?.caption;
    let viewers: Viewer[] = param.aux['viewers'] ?? [];
    caption ??= param.aux['viewerTitle'] ?? ((this.singleDfParam && viewers.length == 1) ? '' : param.property.caption) ?? '';
    let existingViewers: Viewer[] | undefined = this.paramViewers.get(param.name);
    if (existingViewers != null) {
      for (let v of existingViewers) {
        v.dataFrame = df;
      }
      return;
    }
    existingViewers ??= [];
    this.paramViewers.set(param.name, existingViewers);
    if (viewers.length == 0)
      viewers.push(df.plot.grid());

    let hideList: HTMLElement[] = [];
    let blocks: number = 0;
    let blockSize: number = 0;
    let gridWrapper = div([], 'ui-div,ui-block');

    console.log(viewers);
    /*  var gridSwitch = !viewers?.any((v) => v
      is
      GridCore
    )
      ;
      htmlSetDisplay(gridWrapper, false);
      DivElement
      getHeader(bool
      sw
    )
      {
        var s = caption ?? df.name ?? '';
        var header = div('grok-func-results-header', []);
        if (s.isNotEmpty) {
          var h = ui.h1(s);
          tooltip.setOn(h, () => s);
          header.append(h);
        }
        if (gridSwitch) {
          var icon = Icons.svg('table', (e)
          {
            e.stopPropagation();
            htmlSetDisplayAll(hideList, !sw);
            htmlSetDisplay(gridWrapper, sw);
            gridWrapper.classes.add('ui-block-$blockSize');
          }
        ,
          'Show grid'
        ).
          root;
          if (!sw)
            icon.classes.add('active');
          header.append(icon);
        }
        if (!xp.tables.contains(df))
          header.append(Icons.plus((e)
        {
          e.stopPropagation();
          var v = addDataFrame(df, forcedByUser
        :
          true
        )
          ;
          print(v);
          for (var viewer in viewers) {
            if (viewer is!
            GridCore
          )
            {
              var newViewer = ViewerDescriptor.byType(viewer.descriptor.name)
                .init(
                  df, look
            :
              viewer.look
            )
              ;
              v.addViewer(newViewer);
            }
          }
        }
      ,
        'Add to workspace'
      ).
        root
      )
        ;
        return header;
      }

      if (gridSwitch) {
        gridWrapper.append(getHeader(false));
        var grid = new GridCore.grid()
          ..dataFrame = df;
        grid.root.style.height = '${height}px';
        gridWrapper.append(grid.root);
        existingViewers.add(grid);
      }
      */
    /*
        let header = getHeader(true);
        _appendResultElement(gridWrapper, category, param)
        ;
    */
    let header = ui.span([caption]);
    for (let viewer of viewers) {
      existingViewers.push(viewer);
      let block = viewer.tags['.block-size'] ?? 100;
      let wrapper = div([], `ui-div,ui-block,ui-block-${block}`);
      if (blocks + block <= 100) {
        hideList.push(wrapper);
        blockSize += block;
      }
      blocks += block;
      wrapper.appendChild(header);
      header = div([], 'grok-func-results-header');
      wrapper.appendChild(viewer.root);
      let height = 400;
      /*        if (viewer.type == 'grid')
              {
                // @ts-ignore
                let totalHeight = viewer.getOptions()['rowHeight'] *
                  (viewer.dataFrame.rowCount + 1);
                if (totalHeight < height)
                  height = totalHeight;
              }*/
      viewer.root.style.height = `${height}px`;
      this._appendResultElement(wrapper, options?.category);
      console.log('add viewer');
    }

  }

  _appendResultElement(d: HTMLElement, category?: string) {
    console.log('element');
   // if (category != null && this.resultsTabControl != null && this.resultTabs.get(category) != null)
   //   this.resultTabs.get(category)!.appendChild(d);
   // else
      this.resultsDiv.appendChild(d);
  }

}
