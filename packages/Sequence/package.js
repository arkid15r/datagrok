class SequencePackage extends DG.Package {

    //description: Returns a string containing the Amino Acid sequence represented by the nucleotide sequence
    //tags: converter
    //input: string nucleotides {semType: nucleotides}
    //output: string aminoacids {semType: aminoacids}
    nucleotidesToAminoacids(nucleotides) {
      let seq = new Nt.Seq();
      seq.read(nucleotides);
      return seq.translate();
    }


    toFasta(sequences, labels) {
        var result = '';
        for (var i = 0; i < sequences.length; i++) {
            let label = labels === null ? `seq${i}` : labels[i];
            result += `>${label}\n${sequences[i]}\n`;
        }
        return result;
    }

    //description: returns complementary sequence
    //input: string nucleotides {semType: nucleotides}
    //output: string result {semType: nucleotides}
    complement(nucleotides) {
        let seq = new Nt.Seq();
        seq.read(nucleotides);
        return seq.complement().sequence();
    }


    //description: returns a sequence widget
    //input: string nucleotides {semType: nucleotides}
    //tags: panel
    //output: widget result
    sequenceWidget(nucleotides) {
        let e = document.createElement('DIV');
        e.id = 'sq77';
        let aa = this.nucleotidesToAminoacids(nucleotides);

        setTimeout(function() {
            new FeatureViewer(aa,
                '#sq77',
                {
                    showAxis: true,
                    showSequence: true,
                    brushActive: true, //zoom
                    toolbar: true, //current zoom & mouse position
                    bubbleHelp: true,
                    zoomMax: 50 //define the maximum range of the zoom
                });
        }, 1000);

        return new ui.Widget(e);
    }

    //description: Protein viewer widget based on the pdb_id
    //input: string pdbId {semType: pdb_id}
    //tags: panel
    //output: widget result
    pdbWidget(pdbId) {
        let e = ui.div([], 'd4-ngl-viewer');
        e.id = 'pdb77';
        e.style.height = '500px';
        e.style.width = '500px';

        setTimeout(function() {
            let stage = new NGL.Stage('pdb77', { backgroundColor: 'white' });
            stage.loadFile(`rcsb://${pdbId}`, { defaultRepresentation: true });
        }, 1000);

        return new ui.Widget(e);
    }

    //name: Sequence
    //description: creates a sequence viewer
    //tags: viewer
    //output: viewer result
    sequenceViewer() {
        return new SequenceViewer();
    }

    //name: SeqDemo
    //description: creates a sequence viewer
    //tags: viewer
    //output: viewer result
    seqDemoViewer() {
        return new SeqDemoViewer();
    }

    //input: string content
    //output: list tables
    //tags: file-handler
    //meta.ext: fasta
    fastaFileHandler(content) {
        let regex = /^>(.*)$/gm;
        let match;
        let descriptions = [];
        let sequences = [];
        let index = 0;
        while (match = regex.exec(content)) {
            descriptions.push(content.substring(match.index + 1, regex.lastIndex));
            if (index !== 0)
                sequences.push(content.substring(index, regex.lastIndex));
            index = regex.lastIndex + 1;
        }
        sequences.push(content.substring(index));
        return [DG.DataFrame.fromColumns([
            DG.Column.fromStrings('description', descriptions).d,
            DG.Column.fromStrings('sequence', sequences).d
        ]).d];
    }
}

_seq = new SequencePackage(null);

class SequenceViewer extends grok.JsViewer {
    onFrameAttached(dataFrameHandle) {
        this.dataFrame = new DG.DataFrame(dataFrameHandle);
        let seqCol = this.dataFrame.columns.toList().find((c) => c.semType == 'nucleotides');
        let fasta = _seq.toFasta(Array.from(seqCol.values()), null);
        let seqs = msa.io.fasta.parse(fasta);

        this.msa = msa({
            el: this.root,
            seqs: seqs
        });
        this.msa.render();

        this.dataFrame.selection.onChanged(() => this.render());
        this.dataFrame.filter.onChanged(() => this.render());
        this.render();
    }

    // reflect changes made to filter/selection
    render() { }
}


// This viewer does the following:
// * defines two properties, "question" and "answer". Properties are persistable and editable.
// * listens to changes in properties, attached table's selection and filter, and updates accordingly.
class SeqDemoViewer extends grok.JsViewer {

    constructor() {
        super();

        this.question = this.string('question', 'life');
        this.answer = this.int('answer', 42);
    }


    onFrameAttached(dataFrameHandle) {
        this.dataFrame = new DG.DataFrame(dataFrameHandle);
        this.dataFrame.selection.onChanged(() => this.render());
        this.dataFrame.filter.onChanged(() => this.render());

        this.render();
    }

    render() {

        this.root.innerHTML =
            `${this.dataFrame.toString()}<br>
            Question: ${this.question}<br>
            Answer: ${this.answer}<br>
            Selected: ${this.dataFrame.selection.trueCount}<br>
            Filtered: ${this.dataFrame.filter.trueCount}`;
    }
}