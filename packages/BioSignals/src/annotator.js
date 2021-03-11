/* Do not change these import lines. Datagrok will import API library in exactly the same manner */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from "datagrok-api/dg";

import * as echarts from 'echarts';

export class Annotator extends DG.JsViewer {
    constructor() {
        super();

        let chartDiv = ui.div(null, { style: { position: 'absolute', left: '0', right: '0', top: '0', bottom: '0'}} );
        this.root.appendChild(chartDiv);
        this.chart = echarts.init(chartDiv);
        this.subs.push(ui.onSizeChanged(chartDiv).subscribe((_) => this.chart.resize()));
    }

    onTableAttached() {
        let columnToPlot = this.dataFrame.columns.byName('testEcg');
        let base = +new Date();
        let samplingPeriod = 24 * 3600 * 1000;

        let data = new Array(columnToPlot.length);
        for (let i = 0; i < columnToPlot.length; i++) {
            let now = new Date(base += samplingPeriod);
            data[i] = [
                [now.getFullYear(), now.getMonth() + 1, now.getDate()].join('/'),
                columnToPlot.get(i)
            ];
        }

        let option = {
            tooltip: {
                trigger: 'axis',
                position: function (pt) {
                    return [pt[0], '10%'];
                }
            },
            title: {
                left: 'center',
                text: 'Input signal',
            },
            toolbox: {
                feature: {
                    dataZoom: {
                        yAxisIndex: 'none'
                    },
                    restore: {},
                    saveAsImage: {}
                }
            },
            xAxis: {
                type: 'time',
                boundaryGap: false
            },
            yAxis: {
                type: 'value',
                boundaryGap: [0, '100%']
            },
            dataZoom: [
                {
                    type: 'inside',
                    start: 0,
                    end: 10
                },
                {
                    start: 0,
                    end: 10
                }
            ],
            series: [
                {
                    type: 'line',
                    symbol: 'none',
                    data: data
                }
            ]
        };

        this.chart.setOption(option);
    }
}