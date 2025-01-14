import * as grok from 'datagrok-api/grok';
import * as DG from "datagrok-api/dg";
import * as ui from "datagrok-api/ui";
import { study } from "../clinical-study";
import { addDataFromDmDomain } from '../data-preparation/utils';
import { ETHNIC, RACE, SEX, SUBJECT_ID } from '../constants/columns-constants';
import { ClinicalCaseViewBase } from '../model/ClinicalCaseViewBase';
import { TRT_ARM_FIELD, VIEWS_CONFIG } from '../views-config';
import { TIME_PROFILE_VIEW_NAME } from '../constants/view-names-constants';

export class TreeMapView extends ClinicalCaseViewBase {

    aeDataframeWithDm: DG.DataFrame
    dmFields: any;
    selectedSplitBy = '';
    treeMap: any;

    constructor(name) {
        super({});
        this.name = name;
    }

    createView(): void {
        this.dmFields = [VIEWS_CONFIG[TIME_PROFILE_VIEW_NAME][TRT_ARM_FIELD], SEX, RACE, ETHNIC].filter(it => study.domains.dm.columns.names().includes(it));
        this.aeDataframeWithDm = addDataFromDmDomain(study.domains.ae, study.domains.dm, study.domains.ae.columns.names(), this.dmFields);

        grok.data.linkTables(study.domains.dm, this.aeDataframeWithDm,
            [ SUBJECT_ID ], [ SUBJECT_ID ],
            [ DG.SYNC_TYPE.FILTER_TO_FILTER ]);

        this.treeMap = DG.Viewer.fromType(DG.VIEWER.TREE_MAP, this.aeDataframeWithDm, {
            "splitByColumnNames": [
                this.dmFields[0],
                ""
            ],
            "colorAggrType": "count"
          });
          this.root.className = 'grok-view ui-box';
          this.root.appendChild(this.treeMap.root);
    }
}