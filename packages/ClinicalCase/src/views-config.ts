import { ACT_TRT_ARM, AE_END_DAY, AE_START_DATE, AE_START_DAY, AE_TERM, CON_MED_END_DAY, CON_MED_START_DAY, CON_MED_TRT, INV_DRUG_END_DAY, INV_DRUG_NAME, INV_DRUG_START_DAY, MH_TERM } from "./constants/columns-constants";
import { ADVERSE_EVENTS_VIEW_NAME, AE_BROWSER_VIEW_NAME, AE_RISK_ASSESSMENT_VIEW_NAME, CORRELATIONS_VIEW_NAME, DISTRIBUTIONS_VIEW_NAME, LABORATORY_VIEW_NAME, MEDICAL_HISTORY_VIEW_NAME, PATIENT_PROFILE_VIEW_NAME, QUESTIONNAIRES_VIEW_NAME, STUDY_CONFIGURATIN_VIEW_NAME, SUMMARY_VIEW_NAME, SURVIVAL_ANALYSIS_VIEW_NAME, TIMELINES_VIEW_NAME, TIME_PROFILE_VIEW_NAME, TREE_MAP_VIEW_NAME, VALIDATION_VIEW_NAME, VISITS_VIEW_NAME } from "./constants/view-names-constants";


export const TRT_ARM_FIELD = 'TREATMENT_ARM';
export const AE_TERM_FIELD = 'AE_TERM';
export const AE_START_DAY_FIELD = 'AE_START_DAY';
export const AE_END_DAY_FIELD = 'AE_END_DAY';
export const INV_DRUG_NAME_FIELD = 'INV_DRUG_NAME';
export const INV_DRUG_START_DAY_FIELD = 'INV_DRUG_START_DAY';
export const INV_DRUG_END_DAY_FIELD = 'INV_DRUG_END_DAY';
export const CON_MED_NAME_FIELD = 'CON_MED_NAME';
export const CON_MED_START_DAY_FIELD = 'CON_MED_START_DAY';
export const CON_MED_END_DAY_FIELD = 'CON_MED_END_DAY';
export const MH_TERM_FIELD = 'MH_TERM';

export const VIEWS_CONFIG = {
    [SUMMARY_VIEW_NAME]: {
        [TRT_ARM_FIELD]: ACT_TRT_ARM,
        [AE_START_DAY_FIELD]: AE_START_DATE
    },
    [TIMELINES_VIEW_NAME]: {
        [TRT_ARM_FIELD]: ACT_TRT_ARM,
        [AE_TERM_FIELD]: AE_TERM,
        [AE_START_DAY_FIELD]: AE_START_DAY,
        [AE_END_DAY_FIELD]: AE_END_DAY,
        [INV_DRUG_NAME_FIELD]: INV_DRUG_NAME,
        [INV_DRUG_START_DAY_FIELD]: INV_DRUG_START_DAY,
        [INV_DRUG_END_DAY_FIELD]: INV_DRUG_END_DAY,
        [CON_MED_NAME_FIELD]: CON_MED_TRT,
        [CON_MED_START_DAY_FIELD]: CON_MED_START_DAY,
        [CON_MED_END_DAY_FIELD]: CON_MED_END_DAY,

    },
    [LABORATORY_VIEW_NAME]: {
        [TRT_ARM_FIELD]: ACT_TRT_ARM
    },
    [PATIENT_PROFILE_VIEW_NAME]: {
        [AE_TERM_FIELD]: AE_TERM,
        [AE_START_DAY_FIELD]: AE_START_DAY,
        [AE_END_DAY_FIELD]: AE_END_DAY,
        [INV_DRUG_NAME_FIELD]: INV_DRUG_NAME,
        [INV_DRUG_START_DAY_FIELD]: INV_DRUG_START_DAY,
        [INV_DRUG_END_DAY_FIELD]: INV_DRUG_END_DAY,
        [CON_MED_NAME_FIELD]: CON_MED_TRT,
        [CON_MED_START_DAY_FIELD]: CON_MED_START_DAY,
        [CON_MED_END_DAY_FIELD]: CON_MED_END_DAY
    },
    [ADVERSE_EVENTS_VIEW_NAME]: {
        [TRT_ARM_FIELD]: ACT_TRT_ARM,
        [AE_TERM_FIELD]: AE_TERM,
        [AE_START_DAY_FIELD]: AE_START_DAY
    },
    [AE_RISK_ASSESSMENT_VIEW_NAME]: {
        [TRT_ARM_FIELD]: ACT_TRT_ARM,
        [AE_TERM_FIELD]: AE_TERM
    },
    [SURVIVAL_ANALYSIS_VIEW_NAME]: {
        [TRT_ARM_FIELD]: ACT_TRT_ARM,
        [AE_START_DAY_FIELD]: AE_START_DATE,
    },
    [DISTRIBUTIONS_VIEW_NAME]: {
        [TRT_ARM_FIELD]: ACT_TRT_ARM
    },
    [CORRELATIONS_VIEW_NAME]: {

    },
    [TIME_PROFILE_VIEW_NAME]: {
        [TRT_ARM_FIELD]: ACT_TRT_ARM
    },
    [TREE_MAP_VIEW_NAME]: {
        [TRT_ARM_FIELD]: ACT_TRT_ARM
    },
    [MEDICAL_HISTORY_VIEW_NAME]: {
        [MH_TERM_FIELD]: MH_TERM
    },
    [VISITS_VIEW_NAME]: {
        [TRT_ARM_FIELD]: ACT_TRT_ARM,
        [AE_TERM_FIELD]: AE_TERM,
        [AE_START_DAY_FIELD]: AE_START_DAY,
        [INV_DRUG_NAME_FIELD]: INV_DRUG_NAME,
        [CON_MED_NAME_FIELD]: CON_MED_TRT,
        [CON_MED_START_DAY_FIELD]: CON_MED_START_DAY
    },
    [STUDY_CONFIGURATIN_VIEW_NAME]: {

    },
    [VALIDATION_VIEW_NAME]: {

    },
    [AE_BROWSER_VIEW_NAME]: {
        [TRT_ARM_FIELD]: ACT_TRT_ARM,
        [AE_TERM_FIELD]: AE_TERM,
        [AE_START_DAY_FIELD]: AE_START_DAY,
        [AE_END_DAY_FIELD]: AE_END_DAY
    },
    [QUESTIONNAIRES_VIEW_NAME]: {
        [TRT_ARM_FIELD]: ACT_TRT_ARM
    }
}