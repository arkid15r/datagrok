import * as grok from 'datagrok-api/grok';
import * as DG from "datagrok-api/dg";
import * as ui from "datagrok-api/ui";
import { study } from "../clinical-study";
import { addDataFromDmDomain, getMaxVisitName, getMinVisitName, getUniqueValues, getVisitNamesAndDays } from '../data-preparation/utils';
import { ETHNIC, RACE, SEX, TREATMENT_ARM } from '../constants';
import { labDynamicComparedToBaseline } from '../data-preparation/data-preparation';
import { ILazyLoading } from '../lazy-loading/lazy-loading';
import { checkDomainExists } from './utils';


export class TimeProfileView extends DG.ViewBase implements ILazyLoading {

    blVisitChoices: DG.InputBase;
    epVisitChoices: DG.InputBase;
    laboratoryDataFrame: DG.DataFrame;
    relativeChangeFromBlDataFrame: DG.DataFrame;
    uniqueLabValues: any;
    uniqueVisits: any;
    splitBy = [ TREATMENT_ARM, SEX, RACE, ETHNIC ];
    types = ['Values', 'Changes'];
    selectedLabValue: string;
    selectedType: string;
    bl: string;
    ep: string;
    visitNamesAndDays: any [];
    linechart: any;

    constructor(name) {
        super({});
        this.name = name;
        this.helpUrl = 'https://raw.githubusercontent.com/datagrok-ai/public/master/packages/ClinicalCase/views_help/time_profile.md';
    }

    loaded: boolean;

    load(): void {
        checkDomainExists(['dm', 'lb'], false, this);
     }

    createView(): void {
        this.uniqueLabValues = Array.from(getUniqueValues(study.domains.lb, 'LBTEST'));
        this.uniqueVisits = Array.from(getUniqueValues(study.domains.lb, 'VISIT'));
        this.selectedLabValue = this.uniqueLabValues[ 0 ] as string;
        this.selectedType = this.types[0];
        this.visitNamesAndDays = getVisitNamesAndDays(study.domains.lb);
        this.bl = this.visitNamesAndDays[0].name;
        this.ep = this.visitNamesAndDays[this.visitNamesAndDays.length-1].name;
        this.createLaboratoryDataframe();

        let typeChoices = ui.choiceInput('', this.selectedType, this.types);
        typeChoices.onChanged((v) => {
            this.selectedType = typeChoices.value;
            this.updateTimeProfile();
        });

        let labChoices = ui.choiceInput('', this.selectedLabValue, this.uniqueLabValues);
        labChoices.onChanged((v) => {
            this.selectedLabValue = labChoices.value;
            this.updateTimeProfile();
        });
        //@ts-ignore
        labChoices.input.style.width = '200px';

        this.blVisitChoices = ui.choiceInput('', this.bl, this.uniqueVisits);
        this.blVisitChoices.onChanged((v) => {
            this.bl = this.blVisitChoices.value;
            this.updateTimeProfile();
        });

        this.epVisitChoices = ui.choiceInput('', this.ep, this.uniqueVisits);
        this.epVisitChoices.onChanged((v) => {
            this.ep = this.epVisitChoices.value;
            this.updateTimeProfile();
        });

        this.root.className = 'grok-view ui-box';
        this.linechart = DG.Viewer.lineChart(this.laboratoryDataFrame, {
            splitColumnName: this.splitBy[0],
            xColumnName: 'VISITDY',
            yColumnNames: [`${this.selectedLabValue} avg(LBSTRESN)`],
            whiskersType: 'Med | Q1, Q3'
        });
        this.root.append(this.linechart.root);
        this.setRibbonPanels([
            [
                ui.span([ 'Plot ' ]),
                labChoices.root,
                typeChoices.root,
                ui.span([' from ']),
                this.blVisitChoices.root,
                ui.span([' to ']),
                this.epVisitChoices.root
            ]
        ]);
    }

    private updateTimeProfile() {
        switch (this.selectedType) {
            case 'Values': {
                this.createLaboratoryDataframe();
                this.linechart.dataFrame = this.laboratoryDataFrame;
                break;
            }
            case 'Changes': {
                this.createrelativeChangeFromBlDataframe();
                this.linechart.dataFrame = this.relativeChangeFromBlDataFrame;
                break;
            }
            default: {
                break;
            }
        }
    }

    private createLaboratoryDataframe() {
        let df = this.filterDataFrameByDays(study.domains.lb.clone());
        let dfWithArm = addDataFromDmDomain(df, study.domains.dm, [ 'USUBJID', 'VISITDY', 'VISIT', 'LBTEST', 'LBSTRESN' ], this.splitBy);
        this.laboratoryDataFrame = this.createPivotedDataframe(dfWithArm, 'LBSTRESN');
    }

    private createrelativeChangeFromBlDataframe(){
        let df = this.filterDataFrameByDays(study.domains.lb.clone());
        labDynamicComparedToBaseline(df,  this.bl, 'VISIT', 'LAB_DYNAMIC_BL', true);
        let dfWithArm = addDataFromDmDomain(df, study.domains.dm, [ 'USUBJID', 'VISITDY', 'VISIT', 'LBTEST', 'LBSTRESN' ], this.splitBy);
        this.relativeChangeFromBlDataFrame = this.createPivotedDataframe(dfWithArm, 'LBSTRESN');
    }

    private createPivotedDataframe(df: DG.DataFrame, aggregatedColName: string) {
        return df
            .groupBy([ 'USUBJID', 'VISITDY' ].concat(this.splitBy))
            .pivot('LBTEST')
            .avg(aggregatedColName)
            .aggregate();
    }

    private filterDataFrameByDays(df: DG.DataFrame){
        let blDay = this.visitNamesAndDays.find(it => it.name === this.bl).day;
        let epDay = this.visitNamesAndDays.find(it => it.name === this.ep).day;
        let filteredDf = df.groupBy(df.columns.names())
        .where(`VISITDY >= ${blDay} and VISITDY <= ${epDay} and LBTEST = ${this.selectedLabValue}`)
        .aggregate();
        return filteredDf;
    }

}