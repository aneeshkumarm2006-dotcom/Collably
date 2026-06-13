/**
 * Barrel for the 7-step campaign create/edit flow (PRD §7.4). The screen imports
 * the steps + shared form state/helpers from here.
 */
export { Step1, type CampaignStepProps } from './Step1';
export { Step2, type Step2Props } from './Step2';
export { Step3 } from './Step3';
export { Step4 } from './Step4';
export { Step5 } from './Step5';
export { Step6 } from './Step6';
export { Step7, type Step7Props } from './Step7';
export {
  emptyCampaignForm,
  fromCampaign,
  validateStep,
  toCampaignPayload,
  CAMPAIGN_STEP_TITLES,
  CAMPAIGN_STEP_COUNT,
  type CampaignFormState,
  type CampaignFormPatch,
} from './formState';
export { Field, TextField, TextArea, NumberStepper, SwitchRow } from './fields';
export { CampaignFormScreen, type CampaignFormScreenProps } from './CampaignFormScreen';
