import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as Circos from 'circos';
import * as d3 from 'd3';
import {layoutConf, chordConf} from './configuration.js';


export class ChordViewer extends DG.JsViewer {

  constructor() {
    super();

    // Properties
    this.fromColumnName = this.string('fromColumnName');
    this.toColumnName = this.string('toColumnName');
    this.aggType = this.string('aggType', 'avg');
    this.getProperty('aggType').choices = ['count', 'values', 'unique', 'nulls', 'min', 'max',
      'sum', 'med', 'avg', 'stdev', 'variance', 'skew',
      'kurt', 'q1', 'q2', 'q3'];

    this.initialized = false;
    this.numColumns = [];
    this.strColumns = [];
    this.fromCol;
    this.toCol;
    this.data = [];
    this.conf = layoutConf;
    this.chords = [];
    this.chordConf = chordConf;
  }

  init() {
    this.initialized = true;
  }

  testColumns() {
    return (this.strColumns.length >= 2 && this.numColumns.length >= 1);
  }

  onTableAttached() {
    this.init();

    let columns = this.dataFrame.columns.toList();
    this.strColumns = columns.filter(col => col.type === 'string');
    this.numColumns = columns.filter(col => ['double', 'int'].includes(col.type));

    // TODO: Choose the most relevant columns
    if (this.testColumns()) {
      this.fromColumnName = this.strColumns[0].name;
      this.toColumnName = this.strColumns[1].name;
      this.generateData();
    }

    this.subs.push(DG.debounce(this.dataFrame.selection.onChanged, 50).subscribe((_) => this.render()));
    this.subs.push(DG.debounce(this.dataFrame.filter.onChanged, 50).subscribe((_) => this.render()));
    this.subs.push(DG.debounce(this.onSizeChanged, 50).subscribe((_) => this.render()));

    this.render();
  }

  onPropertyChanged(property) {
    super.onPropertyChanged(property);
    if (this.initialized && this.testColumns()) {
      this.generateData();
      this.render();
    }
  }

  detach() {
    this.subs.forEach((sub) => sub.unsubscribe());
  }

  generateData() {

    this.fromColumn = this.dataFrame.getCol(this.fromColumnName);
    this.toColumn = this.dataFrame.getCol(this.toColumnName);
    this.conf.events = {
      mouseover: ((datum, index, nodes, event) => {
        ui.tooltip.showRowGroup(this.dataFrame, i => {
          return this.fromColumn.get(i) === datum.id ||
            this.toColumn.get(i) === datum.id;
        }, event.x, event.y);
      }).bind(ChordViewer),
      mouseout: () => ui.tooltip.hide(),
      mousedown: ((datum, index, nodes, event) => {
        this.dataFrame.selection.handleClick(i => {
          return this.fromColumn.get(i) === datum.id ||
            this.toColumn.get(i) === datum.id;
        }, event);
      }).bind(ChordViewer)
    };

    // For now, applies the aggregation function to the first numeric column
    this.aggregatedTable = this.dataFrame
      .groupBy([this.fromColumnName, this.toColumnName])
      .add(this.aggType, this.numColumns[0].name, 'result')
      .aggregate();

    this.fromCol = this.aggregatedTable.getCol(this.fromColumnName);
    this.toCol = this.aggregatedTable.getCol(this.toColumnName);
    this.freqMap = {};

    this.fromCol.toList().forEach(k => this.freqMap[k] = (this.freqMap[k] || 0) + 1);
    this.toCol.toList().forEach(k => this.freqMap[k] = (this.freqMap[k] || 0) + 1);
    this.data = Array.from(new Set(this.fromCol.categories.concat(this.toCol.categories)))
      .sort((a, b) => this.freqMap[b] - this.freqMap[a])
      .map(s => {
        return {
          id: s,
          label: s,
          len: this.freqMap[s],
          color: "#80b1d3"
        }
      });
  }

  computeChords() {
    this.chords = [];
    let source = this.fromCol.getRawData();
    let fromCatList = this.fromCol.categories;
    let target = this.toCol.getRawData();
    let toCatList = this.toCol.categories;
    let aggVal = this.aggregatedTable.getCol('result').getRawData();
    let rowCount = this.aggregatedTable.rowCount;

    for (let i = 0; i < rowCount; i++) {
      let sourceId = fromCatList[source[i]];
      let targetId = toCatList[target[i]];
      let sourceBlock = this.data.find(obj => obj.id === sourceId);
      let targetBlock = this.data.find(obj => obj.id === targetId);
      let sourceCenter = (sourceBlock.end - sourceBlock.start) / 2;
      let targetCenter = (targetBlock.end - targetBlock.start) / 2;

      this.chords.push({
        source: {
          id: sourceId,
          start: (sourceBlock.end - sourceBlock.start) / 4,
          end: (sourceBlock.len - sourceCenter / 2) / 2
        },
        target: {
          id: targetId,
          start: (targetBlock.len - targetCenter / 2) / 2,
          end: targetBlock.len
        },
        value: aggVal[i]
      });
    }

    this.chordConf.events = {
      mouseover: ((datum, index, nodes, event) => {
        ui.tooltip.showRowGroup(this.dataFrame, i => {
          return this.fromColumn.get(i) === datum.source.id &&
            this.toColumn.get(i) === datum.target.id;
        }, event.x, event.y);
      }).bind(ChordViewer),
      mouseout: () => ui.tooltip.hide(),
      mousedown: ((datum, index, nodes, event) => {
        this.dataFrame.selection.handleClick(i => {
          return this.fromColumn.get(i) === datum.source.id &&
            this.toColumn.get(i) === datum.target.id;
        }, event);
      }).bind(ChordViewer)
    };

  }

  render() {

    if (!this.testColumns()) {
      this.root.innerText = "Not enough data to produce the result.";
      return;
    }

    $(this.root).empty();
    let width = this.root.parentElement.clientWidth;
    let height = this.root.parentElement.clientHeight;
    let size = Math.min(width, height);

    d3.select(this.root)
      .append("div")
      .attr('id', 'chart')
      .attr('class', 'chord-diagram-container')
      .attr('width', size)
      .attr('height', size);

    let circos = Circos({
      container: '#chart',
      width: size,
      height: size
    });

    circos.layout(this.data, this.conf);
    this.computeChords();
    circos.chords('beta-track', this.chords, this.chordConf);
    circos.render();
    document.getElementById('chart')
      .children[0].children[0]
      .setAttribute('viewBox', `${-width / 2} ${-height / 2} ${size * 2} ${size * 2}`);
  }
}
