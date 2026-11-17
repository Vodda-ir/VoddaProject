'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelEmpty,
  PanelPageHeader,
  PanelStatus,
} from '@/components/panel/PanelUI';
import { api, type OfficialService, type OfficialServiceCategory, type TeacherService } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { digitsOnly, formatFaNumber, toFaDigits } from '@/lib/persian';

export default function TeacherServicesPage() {
  const [services, setServices] = useState<TeacherService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<{ mode: 'add' } | { mode: 'edit'; service: TeacherService } | null>(null);
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.teacherServices(token);
      setServices(response.data.services || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'خدمات استاد دریافت نشدند.');
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function deactivate(service: TeacherService) {
    if (!token || busyId !== null || !service.active) return;
    if (!window.confirm(`خدمت «${service.title}» غیرفعال شود؟`)) return;
    setBusyId(service.id);
    setError('');
    try {
      await api.deactivateTeacherService(token, service.id);
      setServices((items) => items.map((item) => item.id === service.id ? { ...item, active: false } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'غیرفعال‌سازی خدمت انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(service: TeacherService) {
    if (!token || busyId !== null) return;
    if (!window.confirm(`خدمت «${service.title}» حذف شود؟`)) return;
    setBusyId(service.id);
    setError('');
    try {
      await api.deleteTeacherService(token, service.id);
      setServices((items) => items.filter((item) => item.id !== service.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'حذف خدمت انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  async function save(data: { official_service_id: number; duration: number; price: number }) {
    if (!token || !dialog) return;
    setError('');
    if (dialog.mode === 'add') await api.createTeacherService(token, data);
    else await api.updateTeacherService(token, dialog.service.id, data);
    setDialog(null);
    await load();
  }

  const activeCount = services.filter((service) => service.active).length;
  const pendingCount = services.length - activeCount;

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="کاتالوگ خدمات"
        title="خدمات من"
        description="خدمت‌های قابل رزرو، قیمت و مدت را مدیریت کنید. عنوان خدمت‌ها از میان خدمات رسمی وُدّا انتخاب می‌شود و بلافاصله قابل رزرو است."
        actions={<PanelButton tone="primary" icon="book" onClick={() => setDialog({ mode: 'add' })}>خدمت جدید</PanelButton>}
      />

      <div className="ops-metric-grid" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
        <article className="ops-metric-card">
          <span className="ops-metric-icon"><Icon name="checkCircle" size={20} /></span>
          <div><small>قابل رزرو</small><strong>{toFaDigits(activeCount)}</strong><span>خدمت تأییدشده و فعال</span></div>
        </article>
        <article className="ops-metric-card" data-tone="gold">
          <span className="ops-metric-icon"><Icon name="clock" size={20} /></span>
          <div><small>غیرفعال</small><strong>{toFaDigits(pendingCount)}</strong><span>خدمت‌های موقتاً غیرفعال‌شده</span></div>
        </article>
      </div>

      {error && <div className="ops-error" role="alert"><span>{error}</span><PanelButton onClick={() => void load()}>تلاش دوباره</PanelButton></div>}

      <section className="ops-data-surface">
        <div className="ops-data-head">
          <div>
            <strong>فهرست خدمات</strong>
            <span style={{ display: 'block', marginTop: 2 }}>{loading ? 'در حال دریافت…' : `${toFaDigits(services.length)} خدمت ثبت‌شده`}</span>
          </div>
          <PanelButton icon="refresh" onClick={() => void load()}>به‌روزرسانی</PanelButton>
        </div>

        {loading ? (
          <div style={{ padding: 42, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>در حال بارگذاری خدمات…</div>
        ) : services.length === 0 ? (
          <PanelEmpty
            icon="book"
            title="هنوز خدمتی تعریف نشده"
            description="از میان خدمات رسمی تأییدشدهٔ وُدّا یک خدمت انتخاب کنید و مدت و قیمت آن را تعیین کنید."
            action={<PanelButton tone="primary" onClick={() => setDialog({ mode: 'add' })}>ایجاد خدمت</PanelButton>}
          />
        ) : (
          services.map((service) => {
            const busy = busyId === service.id;
            return (
              <article className="ops-row" key={service.id} style={{ opacity: busy ? .55 : 1 }}>
                <span style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', flex: '0 0 44px', borderRadius: 13, color: 'var(--olive-700)', background: 'var(--olive-100)' }}>
                  <Icon name="book" size={20} />
                </span>
                <div className="ops-row-main">
                  <div className="ops-row-title">
                    <strong>{service.title}</strong>
                    <PanelStatus status={service.active ? 'active' : 'pending'}>{service.active ? 'فعال و قابل رزرو' : 'غیرفعال'}</PanelStatus>
                  </div>
                  <div className="ops-row-meta">
                    <span><Icon name="clock" size={13} />{toFaDigits(service.duration)} دقیقه</span>
                    <span>{formatFaNumber(service.price)} تومان</span>
                    <span>#{toFaDigits(service.id)}</span>
                  </div>
                </div>
                <div className="ops-row-actions">
                  <PanelButton icon="edit" disabled={busy} onClick={() => setDialog({ mode: 'edit', service })}>ویرایش</PanelButton>
                  {service.active && <PanelButton disabled={busy} onClick={() => void deactivate(service)}>غیرفعال‌کردن</PanelButton>}
                  <PanelButton tone="danger" icon="trash" disabled={busy} onClick={() => void remove(service)}>حذف</PanelButton>
                </div>
              </article>
            );
          })
        )}
      </section>

      {dialog && (
        <ServiceDialog
          service={dialog.mode === 'edit' ? dialog.service : undefined}
          onSave={save}
          onClose={() => setDialog(null)}
        />
      )}
    </main>
  );
}

function ServiceDialog({
  service,
  onSave,
  onClose,
}: {
  service?: TeacherService;
  onSave: (data: { official_service_id: number; duration: number; price: number }) => Promise<void>;
  onClose: () => void;
}) {
  const [catalog, setCatalog] = useState<OfficialServiceCategory[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [selected, setSelected] = useState<OfficialService | null>(
    service && service.official_service_id
      ? { id: service.official_service_id, category: '', title: service.title, description: '', icon: service.icon }
      : null,
  );
  const [query, setQuery] = useState('');
  const [duration, setDuration] = useState(String(service?.duration || 30));
  const [price, setPrice] = useState(String(service?.price || ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.officialServices()
      .then((res) => { if (alive) setCatalog(res.data.categories || []); })
      .catch(() => { if (alive) setError('دریافت فهرست خدمات رسمی ناموفق بود.'); })
      .finally(() => { if (alive) setCatalogLoading(false); });
    return () => { alive = false; };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredCatalog = normalizedQuery
    ? catalog
        .map((group) => ({
          category: group.category,
          services: group.services.filter(
            (entry) => entry.title.toLowerCase().includes(normalizedQuery) || entry.description.toLowerCase().includes(normalizedQuery),
          ),
        }))
        .filter((group) => group.services.length > 0)
    : catalog;

  async function submit() {
    if (!selected) return setError('یک خدمت رسمی از فهرست انتخاب کنید.');
    const parsedDuration = Number.parseInt(duration, 10);
    const parsedPrice = Number.parseInt(price, 10);
    if (!Number.isInteger(parsedDuration) || parsedDuration < 10 || parsedDuration > 240) return setError('مدت خدمت باید بین ۱۰ تا ۲۴۰ دقیقه باشد.');
    if (!Number.isInteger(parsedPrice) || parsedPrice <= 0) return setError('قیمت معتبر وارد کنید.');
    setSaving(true);
    setError('');
    try {
      await onSave({ official_service_id: selected.id, duration: parsedDuration, price: parsedPrice });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ذخیرهٔ خدمت انجام نشد.');
      setSaving(false);
    }
  }

  return (
    <div role="presentation" style={overlayStyle} onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="service-dialog-title" onClick={(event) => event.stopPropagation()} style={dialogStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: 12, color: 'var(--olive-700)', background: 'var(--olive-100)' }}><Icon name="book" size={19} /></span>
          <div>
            <h2 id="service-dialog-title" style={{ margin: 0, fontSize: 16 }}>{service ? 'ویرایش خدمت' : 'خدمت جدید'}</h2>
            <p style={{ margin: '2px 0 0', color: 'var(--ink-3)', fontSize: 10.5 }}>عنوان خدمت از میان خدمات رسمی تأییدشدهٔ وُدّا انتخاب می‌شود.</p>
          </div>
        </div>

        {selected ? (
          <div style={{ border: '1.5px solid var(--olive-200)', background: 'var(--olive-50, #f6f7f1)', borderRadius: 14, padding: 14, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ width: 38, height: 38, flex: '0 0 38px', display: 'grid', placeItems: 'center', borderRadius: 12, color: 'var(--olive-700)', background: 'var(--olive-100)' }}>
                <Icon name={(selected.icon as 'book') || 'book'} size={19} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: 13.5, color: 'var(--ink)' }}>{selected.title}</strong>
                {selected.description && <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.7 }}>{selected.description}</p>}
                {selected.category && <span style={{ display: 'inline-block', marginTop: 6, fontSize: 10, color: 'var(--olive-700)', background: 'var(--olive-100)', borderRadius: 999, padding: '3px 10px' }}>{selected.category}</span>}
              </div>
              <button type="button" onClick={() => setSelected(null)} style={{ border: 'none', background: 'transparent', color: 'var(--ink-3)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>تغییر</button>
            </div>
          </div>
        ) : catalogLoading ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>در حال دریافت خدمات رسمی…</div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <input className="input-base"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جستجو میان خدمات رسمی…"
              style={{ ...inputStyle, marginBottom: 8 }}
              aria-label="جستجوی خدمت رسمی"
            />
            <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--sand-200)', borderRadius: 14, padding: 10, display: 'grid', gap: 12 }} className="ops-scroll">
              {filteredCatalog.length === 0 && <p style={{ margin: 8, color: 'var(--ink-3)', fontSize: 12 }}>خدمتی با این عبارت یافت نشد.</p>}
              {filteredCatalog.map((group) => (
                <div key={group.category}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--olive-700)', marginBottom: 6 }}>{group.category}</div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {group.services.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => { setSelected(entry); setQuery(''); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, textAlign: 'right',
                          border: '1px solid var(--sand-200)', borderRadius: 12, background: '#fff',
                          padding: '9px 12px', cursor: 'pointer', fontFamily: 'inherit', width: '100%',
                        }}
                      >
                        <span style={{ width: 32, height: 32, flex: '0 0 32px', display: 'grid', placeItems: 'center', borderRadius: 10, color: 'var(--olive-700)', background: 'var(--olive-100)' }}>
                          <Icon name={(entry.icon as 'book') || 'book'} size={16} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ display: 'block', fontSize: 12.5, color: 'var(--ink)' }}>{entry.title}</strong>
                          <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.description}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 }}>
          <label style={labelStyle}>مدت (دقیقه)<input className="input-base" type="text" inputMode="numeric" value={toFaDigits(duration)} onChange={(event) => setDuration(digitsOnly(event.target.value))} style={inputStyle} /></label>
          <label style={labelStyle}>قیمت (تومان)<input className="input-base" type="text" inputMode="numeric" value={toFaDigits(price)} onChange={(event) => setPrice(digitsOnly(event.target.value))} style={inputStyle} /></label>
        </div>
        {error && <div role="alert" style={{ marginTop: 4, color: 'var(--rose)', background: 'var(--clay-bg)', padding: 10, borderRadius: 10, fontSize: 12 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <PanelButton disabled={saving} onClick={onClose}>انصراف</PanelButton>
          <PanelButton tone="primary" disabled={saving || catalogLoading} onClick={() => void submit()}>{saving ? 'در حال ذخیره…' : 'ذخیره'}</PanelButton>
        </div>
      </section>
    </div>
  );
}

const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(0,0,0,.42)' };
const dialogStyle: React.CSSProperties = { width: 500, maxWidth: '100%', background: '#fff', borderRadius: 20, padding: 22, boxShadow: 'var(--sh-lg)' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, fontSize: 11.5, fontWeight: 700, color: 'var(--ink-3)' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 11, border: '1px solid var(--sand-200)', color: 'var(--ink)', background: '#fff', fontFamily: 'inherit' };
