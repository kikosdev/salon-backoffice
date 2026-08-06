import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import type { AuditLogEntry, Paginated } from '@/lib/api-types';
import { Card, EmptyState, TableSkeleton } from '@/components/common';
import type { TenantTabProps } from './index';

export function AuditTab({ tenant }: TenantTabProps) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [rows, setRows] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    apiGet<Paginated<AuditLogEntry>>(`/audit?tenantId=${encodeURIComponent(tenant.tenantId)}&limit=20`)
      .then((res) => {
        if (!cancelled) {
          setRows(res.items);
          setState('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [tenant.tenantId]);

  return (
    <Card title="Recent actions on this tenant">
      {state === 'loading' && <TableSkeleton rows={4} />}
      {state === 'error' && <div style={{ padding: '20px 12px', fontSize: 12, color: 'var(--tx3)' }}>Could not load audit entries.</div>}
      {state === 'ready' && rows.length === 0 && (
        <EmptyState
          title="No tenant-scoped audit entries"
          body="Audit entries aren't tagged with a tenant id yet in this version — check the full Audit log for admin activity that isn't attributed to a specific tenant."
        />
      )}
      {state === 'ready' && rows.length > 0 && (
        <table>
          <thead><tr><th>Timestamp</th><th>Admin</th><th>Action</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a._id}>
                <td><code style={{ color: 'var(--tx3)' }}>{new Date(a.at).toLocaleString()}</code></td>
                <td style={{ color: 'var(--tx2)' }}>{a.adminEmail}</td>
                <td>{a.action.replace(/_/g, ' ').toLowerCase()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
