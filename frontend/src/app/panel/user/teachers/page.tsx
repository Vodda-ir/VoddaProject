'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { TierChip } from '@/components/web/tier';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelEmpty,
  PanelPageHeader,
} from '@/components/panel/PanelUI';
import { SearchInput } from '@/components/admin/AdminUI';
import { api, type Teacher } from '@/lib/api';
import { avatarUrl } from '@/lib/auth';
import { categoryOf, groupCatalog, teachersForTopics, type CatalogCategory } from '@/lib/category';
import { formatFaNumber, toFaDigits } from '@/lib/persian';

export default function UserTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [query, setQuery] = useState('');
  const [femaleOnly, setFemaleOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // باگ category-routing — مرور بر پایهٔ دستهٔ کاتالوگ (هم‌پاری با اپ و جستجوی عمومی)
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [activeTopicId, setActiveTopicId] = useState(0);

  const load = useCallback(async (search: string, female: boolean) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.teachers(search, { limit: '100', ...(female ? { female: 'true' } : {}) });
      setTeachers(response.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'فهرست اساتید دریافت نشد.');
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load('', femaleOnly); }, [load, femaleOnly]);

  useEffect(() => {
    let active = true;
    fetch('/api/backend/catalog/services', { cache: 'no-store' })
      .then((response) => response.json())
      .then((body) => {
        if (!active) return;
        const groups: Array<{ category?: string; services?: Array<{ id: number; title: string }> }> = body?.data?.categories ?? [];
        setCategories(groupCatalog(groups.flatMap((group) => (group.services ?? []).map((service) => ({ ...service, category: group.category ?? '' })))));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const activeCategory = categoryName ? categoryOf(categories, categoryName) : null;
  const filteredTeachers = activeCategory
    ? teachersForTopics(
        teachers,
        activeTopicId > 0 ? activeCategory.topics.filter((topic) => topic.id === activeTopicId) : activeCategory.topics,
      )
    : teachers;

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="پیدا کردن همراه"
        title="اساتید وُدّا"
        description="اساتید تأییدشده سامانه را ببینید، پروفایل‌شان را بررسی کنید و مستقیم رزرو کنید."
      />

      {error && (
        <div className="ops-error" role="alert">
          <span>{error}</span>
          <PanelButton onClick={() => void load(query, femaleOnly)}>تلاش دوباره</PanelButton>
        </div>
      )}

      <section className="ops-section-card">
        <div className="adm-toolbar">
          <SearchInput value={query} onChange={(value) => void load(value, femaleOnly)} placeholder="جستجوی نام، حوزه یا شهر…" />
          <button
            type="button"
            className="adm-tab"
            data-active={femaleOnly ? 'true' : undefined}
            aria-pressed={femaleOnly}
            onClick={() => setFemaleOnly((value) => !value)}
          >
            <Icon name="user" size={13} /> مربی زن
          </button>
        </div>

        {categories.length > 0 && (
          <div role="group" aria-label="مرور بر پایهٔ دسته" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            <button
              type="button"
              className="web-topic-chip"
              data-active={!categoryName ? 'true' : undefined}
              onClick={() => { setCategoryName(''); setActiveTopicId(0); }}
            >
              همهٔ دسته‌ها
            </button>
            {categories.map((group) => (
              <button
                key={group.category}
                type="button"
                className="web-topic-chip"
                data-active={categoryName === group.category ? 'true' : undefined}
                onClick={() => { setCategoryName(group.category); setActiveTopicId(0); }}
              >
                {group.category}
              </button>
            ))}
          </div>
        )}
        {activeCategory && (
          <div role="group" aria-label="زیردسته‌های این دسته" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            <button
              type="button"
              className="web-topic-chip"
              data-active={activeTopicId === 0 ? 'true' : undefined}
              onClick={() => setActiveTopicId(0)}
            >
              همهٔ زیردسته‌ها ({activeCategory.topics.length})
            </button>
            {activeCategory.topics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                className="web-topic-chip"
                data-active={topic.id === activeTopicId ? 'true' : undefined}
                onClick={() => setActiveTopicId(topic.id === activeTopicId ? 0 : topic.id)}
              >
                {topic.title}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="usr-teacher-grid" style={{ padding: 16 }} aria-busy="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="adm-skeleton" style={{ height: 170, borderRadius: 18 }} />
            ))}
          </div>
        ) : filteredTeachers.length === 0 ? (
          <PanelEmpty
            icon="users"
            title={query ? 'استادی با این مشخصات پیدا نشد' : 'هنوز استادی تأیید نشده است'}
            description={query ? 'عبارت دیگری را جستجو کنید یا فیلتر را بردارید.' : 'به‌زودی اساتید تأییدشده در این فهرست قرار می‌گیرند.'}
          />
        ) : (
          <div className="usr-teacher-grid" style={{ padding: 16 }}>
            {filteredTeachers.map((teacher) => (
              <article className="usr-teacher-card" key={teacher.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <Avatar
                    size={48}
                    ring
                    tier={teacher.tier}
                    imageUrl={avatarUrl(teacher.user?.avatar_url, teacher.user?.updated_at)}
                    name={teacher.user?.name || 'استاد وُدّا'}
                    online={teacher.available !== false}
                    lastSeen={teacher.last_seen ?? null}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <strong style={{ fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {teacher.user?.name || 'استاد وُدّا'}
                      </strong>
                      <TierChip tier={teacher.tier} size={10} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--olive-700)', fontWeight: 600, marginTop: 2 }}>
                      {teacher.tag || teacher.field || 'آموزش قرآن'}
                    </div>
                    {teacher.city && (
                      <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 2 }}>
                        <Icon name="pin" size={11} /> {teacher.city}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 14, fontSize: 11.5, color: 'var(--ink-2s)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="star" size={13} fill style={{ color: 'var(--gold)' }} />
                    {Number(teacher.rating) > 0 ? faDigits(Number(teacher.rating).toFixed(1)) : '—'}
                    <em style={{ fontStyle: 'normal', color: 'var(--ink-4)' }}>({toFaDigits(teacher.reviews)})</em>
                  </span>
                  <span>{toFaDigits(teacher.sessions)} جلسه موفق</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 9, borderTop: '1px solid var(--sand-100)', paddingTop: 11, marginTop: 'auto' }}>
                  <div>
                    <div style={{ fontSize: 9.5, color: 'var(--ink-4)' }}>شروع قیمت از</div>
                    <strong style={{ fontSize: 14, color: 'var(--olive-700)' }}>{formatFaNumber(teacher.price30)} <small style={{ fontWeight: 500 }}>تومان</small></strong>
                  </div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <Link href={`/teachers/${teacher.id}`} className="ops-button">پروفایل</Link>
                    <Link href={`/panel/user/book?teacher=${teacher.id}`} className="ops-button" data-tone="primary">
                      <Icon name="plus" size={14} /> رزرو
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
