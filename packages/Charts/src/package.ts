import * as DG from 'datagrok-api/dg';

import {FlagCellRenderer} from './renderers/flag-cell-renderer';

import {TreeViewer} from './viewers/tree/tree-viewer';
import {SunburstViewer} from './viewers/sunburst/sunburst-viewer';
import {RadarViewer} from './viewers/radar/radar-viewer';
import {TimelinesViewer} from './viewers/timelines/timelines-viewer';
import {SankeyViewer} from './viewers/sankey/sankey';
import {ChordViewer} from './viewers/chord/chord-viewer';
import {WordCloudViewer} from './viewers/word-cloud/word-cloud-viewer';
import {GroupAnalysisViewer} from './viewers/group-analysis/group-analysis-viewer';
import {SurfacePlot} from './viewers/surface-plot/surface-plot';
import {GlobeViewer} from './viewers/globe/globe-viewer';

import {viewerDemo} from './demos/demo';


export const _package = new DG.Package();


//name: flagCellRenderer
//tags: cellRenderer
//meta-cell-renderer-sem-type: flag
//output: grid_cell_renderer result
export function flagCellRenderer() {
  return new FlagCellRenderer();
}


//name: ChordViewer
//description: Creates a chord viewer
//tags: viewer
//output: viewer result
export function _ChordViewer() {
  return new ChordViewer();
}

//name: GlobeViewer
//description: Creates a globe viewer
//tags: viewer
//output: viewer result
export function _GlobeViewer() {
  return new GlobeViewer();
}

//name: GroupAnalysisViewer
//description: Creates a group analysis viewer
//tags: viewer
//output: viewer result
export function _GroupAnalysisViewer() {
  return new GroupAnalysisViewer();
}

//name: RadarViewer
//description: Creates a radar viewer
//tags: viewer
//output: viewer result
export function _RadarViewer() {
  return new RadarViewer();
}

//name: SankeyViewer
//description: Creates a sankey viewer
//tags: viewer
//output: viewer result
export function _SankeyViewer() {
  return new SankeyViewer();
}

//name: SunburstViewer
//description: Creates a sunburst viewer
//tags: viewer
//output: viewer result
export function _SunburstViewer() {
  return new SunburstViewer();
}

//name: SurfacePlot
//description: Creates a surface plot viewer
//tags: viewer
//output: viewer result
export function _SurfacePlot() {
  return new SurfacePlot();
}

//name: TimelinesViewer
//description: Creates a timelines viewer
//tags: viewer
//output: viewer result
export function _TimelinesViewer() {
  return new TimelinesViewer();
}

//name: TreeViewer
//description: Creates a tree viewer
//tags: viewer
//meta.trellisable: true
//output: viewer result
export function _TreeViewer() {
  return new TreeViewer();
}

//name: WordCloudViewer
//description: Creates a word cloud viewer
//tags: viewer
//output: viewer result
export function _WordCloudViewer() {
  return new WordCloudViewer();
}


//name: chordViewerDemo
//meta.demoPath: Viewers | Chord
export function _chordViewerDemo() {
  viewerDemo('ChordViewer');
}

//name: globeViewerDemo
//meta.demoPath: Viewers | Globe
export function _globeViewerDemo() {
  viewerDemo('GlobeViewer');
}

//name: groupAnalysisViewerDemo
//meta.demoPath: Viewers | GroupAnalysis
export function _groupAnalysisViewerDemo() {
  viewerDemo('GroupAnalysisViewer');
}

//name: radarViewerDemo
//meta.demoPath: Viewers | Radar
export function _radarViewerDemo() {
  viewerDemo('RadarViewer');
}

//name: sankeyViewerDemo
//meta.demoPath: Viewers | Sankey
export function _sankeyViewerDemo() {
  viewerDemo('SankeyViewer');
}

//name: sunburstViewerDemo
//meta.demoPath: Viewers | Sunburst
export function _sunburstViewerDemo() {
  viewerDemo('SunburstViewer');
}

//name: surfacePlotDemo
//meta.demoPath: Viewers | SurfacePlot
export function _surfacePlotDemo() {
  viewerDemo('SurfacePlot');
}

//name: timelinesViewerDemo
//meta.demoPath: Viewers | Timelines
export function _timelinesViewerDemo() {
  viewerDemo('TimelinesViewer', {lineWidth: 4, markerPosition: 'above main line'});
}

//name: treeViewerDemo
//meta.demoPath: Viewers | Tree
export function _treeViewerDemo() {
  viewerDemo('TreeViewer');
}

//name: wordCloudViewerDemo
//meta.demoPath: Viewers | WordCloud
export function _wordCloudViewerDemo() {
  viewerDemo('WordCloudViewer');
}
