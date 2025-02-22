/* Do not change these import lines. Datagrok will import API library in exactly the same manner */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import * as meta from './sdtm-meta';
import {study} from "./clinical-study";
import {StudySummaryView} from "./views/study-summary-view";
import {TimelinesView} from "./views/timelines-view";
import {PatientProfileView} from "./views/patient-profile-view";
import {AdverseEventsView} from "./views/adverse-events-view";
import {ValidationView} from './views/validation-view';
import {AdverseEventHandler} from './panels/adverse-event-handler';
import {LaboratoryView} from './views/laboratory-view';
import {AERiskAssessmentView} from './views/ae-risk-assessment-view';
import {SurvivalAnalysisView} from './views/survival-analysis-view';
import { BoxPlotsView } from './views/boxplots-view';
import { MatrixesView } from './views/matrixes-view';
import { TimeProfileView } from './views/time-profile-view';
import { STUDY_ID } from './constants/columns-constants';
import { TreeMapView } from './views/tree-map-view';
import { MedicalHistoryView } from './views/medical-history-view';
import { VisitsView } from './views/visits-view';
import { StudyConfigurationView } from './views/study-config-view';
import { ADVERSE_EVENTS_VIEW_NAME, AE_RISK_ASSESSMENT_VIEW_NAME, COHORT_VIEW_NAME, CORRELATIONS_VIEW_NAME, DISTRIBUTIONS_VIEW_NAME, LABORATORY_VIEW_NAME, MEDICAL_HISTORY_VIEW_NAME, PATIENT_PROFILE_VIEW_NAME, QUESTIONNAIRES_VIEW_NAME, STUDY_CONFIGURATIN_VIEW_NAME, SUMMARY_VIEW_NAME, SURVIVAL_ANALYSIS_VIEW_NAME, TIMELINES_VIEW_NAME, TIME_PROFILE_VIEW_NAME, TREE_MAP_VIEW_NAME, VALIDATION_VIEW_NAME, VISITS_VIEW_NAME } from './constants/view-names-constants';
import { VIEWS } from './constants/constants';
import { addView, createTableView, getTableViewsParams } from './utils/views-creation-utils';
import { CohortView } from './views/cohort-view';
import { QuestionnaiesView } from './views/questionnaires-view';

export let _package = new DG.Package();

export let validationRulesList = null;

let domains = Object.keys(study.domains).map(it => `${it.toLocaleLowerCase()}.csv`);
export let c: DG.FuncCall;


//name: Clinical Case
//tags: app
export async function clinicalCaseApp(): Promise<any> {
  c = grok.functions.getCurrentCall();
  validationRulesList = await grok.data.loadTable(`${_package.webRoot}tables/validation-rules.csv`);

  if (Object.keys(study.domains).every((name) => grok.shell.table(name) == null)) {
    let demoFiles = await grok.dapi.projects.filter('clin-demo-files-2').list();
    if (demoFiles.length) {
      await grok.dapi.projects.open('clin-demo-files-2');
    } else {
      grok.shell.warning('Please load SDTM data or demo files');
    }
  }

  study.initFromWorkspace();

  VIEWS.push(<StudySummaryView>addView(new StudySummaryView(SUMMARY_VIEW_NAME)));
  VIEWS.push(<VisitsView>addView(new VisitsView(VISITS_VIEW_NAME)));
  VIEWS.push(<CohortView>addView(new CohortView(COHORT_VIEW_NAME)));
  VIEWS.push(<TimelinesView>addView(new TimelinesView(TIMELINES_VIEW_NAME)));
  VIEWS.push(<PatientProfileView>addView(new PatientProfileView(PATIENT_PROFILE_VIEW_NAME)));
  VIEWS.push(<AdverseEventsView>addView(new AdverseEventsView(ADVERSE_EVENTS_VIEW_NAME)));
  VIEWS.push(<LaboratoryView>addView(new LaboratoryView(LABORATORY_VIEW_NAME)));
  VIEWS.push(<AERiskAssessmentView>addView(new AERiskAssessmentView(AE_RISK_ASSESSMENT_VIEW_NAME)));
  VIEWS.push(<SurvivalAnalysisView>addView(new SurvivalAnalysisView(SURVIVAL_ANALYSIS_VIEW_NAME)));
  VIEWS.push(<BoxPlotsView>addView(new BoxPlotsView(DISTRIBUTIONS_VIEW_NAME)));
  VIEWS.push(<MatrixesView>addView(new MatrixesView(CORRELATIONS_VIEW_NAME)));
  VIEWS.push(<TimeProfileView>addView(new TimeProfileView(TIME_PROFILE_VIEW_NAME)));
  VIEWS.push(<TreeMapView>addView(new TreeMapView(TREE_MAP_VIEW_NAME)));
  VIEWS.push(<MedicalHistoryView>addView(new MedicalHistoryView(MEDICAL_HISTORY_VIEW_NAME)));
  VIEWS.push(<QuestionnaiesView>addView(new QuestionnaiesView(QUESTIONNAIRES_VIEW_NAME)));

  const tableViewHelpers = {};
  const tableViewsParams = getTableViewsParams();

  Object.keys(tableViewsParams).forEach(it => {
    const tableView = createTableView(
      tableViewsParams[it].domainsAndColsToCheck,
      it,
      tableViewsParams[it].helpUrl,
      tableViewsParams[it].createViewHelper,
      tableViewsParams[it].paramsForHelper,
    );
    VIEWS.push(addView(tableView.view));
    tableViewHelpers[it] = tableView.helper;
  });

  DG.ObjectHandler.register(new AdverseEventHandler());

  let summary = VIEWS.find(it => it.name === SUMMARY_VIEW_NAME);
  summary.load();
  let valView = addView(new ValidationView(summary.errorsByDomain, VALIDATION_VIEW_NAME));
  summary.validationView = valView;
  VIEWS.push(valView);

  VIEWS.push(<StudyConfigurationView>addView(new StudyConfigurationView(STUDY_CONFIGURATIN_VIEW_NAME)));

  setTimeout(() => {
    grok.shell.v = summary;
  }, 1000);

  let setObj = async (obj) => {
    grok.shell.o = await obj.propertyPanel();
  }

  grok.events.onCurrentViewChanged.subscribe((v) => {
    setTimeout(() => {
      let obj = VIEWS.find(it => it.name === grok.shell.v.name);
      if (obj) {
        if (obj.hasOwnProperty('loaded') && !obj.loaded) {
          obj.load();
        }
        if (obj.loaded) {
          setObj(obj);
          if (obj.filterChanged) {
            obj.updateGlobalFilter();
            this.filterChanged = false;
          }
        }
      }
    }, 100)
  });

  if (study.domains.dm) {
    const updateFilterProperty = (obj) => {
      if (obj.name === grok.shell.v.name){
        setTimeout(() => {
          obj.updateGlobalFilter();
        })
      }
      obj.filterChanged = true;
    }
    study.domains.dm.onFilterChanged.subscribe(()=> {
      VIEWS.forEach(it => {
        if (it.hasOwnProperty('filterChanged')) {
          updateFilterProperty(it);
        } else {
          if (tableViewHelpers[it.name].updateGlobalFilter !== undefined) {
            updateFilterProperty(tableViewHelpers[it.name]);
          }
        }
      })
    });
  }
}


//tags: folderViewer
//input: file folder
//input: list<file> files
//output: widget
export async function clinicalCaseFolderLauncher(folder: DG.FileInfo, files: DG.FileInfo[]): Promise<DG.Widget | undefined> {
  if (files.some((f) => f.fileName.toLowerCase() === 'dm.csv')) {
    let res = await grok.dapi.files.readAsText(`${folder.fullPath}/dm.csv`);
    let table = DG.DataFrame.fromCsv(res);
    let studyId = table.columns.names().includes(STUDY_ID) ? table.get(STUDY_ID, 0) : 'undefined';
    return DG.Widget.fromRoot(ui.div([
      ui.panel([
        ui.divText('Folder contains SDTM data'),
        ui.divText(`Study ID: ${studyId}`)]),
      ui.button('Run ClinicalCase', async () => {
        await Promise.all(files.map(async (file) => {
          if(domains.includes(file.fileName.toLowerCase())){
            const df = await grok.data.files.openTable(`${folder.fullPath}/${file.fileName.toLowerCase()}`);
            grok.shell.addTableView(df);
          }
        }));
        grok.functions.call("Clinicalcase:clinicalCaseApp");
      })
    ]));
  }
}


