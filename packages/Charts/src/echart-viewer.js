import * as echarts from "echarts";

export class Utils {

  /** @param {DataFrame} dataFrame
   * @param {String[]} splitByColumnNames
   * @param {DG.BitSet} rowMask
   * @param {Function} visitNode
   * @returns {Object} */
  static toTree(dataFrame, splitByColumnNames, rowMask, visitNode = null) {
    let data = {
      name: 'All',
      children: []
    };

    let aggregated = dataFrame
      .groupBy(splitByColumnNames)
      .count()
      .whereRowMask(rowMask)
      .aggregate();
    let columns = aggregated.columns.byNames(splitByColumnNames);
    let parentNodes = columns.map(_ => null);

    for (let i = 0; i < aggregated.rowCount; i++) {
      let idx = i === 0 ? 0 : columns.findIndex((col) => col.get(i) !== col.get(i - 1));

      for (let colIdx = idx; colIdx < columns.length; colIdx++) {
        let parentNode = colIdx === 0 ? data : parentNodes[colIdx - 1];
        let node = { name: columns[colIdx].getString(i) };
        parentNodes[colIdx] = node;
        if (!parentNode.children)
          parentNode.children = [];
        parentNode.children.push(node);
        if (visitNode !== null)
          visitNode(node);
      }
    }

    return data;
  }

  static toForest(dataFrame, splitByColumnNames, rowMask) {
    let tree = Utils.toTree(dataFrame, splitByColumnNames, rowMask, (node) => node.value = 10);
    return tree.children;
  }
}


export class EChartViewer extends DG.JsViewer {
  constructor() {
    super();
    let chartDiv = ui.div(null, { style: { position: 'absolute', left: '0', right: '0', top: '0', bottom: '0'}} );
    this.root.appendChild(chartDiv);
    this.myChart = echarts.init(chartDiv);
    this.subs.push(ui.onSizeChanged(chartDiv).subscribe((_) => this.myChart.resize()));
  }

  initCommonProperties() {
    this.top = this.string('top', '5px');
    this.left = this.string('left', '5px');
    this.bottom = this.string('bottom', '5px');
    this.right = this.string('right', '5px');

    this.animationDuration = this.int('animationDuration', 500);
    this.animationDurationUpdate = this.int('animationDurationUpdate', 750);
  }

  onTableAttached() {
    this.subs.push(this.dataFrame.selection.onChanged.subscribe((_) => this.render()));
    this.subs.push(this.dataFrame.filter.onChanged.subscribe((_) => this.render()));

    this.render();
  }

  prepareOption() {}

  onPropertyChanged(p) {
    let properties = p !== null ? [p] : this.props.getProperties();

    for (let p of properties)
      this.option.series[0][p.name] = p.get(this);

    this.myChart.setOption(this.option);
  }

  render() {
    this.option.series[0].data = this.getSeriesData();
    this.myChart.setOption(this.option);
  }
}