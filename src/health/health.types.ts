export type HealthDependencyStatus = 'up' | 'down';

export interface HealthData {
  database: HealthDependencyStatus;
  redis: HealthDependencyStatus;
}

export interface HealthResponse {
  status: 'success' | 'error';
  data: HealthData;
}
