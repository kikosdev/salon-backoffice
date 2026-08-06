import { useMemo, useState } from 'react';
import { OPERATOR_ROLE_META } from '@/lib/mockData';
import type { Operator, OperatorRole } from '@/lib/types';
import { badge, btnDanger, btnGhost, btnPrimary, chip, initials } from '@/lib/style';
import { Card, EmptyState, Field, inputStyle, selectStyle } from '@/components/common';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/Modal';
import { useDataStore } from '@/store/useDataStore';
import { useUiStore } from '@/store/useUiStore';

type OpFormState = { mode: 'add' | 'edit'; id: string | null; name: string; email: string; role: OperatorRole; status: Operator['status'] };

const ROLE_KEYS = Object.keys(OPERATOR_ROLE_META) as OperatorRole[];

function statusBadgeKey(status: Operator['status']) {
  return status === 'active' ? 'active' : status === 'invited' ? 'trial' : 'churned';
}

export function OperatorsPage() {
  const role = useUiStore((s) => s.role);
  const flash = useUiStore((s) => s.flash);
  const operators = useDataStore((s) => s.operators);
  const writeOperators = useDataStore((s) => s.writeOperators);
  const canTeam = role === 'superadmin';

  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [form, setForm] = useState<OpFormState | null>(null);
  const [del, setDel] = useState<Operator | null>(null);

  const sq = q.trim().toLowerCase();
  const shown = useMemo(
    () => operators.filter((o) => (roleFilter === 'all' || o.role === roleFilter) && (!sq || (o.name + o.email + o.role).toLowerCase().includes(sq))),
    [operators, roleFilter, sq]
  );

  function persist(next: Operator[], msg: string) {
    writeOperators(next);
    flash(msg);
    setForm(null);
    setDel(null);
  }

  function openAdd() {
    setForm({ mode: 'add', id: null, name: '', email: '', role: 'support', status: 'invited' });
  }
  function openEdit(o: Operator) {
    setForm({ mode: 'edit', id: o.id, name: o.name, email: o.email, role: o.role, status: o.status });
  }
  function toggleDisabled(o: Operator) {
    persist(operators.map((x) => (x.id === o.id ? { ...x, status: (x.status === 'disabled' ? 'active' : 'disabled') as Operator['status'] } : x)), o.name + (o.status === 'disabled' ? ' re-enabled' : ' access revoked'));
  }
  function resetMfa(o: Operator) {
    persist(operators.map((x) => (x.id === o.id ? { ...x, mfa: false } : x)), 'MFA reset for ' + o.name + ' · re-enrolment required');
  }

  const ofValid = !!form && form.name.trim().length > 2 && /@salonos\.tn$/.test(form.email.trim()) && !operators.some((x) => x.email === form.email.trim() && x.id !== form.id);

  function submitForm() {
    if (!form || !ofValid) return;
    if (form.mode === 'add') {
      const rec: Operator = { id: 'op_' + Math.random().toString(36).slice(2, 6), name: form.name.trim(), email: form.email.trim(), role: form.role, status: form.status, added: '2026-07-27', lastSeen: 'never', actions: 0, mfa: false };
      persist(operators.concat([rec]), 'Invite sent to ' + rec.email + ' · ' + rec.role);
    } else {
      persist(operators.map((x) => (x.id === form.id ? { ...x, name: form.name.trim(), email: form.email.trim(), role: form.role, status: form.status } : x)), form.name.trim() + ' updated · ' + form.role);
    }
  }
  function confirmDelete() {
    if (!del) return;
    persist(operators.filter((x) => x.id !== del.id), del.name + ' removed from the operator team');
  }

  const teamStats = [
    { k: 'Operators', v: String(operators.filter((o) => o.status === 'active').length) },
    { k: 'Pending invites', v: String(operators.filter((o) => o.status === 'invited').length) },
    { k: 'Without MFA', v: String(operators.filter((o) => !o.mfa && o.status !== 'disabled').length) },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 1400 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {teamStats.map((s) => (
          <div key={s.k} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--tx3)' }}>{s.k}</span>
            <code style={{ fontSize: 18, fontWeight: 600 }}>{s.v}</code>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {ROLE_KEYS.map((r) => (
          <div key={r} style={{ flex: 1, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 6, padding: '9px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ ...badge(OPERATOR_ROLE_META[r].color), fontWeight: 600, alignSelf: 'flex-start' }}>{r}</span>
            <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{OPERATOR_ROLE_META[r].desc}</span>
            <code style={{ fontSize: 10.5, color: 'var(--tx3)' }}>{operators.filter((o) => o.role === r && o.status !== 'disabled').length} active</code>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter operators by name, email or role…" style={{ ...inputStyle, height: 28, maxWidth: 300 }} />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={selectStyle}>
          <option value="all">All roles</option>
          {ROLE_KEYS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        <code style={{ fontSize: 11, color: 'var(--tx3)' }}>{shown.length} of {operators.length} operators</code>
        {canTeam && <button onClick={openAdd} style={btnPrimary(true)}>Invite operator</button>}
      </div>

      <Card>
        {shown.length === 0 ? (
          <EmptyState title="No operators match these filters" body="Try clearing the role filter or search term." actions={<button onClick={() => { setQ(''); setRoleFilter('all'); }} style={btnGhost()}>Clear filters</button>} />
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>MFA</th><th>Added</th><th>Last seen</th><th style={{ textAlign: 'right' }}>Actions</th><th style={{ width: '1%' }}></th></tr></thead>
            <tbody>
              {shown.map((o) => (
                <tr key={o.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 600, color: o.status === 'disabled' ? 'var(--tx3)' : 'var(--tx2)', background: 'var(--panel2)', border: '1px solid var(--line)' }}>{initials(o.name)}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                        <span style={{ fontSize: 12, color: 'var(--tx)' }}>{o.name}</span>
                        <span style={{ fontSize: 10.5, color: 'var(--tx3)' }}>{o.email}</span>
                      </div>
                    </div>
                  </td>
                  <td><span style={{ ...badge(OPERATOR_ROLE_META[o.role].color), fontWeight: 600 }}>{o.role}</span></td>
                  <td><span style={badge(statusBadgeKey(o.status))}>{o.status}</span></td>
                  <td><code style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: o.mfa ? 'var(--s-active-fg)' : 'var(--s-past_due-fg)' }}>{o.mfa ? 'enrolled' : 'not enrolled'}</code></td>
                  <td><code style={{ color: 'var(--tx3)' }}>{o.added}</code></td>
                  <td style={{ color: 'var(--tx2)' }}>{o.lastSeen}</td>
                  <td style={{ textAlign: 'right' }}><code>{o.actions.toLocaleString('en-US')}</code></td>
                  <td>
                    {canTeam && o.id !== 'op_01' && (
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                        <button onClick={() => openEdit(o)} style={{ height: 22, padding: '0 8px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)', fontSize: 11 }}>Edit</button>
                        {o.mfa && <button onClick={() => resetMfa(o)} style={{ height: 22, padding: '0 8px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)', fontSize: 11 }}>Reset MFA</button>}
                        <button onClick={() => toggleDisabled(o)} style={{ height: 22, padding: '0 8px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--tx2)', fontSize: 11 }}>{o.status === 'disabled' ? 'Enable' : 'Disable'}</button>
                        <button onClick={() => setDel(o)} style={{ height: 22, padding: '0 8px', borderRadius: 4, border: '1px solid var(--danger-bd)', background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: 11 }}>Remove</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {form && (
        <Modal onClose={() => setForm(null)}>
          <ModalHeader
            title={form.mode === 'add' ? 'Invite an operator' : 'Edit ' + form.name}
            subtitle={form.mode === 'add' ? 'They receive an invite to salonos.tn, must enrol MFA on first sign-in, and appear in the audit log from then on.' : 'Role changes take effect on their next request. Written to the audit log.'}
          />
          <ModalBody>
            <Field label="Full name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} /></Field>
            <Field label="Email (@salonos.tn)"><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ ...inputStyle, fontFamily: 'var(--mono)', fontSize: 12 }} /></Field>
            <Field label="Role">
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {ROLE_KEYS.filter((r) => r !== 'superadmin' || role === 'superadmin').map((r) => (
                  <button key={r} onClick={() => setForm({ ...form, role: r })} style={{ ...chip(form.role === r), height: 22, fontSize: 11 }}>{r}</button>
                ))}
              </div>
              <span style={{ fontSize: 10.5, color: 'var(--tx3)' }}>{OPERATOR_ROLE_META[form.role].desc}</span>
            </Field>
            <Field label="Status">
              <div style={{ display: 'flex', gap: 4 }}>
                {(['active', 'invited', 'disabled'] as Operator['status'][]).map((s) => (
                  <button key={s} onClick={() => setForm({ ...form, status: s })} style={{ ...chip(form.status === s), height: 22, fontSize: 11, flex: 1 }}>{s}</button>
                ))}
              </div>
            </Field>
            <span style={{ fontSize: 10.5, color: ofValid ? 'var(--tx3)' : 'var(--s-past_due-fg)' }}>
              {form.name.trim().length < 3 ? 'a full name is required' : !/@salonos\.tn$/.test(form.email.trim()) ? 'operator emails must be on @salonos.tn' : !ofValid ? 'that email already has an operator account' : 'MFA enrolment is enforced on first sign-in'}
            </span>
          </ModalBody>
          <ModalFooter>
            <button onClick={() => setForm(null)} style={btnGhost()}>Cancel</button>
            <span style={{ flex: 1 }} />
            <button onClick={submitForm} style={btnPrimary(ofValid)}>{form.mode === 'add' ? 'Send invite' : 'Save changes'}</button>
          </ModalFooter>
        </Modal>
      )}

      {del && (
        <Modal onClose={() => setDel(null)}>
          <ModalHeader title={'Remove ' + del.name + '?'} subtitle={'Deleting ' + del.name + ' revokes their console access and API tokens immediately.'} />
          <ModalBody>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <li style={{ fontSize: 12, color: 'var(--tx2)' }}>Their {del.actions.toLocaleString('en-US')} audit entries are retained — audit history is never deleted.</li>
              <li style={{ fontSize: 12, color: 'var(--tx2)' }}>Any impersonation session they hold is terminated at once.</li>
              <li style={{ fontSize: 12, color: 'var(--tx2)' }}>If they only need a pause, disable the account instead of deleting it.</li>
            </ul>
          </ModalBody>
          <ModalFooter>
            <button onClick={() => setDel(null)} style={btnGhost()}>Cancel</button>
            <span style={{ flex: 1 }} />
            <button onClick={confirmDelete} style={btnDanger(true)}>Remove</button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
