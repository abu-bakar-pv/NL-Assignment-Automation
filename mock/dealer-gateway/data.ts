// Synthetic fixtures. VINs are generated, customer references are opaque IDs:
// nothing here maps to a real person (see docs/integration-test-strategy.md, GDPR).

export interface Lead {
  leadId: string;
  dealerId: string;
  vehicle: { vin: string; model: string };
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'LOST' | 'WON';
  customerRef: string | null;
  createdAt: string;
}

export interface ApiClientRegistration {
  id: string;
  secret: string;
  tenant: string;
  scopes: string[];
}

export const clients: ApiClientRegistration[] = [
  { id: 'dealer-north-crm', secret: 'north-test-secret', tenant: 'DLR-NORTH', scopes: ['leads:read', 'leads:write'] },
  { id: 'dealer-south-dms', secret: 'south-test-secret', tenant: 'DLR-SOUTH', scopes: ['leads:read'] },
  { id: 'oem-analytics', secret: 'oem-test-secret', tenant: 'OEM', scopes: ['leads:read:aggregate'] },
];

export const leads: Lead[] = [
  {
    leadId: 'LD-1001',
    dealerId: 'DLR-NORTH',
    vehicle: { vin: 'WVWZZZ1KZAW000001', model: 'Hatchback 1.5' },
    status: 'NEW',
    customerRef: 'CUST-7f3a',
    createdAt: '2026-10-01T09:15:00.000Z',
  },
  {
    leadId: 'LD-1002',
    dealerId: 'DLR-NORTH',
    vehicle: { vin: 'WVWZZZ1KZAW000002', model: 'SUV 2.0 Hybrid' },
    status: 'QUALIFIED',
    customerRef: null,
    createdAt: '2026-10-03T14:02:00.000Z',
  },
  {
    leadId: 'LD-1003',
    dealerId: 'DLR-SOUTH',
    vehicle: { vin: 'VF1RFB00X00000003', model: 'Estate EV' },
    status: 'CONTACTED',
    customerRef: 'CUST-91bc',
    createdAt: '2026-10-05T11:40:00.000Z',
  },
];

export const serviceHistory: Record<string, Array<{ date: string; mileageKm: number; work: string }>> = {
  WVWZZZ1KZAW000001: [
    { date: '2025-04-11', mileageKm: 15200, work: 'Annual inspection' },
    { date: '2026-04-09', mileageKm: 29850, work: 'Brake pads, front' },
  ],
};
