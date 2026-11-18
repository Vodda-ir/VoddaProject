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
import { TIER1_BADGE_ITEMS } from '@/components/web/sections';

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
              <div key={index} className="adm-skeleton" style={{ aspectRatio: '5 / 6', borderRadius: 16 }} />
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
              /* ۰.۷.۱ — کارت مربعی استاندارد واحد (هم‌پاری با صفحهٔ نخست/جستجو/اپ) */
              const name = teacher.user?.name || 'استاد وُدّا';
              const tier1 = teacher.is_tier1 === true;
              const tier1Badges = (teacher.tier1_badges ?? [])
                .map((key) => TIER1_BADGE_ITEMS[key])
                .filter((item): item is { emoji: string; label: string } => Boolean(item));
              return (
                <article
                  key={teacher.id}
                  className={`vodda-teacher-card vodda-card-neon${tier1 ? ' vodda-card-tier1' : ''}`}
                >
                  <span className="vtc-avatar">
                    <Avatar
                      size={58}
                      ring
                      tier={teacher.tier}
                      imageUrl={avatarUrl(teacher.user?.avatar_url, teacher.user?.updated_at)}
                      name={name}
                      online={teacher.available !== false}
                      lastSeen={teacher.last_seen ?? null}
                    />
                  </span>
                  <strong className="vtc-name">{name}</strong>
                  <span className="vtc-tag">{teacher.tag || teacher.field || 'آموزش قرآن'}</span>
                  <span className="vtc-badges">
                    {tier1 ? (
                      <>
                        <span className="vtc-t1">🏆 استاد درجه ۱</span>
                        {tier1Badges.slice(0, 2).map((badge) => (
                          <span key={badge.label} className="vtc-mini" title={badge.label}>
                            <span aria-hidden="true">{badge.emoji}</span>{badge.label}
                          </span>
                        ))}
                      </>
                    ) : (
                      <TierChip tier={teacher.tier} size={10} />
                    )}
                  </span>
                  <span className="vtc-meta">
                    {Number(teacher.rating) > 0 && <Icon name="star" size={11} fill style={{ color: 'var(--gold)' }} />}
                    {[Number(teacher.rating) > 0 ? faDigits(Number(teacher.rating).toFixed(1)) : '', teacher.city || '']
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  <span className="vtc-foot">
                    <span className="vtc-price">
                      <small>از</small>
                      <strong>{formatFaNumber(teacher.price30)} تومان</strong>
                    </span>
                    <span className="vtc-actions">
                      <Link href={`/teachers/${teacher.id}`} className="vtc-cta vtc-cta--ghost">پروفایل</Link>
                      <Link href={`/panel/user/book?teacher=${teacher.id}`} className="vtc-cta">
                        <Icon name="plus" size={13} /> رزرو
                      </Link>
                    </span>
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
