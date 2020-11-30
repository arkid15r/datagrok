import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as Circos from 'circos';
import * as d3 from 'd3';
import { layoutConf, chordConf } from './configuration.js';


export class ChordViewer extends DG.JsViewer {

    constructor() {
        super();

        // properties
        this.fromColumnName = this.string('fromColumnName');
        this.toColumnName = this.string('toColumnName');

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
        if (this.testColumns()) this.generateData(this.strColumns[0].name, this.strColumns[1].name);

        this.subs.push(DG.debounce(this.dataFrame.selection.onChanged, 50).subscribe((_) => this.render()));
        this.subs.push(DG.debounce(this.dataFrame.filter.onChanged, 50).subscribe((_) => this.render()));
        this.subs.push(DG.debounce(this.onSizeChanged, 50).subscribe((_) => this.render()));

        this.render();
    }

    onPropertyChanged(property) {
        super.onPropertyChanged(property);
        if (this.initialized && this.testColumns()) {
            if (property.name === 'fromColumnName') {
                this.generateData(property.get(), this.toColumnName);
            }
            if (property.name === 'toColumnName') {
                this.generateData(this.fromColumnName, property.get());
            }
            this.render();
        }
    }

    detach() {
        this.subs.forEach((sub) => sub.unsubscribe());
    }

    generateData(fromColumnName, toColumnName) {
        
        this.fromColumnName = fromColumnName;
        this.toColumnName = toColumnName;

        this.aggregatedTable = this.dataFrame
            .groupBy([this.fromColumnName, this.toColumnName])
            .count('count')
            .aggregate();

        this.fromCol = this.aggregatedTable.getCol(this.fromColumnName);
        this.toCol = this.aggregatedTable.getCol(this.toColumnName);
        this.freqMap = {};

        this.fromCol.toList().forEach(k => this.freqMap[k] = (this.freqMap[k] || 0) + 1);
        this.toCol.toList().forEach(k => this.freqMap[k] = (this.freqMap[k] || 0) + 1);
        this.data = Array.from(new Set(this.fromCol.categories.concat(this.toCol.categories)))
                         .sort((a, b) => this.freqMap[b] - this.freqMap[a])
                         .map(s => { return {
                             id: s,
                             label: s,
                             len: this.freqMap[s],
                             color: "#80b1d3"
                         }});
    }

    computeChords() {

        for (let i = 0; i < this.aggregatedTable.rowCount; i++) {
            let sourceId = this.fromCol.get(i);
            let targetId = this.toCol.get(i);
            let count = this.aggregatedTable.getCol('count').get(i);
            let sourceBlock = this.data.find(obj => obj.id === sourceId);
            let targetBlock = this.data.find(obj => obj.id === targetId);
            let sourceCenter = (sourceBlock.end - sourceBlock.start) / 2;
            let targetCenter = (targetBlock.end - targetBlock.start) / 2;

            // TODO: Calculate `start` and `end` based on numColumns
            this.chords.push({
                source: {
                    id: sourceId,
                    start: sourceCenter - (sourceCenter / 2),
                    end: sourceCenter + (sourceCenter / 2)
                },
                target: {
                    id: targetId,
                    start: targetCenter - (targetCenter / 2),
                    end: targetCenter + (targetCenter / 2)
                },
                value: count
            });
        }

    }

    render() {

        if (!this.testColumns()) {
            this.root.innerText = "Not enough data to produce the result.";
            return;
        }

        this.root.classList.add('viewer-window');
        $(this.root).empty();
        let width = this.root.clientWidth;
        let height = this.root.clientHeight;
        let size = Math.min(width, height);
        let svg = d3.select(this.root)
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
                .setAttribute('viewBox', `${-width/2} ${-height/2} ${size*2} ${size*2}`);
    }
}
