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
import { formatFaNumber } from '@/lib/persian';

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
          <div className="vodda-teacher-grid" style={{ padding: 16 }} aria-busy="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="adm-skeleton" style={{ minHeight: 200, borderRadius: 12 }} />
            ))}
          </div>
        ) : filteredTeachers.length === 0 ? (
          <PanelEmpty
            icon="users"
            title={query ? 'استادی با این مشخصات پیدا نشد' : 'هنوز استادی تأیید نشده است'}
            description={query ? 'عبارت دیگری را جستجو کنید یا فیلتر را بردارید.' : 'به‌زودی اساتید تأییدشده در این فهرست قرار می‌گیرند.'}
          />
        ) : (
          <div className="vodda-teacher-grid" style={{ padding: 16 }}>
            {filteredTeachers.map((teacher) => {
              /* ۰.۷.۴ — کارت اسنپ‌داکتری واحد (هم‌پاری با صفحهٔ نخست/جستجو/اپ):
                 آواتار ۶۴px + ستون بج‌ها، نام یک‌خط، تخصص دوخط، دو دکمهٔ عملیاتی پایین */
              const name = teacher.user?.name || 'استاد وُدّا';
              const tier1 = teacher.is_tier1 === true;
              const rating = Number(teacher.rating) > 0 ? faDigits(Number(teacher.rating).toFixed(1)) : '';
              const price = Math.max(0, Number(teacher.price30) || 0);
              const sessions = Math.max(0, Number(teacher.sessions) || 0);
              return (
                <article
                  key={teacher.id}
                  className={`vodda-teacher-card${tier1 ? ' vodda-card-tier1' : ''}`}
                >
                  <span className="vtc-top">
                    <span className="vtc-head">
                      <span className="vtc-avatar">
                        <Avatar
                          size={64}
                          ring
                          tier={teacher.tier}
                          imageUrl={avatarUrl(teacher.user?.avatar_url, teacher.user?.updated_at)}
                          name={name}
                          online={teacher.available !== false}
                          lastSeen={teacher.last_seen ?? null}
                        />
                      </span>
                      <span className="vtc-pills">
                        {rating ? (
                          <span className="vtc-pill vtc-pill-rating">
                            <Icon name="star" size={12} fill style={{ color: 'var(--gold)' }} />
                            {rating}
                          </span>
                        ) : tier1 ? (
                          <span className="vtc-pill vtc-pill-gold">🏆 استاد درجه ۱</span>
                        ) : (
                          <TierChip tier={teacher.tier} size={10.5} />
                        )}
                        {price > 0 ? (
                          <span className="vtc-pill vtc-pill-info">{formatFaNumber(price)} تومان</span>
                        ) : sessions > 0 ? (
                          <span className="vtc-pill vtc-pill-info">
                            <Icon name="clock" size={11} />
                            {formatFaNumber(sessions)} جلسه
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <strong className="vtc-name">
                      {tier1 ? (
                        <span className="vtc-trophy" title="استاد درجه ۱" aria-label="استاد درجه ۱">🏆</span>
                      ) : null}
                      <span className="vtc-name-text">{name}</span>
                    </strong>
                    <span className="vtc-tag">{teacher.tag || teacher.field || 'آموزش قرآن'}</span>
                  </span>
                  <span className="vtc-actions">
                    <Link href={`/teachers/${teacher.id}`} className="vtc-cta vtc-cta--ghost">پروفایل</Link>
                    <Link href={`/panel/user/book?teacher=${teacher.id}`} className="vtc-cta">
                      <Icon name="plus" size={13} /> رزرو
                    </Link>
                  </span>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
