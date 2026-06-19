export interface Pipeline {
  platform: 'github-actions' | 'gitlab-ci' | 'jenkins' | 'circleci';
  name: string;
  file: string;
  triggers: string[];
  jobs: PipelineJob[];
}

export interface PipelineJob {
  name: string;
  steps: PipelineStep[];
  needs: string[];
  runsOn?: string;
}

export interface PipelineStep {
  name: string;
  action?: string;
  command?: string;
}
