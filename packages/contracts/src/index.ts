export type HealthStatus = 'ok';
export type ServiceName = 'backend';

export interface HealthResponse {
  status: HealthStatus;
  service: ServiceName;
  timestamp: string;
  uptimeSeconds: number;
}
